# StudyFlow AI — Architecture & Technical Specifications

## 1. System Overview

**StudyFlow AI** is a production-ready, client-first academic scheduling application tailored for university students. It combines Google Gemini 3.8 Flash (`gemini-3.8-flash`) with automatic secondary failover to Gemini 3.6 Flash (`gemini-3.6-flash`) and a deterministic constraint-satisfaction fallback engine to generate balanced, deadline-aware daily and weekly study roadmaps.

```
+-------------------------------------------------------------------------------+
|                               Browser (Client)                                |
|                                                                               |
|  +-------------------+  +-------------------+  +---------------------------+  |
|  | Dashboard View    |  | Subjects View     |  | AI Planner View           |  |
|  | - Quick stats     |  | - CRUD operations |  | - Daily hours bandwidth   |  |
|  | - Today's tasks   |  | - Topic chunking  |  | - 7 / 14 day horizon      |  |
|  | - Exam deadlines  |  | - Urgency badges  |  | - Session duration tuning |  |
|  +-------------------+  +-------------------+  +---------------------------+  |
|  +-------------------+  +-------------------+  +---------------------------+  |
|  | Schedule View     |  | Progress View     |  | Settings & Backups        |  |
|  | - Daily / Weekly  |  | - Logged hours    |  | - Dark / Light / Contrast |  |
|  | - Task completion |  | - Completion %    |  | - JSON export / import   |  |
|  | - .ics export     |  | - Subject stats   |  | - API Health diagnostics  |  |
|  +-------------------+  +-------------------+  +---------------------------+  |
|                                     |                                         |
|                          StudyContext (React State)                           |
|                                     |                                         |
|                 +-------------------+-------------------+                     |
|                 |                                       |                     |
|                 v                                       v                     |
|       LocalStorage (v1 schema)              Deterministic Fallback            |
|       - Versioned migration pipeline        Planner (Local Engine)            |
|       - Corrupt JSON recovery               - Urgency x Difficulty heuristic  |
+---------------------------------------------------------|---------------------+
                                                          | (HTTP POST)
                                                          v
+-------------------------------------------------------------------------------+
|                            Next.js 14 App Router                              |
|                                                                               |
|  POST /api/generate-plan                               GET /api/health        |
|  +----------------------------------------------+      +-------------------+  |
|  | 1. IP Rate Limiter (15 req/min window)       |      | System status     |  |
|  | 2. Payload size limiter (Max 100 KB)         |      | AI provider info  |  |
|  | 3. Zod Schema Validation                     |      | Node environment  |  |
|  | 4. Server Secret (GEMINI_API_KEY)            |      +-------------------+  |
|  | 5. Primary AI: gemini-3.8-flash              |                             |
|  |    + Failover AI: gemini-3.6-flash           |                             |
|  |    + In-Memory Circuit Breaker               |                             |
|  | 6. Native Gemini JSON Schema (LOW Thinking)  |                             |
|  | 7. Zod Runtime Response Validation           |                             |
|  | 8. Business Constraint Verification          |                             |
|  |    (Valid IDs, Date Windows, Capacity)       |                             |
|  +----------------------------------------------+                             |
|                         |                                                     |
|                         v                                                     |
|       Google Gemini API (3.8 Flash / 3.6 Flash)                               |
+-------------------------------------------------------------------------------+
```

---

## 2. Core Architecture Layers

### 2.1 Presentation Layer (React 18 & Next.js App Router)
- **Modular Component Hierarchy**: Structured under `src/components/` into `common`, `layout`, `dashboard`, `subjects`, `planner`, `schedule`, `progress`, and `settings`.
- **Accessibility Integration**: Built with WCAG 2.1 AA standards. Semantic headings (`h1` - `h4`), keyboard navigable focus rings, `aria-modal` dialogs, `aria-live="polite"` asynchronous announcements, and dedicated skip links.
- **Theme Support**: High-contrast light and dark palettes configured via Tailwind CSS with system preference synchronization.

### 2.2 State Management & Persistence Layer
- **StudyContext**: Centralized React Context providing atomic operations:
  - Subject CRUD operations with immediate color assignment.
  - Active study plan tracking and history archival.
  - Granular task completion toggling with progress recomputation.
  - Dynamic user preferences.
- **Storage Adapter (`src/lib/storage.ts`)**:
  - Versioned schema (`version: 1`).
  - Migration pipeline preventing data loss upon schema updates.
  - Safe error recovery: unparseable or corrupted JSON safely defaults without crashing the application.
  - Portable export/import via structured JSON backups.

### 2.3 AI Pipeline & Structured Output Validation
1. **Client Request**: `PlanGenerationRequest` containing subjects, topic durations, difficulty levels, target deadlines, available study hours, and planning horizon (7 or 14 days).
2. **Server Route (`POST /api/generate-plan`)**:
   - Enforces IP sliding-window rate limiting.
   - Enforces 100KB payload size boundaries.
   - Validates input payload with `PlanGenerationRequestSchema`.
   - Accesses `GEMINI_API_KEY` strictly in Node.js server runtime (never exposed to client bundles).
3. **Google Gemini LLM Prompt & Schema Execution**:
   - System prompt instructs Gemini as an academic scheduling assistant.
   - Gemini `responseSchema` enforces strict JSON structured responses.
4. **Validation and Sanitation Pipeline**:
   - Step 1: JSON syntax verification.
   - Step 2: Zod runtime schema validation (`StudyPlanSchema`).
   - Step 3: Domain business constraints check (`validatePlanBusinessConstraints`):
     - Every task references an authentic subject ID.
     - Task dates strictly fall inside the planning window.
     - Study sessions for a subject are scheduled on or before its examination deadline.
     - Daily allocated study minutes do not exceed the student's daily hour constraint.
     - Feasibility warnings are produced if material exceeds available capacity.

### 2.4 Resilience, Circuit Breaker & Failover Engine
- **Bounded Interactive Retry Budget**: Limits generation to 1 initial attempt and at most 1 retry (`maxRetries: 1`, total 2 attempts) strictly for transient 503/504 errors. Authentication (401), invalid request (400), quota exhaustion (429), and business validation failures are non-retryable and fail immediately.
- **Coordinated Request Deadline (28s Route Budget)**:
  - Total route deadline: 28,000ms.
  - Attempt 1 budget (with failover active): Capped at `min(12000, perAttemptTimeoutMs)`.
  - Minimum remaining budget for Attempt 2: $\ge 15,000\text{ms}$. If less than 10,000ms remain, Attempt 2 is bypassed to avoid client HTTP timeouts.
- **In-Memory Circuit Breaker (`ModelCircuitBreaker`)**:
  - States: `CLOSED` (normal operation), `OPEN` (shedding load, rejecting calls), `HALF_OPEN` (testing recovery).
  - Trips to `OPEN` after 3 consecutive transient failures.
  - Cooldown period: 30 seconds.
  - In `OPEN` state, calls to the model fast-fail instantly with an explicit `CIRCUIT_BREAKER_OPEN` error, immediately diverting traffic to the secondary model or deterministic fallback.
- **Secondary Model Failover**:
  - Primary model: `gemini-3.8-flash` (configured with `thinkingLevel: ThinkingLevel.LOW`).
  - Fallback model: `gemini-3.6-flash`.
  - Activation: Enabled explicitly via `ENABLE_MODEL_FAILOVER=true`.
  - Failover occurs upon transient primary failure or open circuit state, sharing the same 28s deadline and subjecting responses to identical Zod schemas and business validations.
- **Serverless Architecture & In-Memory State Considerations**:
  - On Vercel Serverless / AWS Lambda, in-memory state (circuit breaker instances) is scoped per warm container process.
  - A warm container successfully protects against consecutive requests hitting an overloaded model.
  - Cold starts initialize a fresh `CLOSED` circuit breaker without cross-instance synchronization. For distributed multi-region deployments, an external state store (e.g. Upstash Redis / Vercel KV) can be integrated without modifying the circuit breaker interface.

---

## 3. Deterministic Fallback Planner (`src/lib/fallbackPlanner.ts`)

When external AI services are unreachable, rate-limited, or when no API key is supplied, StudyFlow AI seamlessly triggers a local algorithmic scheduler:

### Prioritization Algorithm Formula
For each subject topic:
$$\text{Priority Score} = \text{Urgency Factor} \times \text{Difficulty Multiplier} \times \text{Priority Multiplier}$$

- **Urgency Factor**:
  - Overdue / Due Today: $6.0 \times$
  - $\le 2$ days remaining: $4.0 \times$
  - $\le 5$ days remaining: $2.5 \times$
  - $\le 10$ days remaining: $1.8 \times$
  - $> 10$ days: $\max(1.0, 15 / \text{daysLeft})$
- **Difficulty Multiplier**: Hard ($1.6 \times$), Medium ($1.1 \times$), Easy ($0.8 \times$).
- **Priority Multiplier**: High ($1.5 \times$), Medium ($1.0 \times$), Low ($0.7 \times$).

### Scheduling Invariants:
1. **Hard Upper Bound**: $\sum \text{Task Durations on Day } d \le \text{Daily Hour Limit} \times 60$.
2. **Subject Diversity**: No single subject consumes more than 65% of a single day's study time unless required by deadline proximity.
3. **Deadline Invariant**: No preparatory study task is scheduled after the subject's deadline date.
4. **Transparency**: The resulting plan is explicitly branded as `Basic Plan (Algorithmic Fallback)` rather than an AI plan.

---

## 4. Security & Privacy Architecture

- **Zero Client Credential Exposure**: `GEMINI_API_KEY` is loaded exclusively via server-side environment variables.
- **Client Sanitization**: Error messages returned to users strip stack traces and internal provider details.
- **Data Minimization**: Study plans and course data reside solely in the user's browser `localStorage`. No personal academic information is stored in external databases.
- **Health Probing**: The `/api/health` route verifies backend status and provider configuration without revealing credential values.
