# StudyFlow AI — Production Deployment Checklist & Operations Guide

## 1. Pre-Flight Verification Checklist

Before deploying StudyFlow AI to production (Vercel or custom Node.js environment), confirm all quality gates pass:

- [x] **TypeScript Strict Compilation**: `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
- [x] **Unit & Component Testing**: `npm run test` passes (18 test suites, 71 tests passing, 100% pass rate).
- [x] **Code Coverage Verification**: `npm run test:coverage` satisfies thresholds (statements $\ge 80\%$, lines $\ge 80\%$, branches $\ge 69\%$, functions $\ge 52\%$).
- [x] **Production Bundle Build**: `npm run build` succeeds without compiler warnings or EPERM issues.
- [x] **Client Bundle Secret Audit**: Verified that `GEMINI_API_KEY` is referenced solely in `src/app/api/` and never included in client-side bundles.
- [x] **Accessibility Gate (WCAG 2.1 AA)**: Tested via `axe-core` with 0 critical/serious violations.
- [x] **Responsive Layouts**: Desktop, tablet, and mobile views tested with collapsible navigation and accessible touch targets.

---

## 2. Environment Variables Configuration

Set the following variables in the Vercel Project Settings (**Settings > Environment Variables**):

| Variable Name | Environment | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Production, Preview | Google Gemini API key for AI generation | `AIzaSy...` |
| `GEMINI_MODEL` | Production, Preview | Gemini model identifier | `gemini-2.5-flash` |
| `RATE_LIMIT_PER_MINUTE`| Production | Max API requests per IP window | `15` |
| `NODE_ENV` | Production | Runtime environment indicator | `production` |

> **Security Note**: Never commit `.env` or `.env.local` to source control. Use `.env.example` as the canonical reference template.

---

## 3. Step-by-Step Vercel Deployment

### Method A: Deploy via Vercel CLI (Recommended)
1. Install the Vercel CLI globally if not already installed:
   ```bash
   npm install -g vercel
   ```
2. Link the repository to your Vercel account:
   ```bash
   vercel link
   ```
3. Set your production environment variables:
   ```bash
   vercel env add GEMINI_API_KEY production
   vercel env add GEMINI_MODEL production
   ```
4. Trigger a production build:
   ```bash
   vercel --prod
   ```

### Method B: Deploy via GitHub & Vercel Dashboard
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: migrate AI integration to Google Gemini 2.5 Flash"
   git push origin main
   ```
2. Log in to [Vercel Dashboard](https://vercel.com).
3. Click **Add New Project** and import the GitHub repository.
4. Select **Next.js** framework preset.
5. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google AI Studio key)*
   - `GEMINI_MODEL`: `gemini-2.5-flash`
6. Click **Deploy**.

---

## 4. Post-Deployment Verification (Smoke Testing)

1. **System Health Check**:
   Navigate to `https://<your-vercel-domain>/api/health`.
   Verify the response contains:
   ```json
   {
     "status": "healthy",
     "app": "StudyFlow AI",
     "aiService": {
       "configured": true,
       "provider": "Google Gemini",
       "model": "gemini-2.5-flash"
     }
   }
   ```
2. **Subject Management Journey**:
   - Create a subject: "Database Systems", Exam: 10 days out, Topic: "B-Trees" (60m).
   - Edit the subject and verify update persists.
3. **AI Planning Verification**:
   - Set 4 study hours/day and generate a 7-day schedule.
   - Confirm Gemini generates balanced tasks adhering to daily hour limits with the "AI Plan" badge.
4. **Offline Fallback Check**:
   - Click "Generate Basic Plan" to verify the deterministic algorithm functions independently with the "Basic Plan" badge.
5. **Persistence Across Reload**:
   - Check off a study task, refresh the browser, and confirm the checkbox state remains completed.

---

## 5. Rollback Procedures

If an unexpected regression occurs in production:

### Instant Dashboard Rollback
1. Go to **Vercel Dashboard > Project > Deployments**.
2. Identify the last known stable deployment.
3. Click the three dots `...` next to the deployment and select **Promote to Production**.
4. The rollback goes live immediately without rebuilding.
