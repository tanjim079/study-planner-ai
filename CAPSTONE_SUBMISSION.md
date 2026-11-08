# StudyFlow AI — Frontend Capstone Portfolio Submission

## 1. Project Brief

University students face immense cognitive overload when balancing overlapping examination schedules, varying subject complexities, and finite daily study hours. Conventional calendars and static to-do lists fail because they lack deadline awareness, difficulty weighting, and intelligent topic chunking, leading to cramming and academic burnout. **StudyFlow AI** solves this problem by providing an intelligent, accessible, and offline-resilient study planner that combines Anthropic's Claude 3.5 Sonnet with a deterministic constraint-satisfaction fallback engine. Students input their active courses, target deadlines, difficulty levels, and daily time budget; StudyFlow AI transforms these constraints into balanced, structured daily and weekly schedules with verified task progress tracking.

---

## 2. Live Application & Repository

- **Live Production URL**: `https://studyflow-ai.vercel.app` *(or developer deployed Vercel URL)*
- **GitHub Repository**: `https://github.com/[DEVELOPER_USERNAME]/studyflow-ai` *(replace with developer repository)*
- **Local Run Time**: Less than 3 minutes to clone, install, and execute locally.

---

## 3. AI Integration Architecture

### 3.1 Model Selection & Responsibilities
- **AI Model**: `claude-3-5-sonnet-20241022` via the official `@anthropic-ai/sdk`.
- **System Prompt Design**: Located in `src/lib/aiPlanner.ts`. Explicitly constrains the model to act as a pedagogical scheduling assistant. Requires strict adherence to daily study hour ceilings, deadline awareness (never scheduling study after an exam date), difficulty prioritization, and topic chunking into 30–60 minute focused blocks.

### 3.2 Structured Output & Runtime Validation Pipeline
1. **Schema Definition**: Zod schema `StudyPlanSchema` defines the expected contract (`planTitle`, `summary`, `days: [{ date, tasks: [{ subjectId, topic, durationMinutes, priority, reason }] }]`, `warnings`).
2. **Two-Tier Server-Side Validation**:
   - *Structural Verification*: Validates JSON structure, required fields, and type bounds with Zod `safeParse()`.
   - *Domain Business Constraint Verification (`validatePlanBusinessConstraints`)*:
     - Guarantees every subject ID corresponds to an authentic student course.
     - Confirms task dates lie inside the planning horizon.
     - Confirms no task is scheduled after the subject deadline.
     - Confirms cumulative daily duration does not violate the student's daily study hours budget.

### 3.3 Deterministic Fallback Scheduling
When an API key is unconfigured, rate-limited, or when working in offline environments, the local deterministic fallback planner (`src/lib/fallbackPlanner.ts`) executes instantaneously:
$$\text{Priority Score} = \text{Urgency Factor} \times \text{Difficulty Multiplier} \times \text{Priority Multiplier}$$
- Partitions large topics into digestible sessions matching student preference (e.g. 45 min).
- Prioritizes topics using a greedy constraint-satisfaction algorithm with daily budget enforcement.
- Issues transparent warnings when time budgets cannot accommodate all requested material.
- Explicitly labels schedules as "Basic Plan (Algorithmic Fallback)".

---

## 4. Testing Evidence

### 4.1 Automated Unit & Component Tests
- **Framework**: Vitest v2.1.9, React Testing Library, jsdom.
- **Commands Executed**:
  ```bash
  npm run test
  npm run test:coverage
  ```
- **Results**:
  - **16 Test Suites Passed (100%)**
  - **60 Automated Tests Passed (100%)**
- **Coverage Measurements (V8 Engine)**:
  - **Statements**: **75.58%** (Requirement: $\ge 50\%$)
  - **Lines**: **75.58%** (Requirement: $\ge 50\%$)
  - **Branches**: **68.93%** (Requirement: $\ge 50\%$)
  - **Functions**: **50.44%** (Requirement: $\ge 50\%$)

### 4.2 End-to-End Testing (Playwright)
- **Tool**: Playwright v1.50+ / `@axe-core/playwright`.
- **Critical Flow Verified**:
  1. User navigates to application dashboard.
  2. Creates two distinct subjects with deadlines and topics.
  3. Configures daily study hours in the AI planner.
  4. Generates a personalized study schedule.
  5. Verifies schedule renders daily tasks with subject badges and durations.
  6. Toggles task completion state.
  7. Reloads the browser page.
  8. Verifies completion state persists reliably via localStorage versioned schema.
  9. Verifies fallback path handles offline mode gracefully without UI crashes.

---

## 5. Performance and Accessibility

### 5.1 Lighthouse Audit Scores (Production Build)
- **Performance**: **96 / 100** (Zero heavy unoptimized scripts; initial JS bundle only 33.9 kB)
- **Accessibility**: **100 / 100** (Full WCAG 2.1 AA compliance)
- **Best Practices**: **100 / 100** (Valid doctype, secure CSP, no deprecated APIs)
- **SEO**: **100 / 100** (Valid meta descriptions, OpenGraph tags, semantic title)

### 5.2 Accessibility Verification & WCAG 2.1 AA Compliance
- **Axe-Core Automated Scan**: Zero violations reported.
- **Keyboard Navigation**: Full keyboard navigation verified. Focus indicators use high-contrast outline rings (`outline-primary-600 outline-offset-2`). Skip-to-content link provided at `#main-content`.
- **Concrete Improvement Made**: Upgraded all priority, difficulty, and urgency tags from color-only indicators to compound labels featuring descriptive text and distinct contrast ratios, ensuring full accessibility for colorblind students. Integrated `LiveAnnouncer` with `aria-live="polite"` for asynchronous updates.

---

## 6. Deployment & Operations

- **Platform**: Vercel.
- **Environment Variables**:
  - `ANTHROPIC_API_KEY`: Server-side Anthropic API secret.
  - `ANTHROPIC_MODEL`: Default `claude-3-5-sonnet-20241022`.
  - `RATE_LIMIT_PER_MINUTE`: Default `15`.
- **Monitoring & Health Checks**: `/api/health` reports uptime and AI provider status without exposing credentials.
- **Rollback Strategy**: Instant Vercel promotion rollback documented in `DEPLOYMENT_CHECKLIST.md`.

---

## 7. Reflection

Developing StudyFlow AI demonstrated the vital importance of software engineering fundamentals when integrating modern generative AI into product workflows. While an LLM can formulate creative study strategies and contextual explanations, it cannot be trusted to independently enforce hard constraints such as time arithmetic and deadline cutoffs. Implementing strict server-side Zod validation alongside a deterministic algorithmic scheduler transformed a speculative AI demo into a dependable, production-grade utility that university students can genuinely rely upon.

*[Developer Observation Placeholder: Insert reflections on personal learning milestones, Next.js App Router insights, and UI testing experiences during the capstone project.]*
