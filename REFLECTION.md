# StudyFlow AI — Engineering Reflection

## 1. Technical Challenges & Problem Solving

Building **StudyFlow AI** as a production-ready application reinforced the necessity of treating AI not as an unconstrained chatbot, but as an untrusted external component requiring strict architectural boundaries.

### Challenge 1: Constraint-Satisfaction with Large Language Models
The central challenge of academic scheduling is that students have hard physical limits: finite hours per day, non-negotiable examination deadlines, and varying cognitive weights across subjects. LLMs frequently produce plausible-looking prose while violating mathematical constraints (e.g., allocating 8 hours into a 4-hour window, or scheduling preparation sessions after an exam has already occurred).

**Solution**: We decoupled user input from the LLM via strict Zod schemas and implemented a two-tier validation pipeline. The server validates the model's raw JSON output against structural requirements and then verifies domain business constraints (date horizons, subject ID authenticity, deadline enforcement, and daily minute ceilings). If the model's output violates any constraint, the application gracefully repairs the schedule or applies transparent warnings rather than crashing.

### Challenge 2: Guaranteeing Reliable Offline & Zero-API Planning
Relying solely on external AI APIs makes an application fragile when keys are absent, network connections drop, or rate limits trigger.

**Solution**: We designed and unit-tested an independent **Deterministic Fallback Planner**. Using a weighted scoring heuristic combining urgency factors (proximity to deadlines), difficulty multipliers, and user priority levels, the fallback engine breaks topics into session chunks and distributes them across available days without exceeding daily study hours. This ensures students always receive an actionable schedule regardless of external API availability.

### Challenge 3: Provider Migration & Adapter Decoupling (Claude to Google Gemini)
When transitioning the primary LLM provider from Anthropic Claude to Google Gemini due to API quota constraints, the clean separation of concerns proved decisive. Because model outputs were validated against runtime Zod schemas rather than proprietary SDK formats, migrating to Google's official `@google/genai` SDK and Gemini 2.5 Flash (`gemini-2.5-flash`) required zero changes to client components, state managers, or study business logic. Google Gemini's native `responseSchema` was configured to mirror our domain schema, resulting in faster inference times and zero-downtime provider portability.

---

## 2. Key Architectural Trade-Offs

### Client-First LocalStorage vs. Remote Database
- **Trade-Off**: We selected a versioned browser `localStorage` architecture for the MVP instead of requiring authentication and a remote database (e.g., PostgreSQL / Supabase).
- **Justification**: For university students, friction is the enemy of productivity. Requiring sign-ups and third-party credential management reduces adoption. Local persistence guarantees instantaneous response times, zero server hosting database costs, zero data leak exposure, and complete offline capability. To prevent data entrapment, we provided complete JSON export and import backup utilities.

### Dynamic Chunking vs. Rigid Calendar Blocks
- **Trade-Off**: Rather than forcing rigid calendar time blocks (e.g., "9:00 AM - 9:45 AM"), StudyFlow AI schedules daily task allocations with estimated session lengths.
- **Justification**: University students have dynamic, shifting daily routines. Prescriptive exact-time schedules lead to guilt and abandonment when lectures or commutes run late. Goal-oriented daily session lists provide flexibility while preserving total time discipline.

---

## 3. Accessibility & User Experience Insights

Designing for WCAG 2.1 AA revealed that accessibility is an architectural consideration, not a superficial audit checklist:
- **Color Independence**: Status badges (urgency, difficulty, priority) originally relied on subtle background tints. We enhanced every badge to include clear textual status indicators and high-contrast borders so colorblind users are never disadvantaged.
- **Asynchronous Live Announcements**: In single-page applications, adding or deleting an item often occurs without a full page reload, leaving screen reader users unaware of the change. Adding a `LiveAnnouncer` with `aria-live="polite"` bridges this gap cleanly.
- **Reduced Motion**: Honoring `prefers-reduced-motion` ensures students with vestibular sensitivities experience clean, stable transitions.

---

## 4. Developer Observations & Future Direction

- **[Developer Observation Placeholder]**: *Reflect on your personal experience working with Next.js App Router and testing reactive component states during this 8-week capstone.*
- **Completed in this Release**:
  - RFC 5545 `.ics` calendar export for seamless synchronization with Apple Calendar, Google Calendar, and Outlook.
  - Zero-violation WCAG 2.1 AA accessibility audit via axe-core and keyboard navigation.
- **Next Phase Goals**:
  1. Spaced repetition interval calculators based on the SuperMemo-2 (SM-2) algorithm.
  2. Interactive study timer (Pomodoro mode) directly linked to scheduled session tasks.
  3. Canvas / Blackboard LMS syllabus integration.

