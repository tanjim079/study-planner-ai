# StudyFlow AI — Intelligent Study Planner

> **Plan Smarter. Study Better.**  
> An intelligent, accessible, and offline-resilient academic study planner designed for university students to organize courses, manage examination deadlines, and track daily progress using Anthropic Claude 3.5 Sonnet and deterministic constraint scheduling.

---

## 1. Problem Statement

University students regularly encounter conflicting academic pressures: overlapping examination schedules, varying subject complexities, and finite daily study hours. Conventional calendar apps and static to-do lists fail because they lack:
- **Deadline Awareness**: They do not calculate urgency or prioritize imminent exams.
- **Cognitive Weighting**: They treat an introductory elective the same as advanced differential equations.
- **Granular Session Chunking**: Students are left staring at massive 10-hour topics without knowing where to start.
- **Offline Resilience**: When AI services suffer rate limits or drop connection, typical tools fail completely.

**StudyFlow AI** solves this problem by synthesizing actual student constraints into realistic daily and weekly study roadmaps with automated time-budget compliance and full WCAG 2.1 AA accessibility.

---

## 2. Target Users

- **University Undergraduates & Graduate Students**: Balancing 4–6 rigorous courses with overlapping midterm and final examination windows.
- **Self-Directed Learners & Certification Candidates**: Needing disciplined daily structure across dense technical syllabi.
- **Students with Accessibility Needs**: Requiring screen reader compatibility, high-contrast visual cues, and reduced-motion support.

---

## 3. Key Features

- 🎯 **Intelligent Academic Dashboard**: Real-time overview of active courses, today's planned sessions, completed study hours, remaining tasks, upcoming deadlines, and overall completion percentages.
- 📚 **Comprehensive Subject Management**: Create, edit, and delete courses with examination deadlines, difficulty levels (Easy, Medium, Hard), priority ratings, and topic lists with estimated durations.
- 🤖 **AI-Powered Schedule Generator**: Powered by Claude 3.5 Sonnet to allocate study time, prioritize urgent deadlines, break large topics into 30–60 minute sessions, and enforce strict daily hour limits.
- 🛡️ **Deterministic Algorithmic Fallback**: A local constraint-satisfaction engine that works offline with zero external API dependencies, guaranteeing that students always receive a valid schedule.
- 📅 **Interactive Schedule Dashboard**: Switch between Daily and Multi-Day/Weekly views, mark tasks complete/incomplete, regenerate plans, and preserve completed task progress.
- 📊 **Real Progress Analytics**: Tracks scheduled vs. studied minutes and generates subject-wise breakdown metrics based exclusively on verified user activity.
- 💾 **Versioned Local Persistence & Privacy**: All student data is persisted in browser `localStorage` under a versioned schema (`v1`) with corrupt JSON recovery and JSON export/import backup capabilities.
- ♿ **WCAG 2.1 AA Accessible**: High-contrast theme (Light, Dark, System), focus outlines, ARIA live announcements, keyboard navigation, and color-independent badges.

---

## 4. Technology Stack

- **Frontend Framework**: Next.js 14 (App Router) with React 18
- **Language**: TypeScript (Strict Mode enabled)
- **Styling**: Tailwind CSS, PostCSS, Lucide React icons
- **AI Integration**: Anthropic Claude API via official `@anthropic-ai/sdk`
- **Validation**: Zod runtime schema validation
- **Persistence**: Browser `localStorage` with versioned migration pipeline
- **Testing**: Vitest, React Testing Library, `@testing-library/jest-dom`, Playwright, `@axe-core/playwright`
- **Deployment**: Vercel

---

## 5. Architecture & Data Flow

```
User Input (Subjects, Deadlines, Topics, Hours/Day)
                       │
                       ▼
         StudyContext (React State Manager)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[Generate AI Plan]          [Generate Basic Plan]
         │                           │
  POST /api/generate-plan            ▼
         │                 Deterministic Planner
         ├─ IP Rate Limit         (Local Engine)
         ├─ Payload Limit            │
         ├─ Anthropic SDK            │
         ├─ Zod Response Check       │
         └─ Business Constraints     │
                       │             │
                       └──────┬──────┘
                              ▼
                      Validated StudyPlan
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       Schedule View                  Progress Tracker
   (Daily / Weekly Grid)           (Actual Hours Studied)
              │                               │
              └───────────────┬───────────────┘
                              ▼
                 LocalStorage Version 1 Schema
                   (Safe Migration & Backup)
```

---

## 6. Installation & Local Setup

Clone and launch StudyFlow AI locally in less than 3 minutes:

### Prerequisites
- Node.js `v18.17+` or `v20.x`
- npm `v9+` or `v10+`

### Step 1: Clone the Repository
```bash
git clone https://github.com/[YOUR_USERNAME]/studyflow-ai.git
cd studyflow-ai
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Edit `.env.local` to add your Anthropic Claude API Key:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your_actual_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
RATE_LIMIT_PER_MINUTE=15
```
*(Note: If no API key is provided, StudyFlow AI runs seamlessly in deterministic fallback mode).*

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Development & Testing Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build optimized production bundle |
| `npm run start` | Start production server |
| `npm run typecheck` | Run strict TypeScript compiler verification (`tsc --noEmit`) |
| `npm run test` | Run Vitest unit and component tests |
| `npm run test:coverage` | Run test suite with V8 code coverage report |
| `npm run test:e2e` | Run Playwright end-to-end and accessibility test suites |

---

## 8. AI System Prompt & Structured Output Validation

The complete prompt is maintained in `src/lib/aiPlanner.ts`.

### Pedagogical Guardrails:
1. **Hard Upper Bound**: The sum of `durationMinutes` on any single day must never exceed `(availableHoursPerDay * 60)`.
2. **Deadline Invariant**: Preparatory study sessions for a course must be scheduled on or before that course's deadline.
3. **Difficulty Weighting**: High-difficulty and high-priority subjects receive earlier slots and larger focus blocks.
4. **Digestible Chunks**: Large topics are partitioned into 30–60 minute sessions.
5. **Contextual Reasons**: Every task receives a concrete pedagogical reason explaining why it was scheduled on that day.
6. **No Hallucinations**: Claude is strictly instructed never to invent subjects or deadlines not provided in the student's payload.

### Two-Tier Server-Side Validation:
```typescript
// Tier 1: Zod structural schema validation
const parseResult = StudyPlanSchema.safeParse(rawJson);

// Tier 2: Domain business constraint verification
const constraintCheck = validatePlanBusinessConstraints(candidatePlan, request);
// Validates: subject ID existence, window dates, deadline compliance, daily minutes ceiling
```

---

## 9. Fallback Planner (Deterministic Engine)

When the Anthropic API is unreachable, unconfigured, or rate-limited, StudyFlow AI executes its internal algorithmic scheduler (`src/lib/fallbackPlanner.ts`):

$$\text{Priority Score} = \text{Urgency Factor} \times \text{Difficulty Multiplier} \times \text{Priority Multiplier}$$

- **Urgency Multiplier**: $\le 0$ days ($6.0\times$), $\le 2$ days ($4.0\times$), $\le 5$ days ($2.5\times$), $\le 10$ days ($1.8\times$).
- **Difficulty Multiplier**: Hard ($1.6\times$), Medium ($1.1\times$), Easy ($0.8\times$).
- **Priority Multiplier**: High ($1.5\times$), Medium ($1.0\times$), Low ($0.7\times$).

The scheduler chunks topics according to the student's preferred session length, distributes tasks across the available days while respecting the daily hour ceiling, reserves pre-exam review slots, and issues clear capacity warnings if the requested syllabus exceeds available bandwidth.

---

## 10. Automated Testing Results

Vitest and React Testing Library test results:
```
Test Files: 16 passed (16)
Tests:      60 passed (60)
Pass Rate:  100%
```

### Coverage (V8 Engine):
- **Statements**: **75.58%** (Threshold: 50%)
- **Lines**: **75.58%** (Threshold: 50%)
- **Branches**: **68.93%** (Threshold: 50%)
- **Functions**: **50.44%** (Threshold: 50%)

---

## 11. Accessibility Features (WCAG 2.1 AA)

- **Semantic HTML**: Proper heading hierarchy (`h1` through `h4`) and native landmarks (`<nav>`, `<aside>`, `<main>`, `<header>`).
- **Focus Indicators**: 2px visible focus rings with 2px offset on all interactive buttons and inputs.
- **Screen Reader Support**: Integrated `LiveAnnouncer` with `role="status"` and `aria-live="polite"` announcing asynchronous subject creation, deletions, task completions, and plan generation events.
- **Accessible Dialogs**: Modals trap focus, declare `aria-modal="true"`, link titles with `aria-labelledby`, and dismiss via `Escape`.
- **Contrast & Color-Independence**: Badges combine distinct high-contrast colors with explicit text labels ("Overdue", "Due Today", "Hard", "High Priority") to ensure full legibility for colorblind users.
- **Skip Navigation**: Accessible skip-to-content anchor (`#main-content`) for keyboard-first navigation.
- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` across all animations and transitions.

---

## 12. Deployment to Vercel

Refer to [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for full pre-flight verification, environment variable configuration, and rollback procedures.

Quick deployment with Vercel CLI:
```bash
npm install -g vercel
vercel
vercel --prod
```

---

## 13. Known Limitations & Future Improvements

### Current Limitations:
- Local storage is browser-scoped; clearing browser site data erases schedules unless backed up via JSON export.
- External calendar integration (.ics files / Google Calendar sync) is not included in the MVP.

### Future Roadmap:
- Direct Google Calendar & Outlook Calendar synchronization.
- Spaced repetition scheduling based on the SuperMemo-2 (SM-2) algorithm.
- Interactive in-app Pomodoro study timer directly connected to scheduled task sessions.
- Multi-device cloud sync with end-to-end encryption.

---

## 14. License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
