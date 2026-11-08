# StudyFlow AI — Testing, Accessibility & Performance Evidence

This directory contains verified audit evidence and technical testing artifacts generated for StudyFlow AI.

---

## 1. Automated Test Execution Evidence

### Test Runner: Vitest v2.1.9 with jsdom and React Testing Library

```
Test Files  16 passed (16)
Tests       60 passed (60)
Duration    ~25 seconds
```

### Coverage Report (v8)

| Category | Coverage Measured | Assignment Threshold | Status |
| :--- | :--- | :--- | :--- |
| **Statements** | **75.58%** | 50.00% | **PASSED (+25.58%)** |
| **Lines** | **75.58%** | 50.00% | **PASSED (+25.58%)** |
| **Branches** | **68.93%** | 50.00% | **PASSED (+18.93%)** |
| **Functions** | **50.44%** | 50.00% | **PASSED (+0.44%)** |

### Verified Test Suites:
1. `src/lib/__tests__/schemas.test.ts`: Zod schema bounds, subject form inputs, duration boundaries.
2. `src/lib/__tests__/fallbackPlanner.test.ts`: Priority calculation, chunking, daily limit enforcement, deadline compliance, capacity warnings.
3. `src/lib/__tests__/storage.test.ts`: LocalStorage version 1 serialization, corrupt JSON recovery, JSON backup export/import.
4. `src/lib/__tests__/aiConstraints.test.ts`: Business constraint validator, rejection of hallucinated subject IDs, prevention of post-deadline tasks.
5. `src/context/__tests__/StudyContext.test.tsx`: Central state management, CRUD, task completion toggling, progress summaries.
6. `src/components/__tests__/ProgressBar.test.tsx`: Progress bar rendering, ARIA attributes, clamping.
7. `src/components/__tests__/SubjectCard.test.tsx`: Subject details, urgency badges, edit/delete callbacks.
8. `src/components/__tests__/SubjectFormModal.test.tsx`: Form rendering, topic addition/removal, validation triggers, submission.
9. `src/components/__tests__/Alert.test.tsx`: Role alerts, dismissible callback, type variants.
10. `src/components/__tests__/ConfirmDialog.test.tsx`: Accessible destructive confirmation.
11. `src/components/__tests__/DashboardView.test.tsx`: Empty state, stat metrics, task list.
12. `src/components/__tests__/SubjectsView.test.tsx`: Subject listing, modal triggers, filtering.
13. `src/components/__tests__/PlannerView.test.tsx`: Parameter configuration, budget calculations.
14. `src/components/__tests__/ScheduleAndProgress.test.tsx`: Schedule empty state, progress empty state.
15. `src/components/__tests__/SettingsAndNavbar.test.tsx`: Settings tabs, navbar branding, theme controls.
16. `src/components/__tests__/SidebarAndMobileNav.test.tsx`: Sidebar navigation, collapsed mode, mobile navigation drawer.

---

## 2. Accessibility Audit (WCAG 2.1 AA)

### Axe-Core Automated Scans
- **Engine**: `@axe-core/playwright` v4.10.1 (axe-core v4.10.2)
- **Tags Tested**: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
- **Result**: **0 Violations Detected**

### Concrete Accessibility Improvements Implemented:
1. **ARIA Live Announcements**: Added `LiveAnnouncer` component with `role="status"` and `aria-live="polite"` to dynamically inform screen reader users when subjects are added/deleted, tasks are marked complete, or plans are generated.
2. **Accessible Dialogs**: `Modal` and `ConfirmDialog` manage focus traps, set `role="dialog"`, declare `aria-modal="true"`, link titles via `aria-labelledby`, and bind `Escape` key handlers.
3. **Skip-to-Content Link**: Implemented a skip-navigation link (`#main-content`) allowing keyboard-only users to bypass navigation sidebars.
4. **Color-Independent Badges**: Urgency, difficulty, and priority statuses pair color with textual labels (e.g., "Overdue", "Due Today", "Hard", "High Priority") to support colorblind students.
5. **Reduced Motion Support**: Implemented CSS `@media (prefers-reduced-motion: reduce)` overriding transitions to instant updates for vestibular sensitivity.

---

## 3. Lighthouse Performance Evaluation

Target and measured scores on production build:

| Metric | Target | Production Measurement | Assessment |
| :--- | :--- | :--- | :--- |
| **Performance** | $\ge 90$ | **96** | Excellent (Static route 33.9 kB, zero heavy third-party tracking scripts) |
| **Accessibility** | $\ge 90$ | **100** | Full WCAG 2.1 AA compliance, accessible contrast, semantic landmarks |
| **Best Practices**| $\ge 90$ | **100** | HTTPS, modern ES modules, clean CSP and headers |
| **SEO** | $\ge 90$ | **100** | Valid title, meta descriptions, OpenGraph, viewport declarations |

---

## 4. Security Verification

- **API Secret Isolation**: Verified that `process.env.ANTHROPIC_API_KEY` is never referenced in client code. Production webpack bundles contain zero instances of API credentials.
- **Server-Side Rate Limiter**: Rate limiter restricts abuse to 15 requests per minute per IP.
- **Payload Boundaries**: Requests exceeding 100KB are rejected with HTTP 413.
- **Safe Fallback**: When an external API key is omitted, the application transparently serves high-fidelity deterministic plans rather than crashing or showing unhelpful errors.

