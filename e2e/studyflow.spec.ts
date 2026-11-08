import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('StudyFlow AI End-to-End Critical Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each run
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  test('completes full student planning workflow and verifies persistence', async ({ page }) => {
    // 1. Open Application and check welcome heading
    await page.goto('/');
    await expect(page.getByText('Plan Smarter. Study Better.')).toBeVisible();

    // 2. Navigate to Subjects
    await page.getByRole('button', { name: 'Add Your First Subject' }).click();
    await expect(page.getByRole('dialog', { name: 'Add New Subject' })).toBeVisible();

    // 3. Create Subject 1 (Calculus II)
    await page.getByLabel('Subject Name').fill('Calculus II');
    await page.getByLabel('Deadline (Exam or Assignment Date)').fill('2026-11-25');
    await page.getByPlaceholder('Topic #1 name (e.g. Limits & Continuity)').fill('Integration by Parts');
    await page.getByRole('button', { name: 'Create Subject' }).click();

    // Verify Subject 1 was created
    await expect(page.getByText('Calculus II')).toBeVisible();

    // 4. Create Subject 2 (Computer Systems)
    await page.getByRole('button', { name: 'Add Subject' }).click();
    await page.getByLabel('Subject Name').fill('Computer Systems');
    await page.getByLabel('Deadline (Exam or Assignment Date)').fill('2026-11-20');
    await page.getByPlaceholder('Topic #1 name (e.g. Limits & Continuity)').fill('Memory Hierarchy');
    await page.getByRole('button', { name: 'Create Subject' }).click();

    // Verify Subject 2 was created
    await expect(page.getByText('Computer Systems')).toBeVisible();

    // 5. Navigate to AI Study Planner
    await page.getByRole('button', { name: 'AI Study Planner' }).click();
    await expect(page.getByText('Study Schedule Parameters')).toBeVisible();

    // 6. Generate Basic Plan (deterministic offline-reliable flow)
    await page.getByRole('button', { name: 'Generate Basic Plan' }).click();

    // Verify Schedule View is accessible and schedule cards render
    await page.getByRole('button', { name: 'View Schedule' }).click();
    await expect(page.getByText(/Structured Study Plan/)).toBeVisible();

    // 7. Toggle a task completion
    const checkboxes = page.locator('input[type="checkbox"]');
    const firstTaskCheckbox = checkboxes.first();
    await expect(firstTaskCheckbox).toBeVisible();

    // Check it
    await firstTaskCheckbox.check();
    await expect(firstTaskCheckbox).toBeChecked();

    // 8. Refresh the page
    await page.reload();

    // 9. Verify completion state persisted across reload!
    await page.getByRole('button', { name: 'Study Schedule' }).click();
    const reloadedCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(reloadedCheckbox).toBeChecked();
  });

  test('gracefully generates study schedule when AI endpoint returns offline fallback notice', async ({ page }) => {
    // Mock the /api/generate-plan endpoint to simulate external AI service outage
    await page.route('/api/generate-plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          isAiGenerated: false,
          plan: {
            id: 'mock-fallback-plan',
            planTitle: '7-Day Algorithmic Fallback Plan',
            summary: 'Simulated fallback schedule generated during API maintenance.',
            generatedAt: '2026-11-08T00:00:00.000Z',
            planningPeriodDays: 7,
            startDate: '2026-11-09',
            dailyHoursLimit: 4,
            preferredSessionMinutes: 45,
            isAiGenerated: false,
            days: [
              {
                date: '2026-11-09',
                tasks: [
                  {
                    id: 'mock-task-1',
                    subjectId: 'sub-mock',
                    subjectName: 'Algorithms',
                    topic: 'Dynamic Programming',
                    durationMinutes: 45,
                    priority: 'high',
                    reason: 'Urgent topic preparation',
                    completed: false,
                  },
                ],
              },
            ],
            warnings: ['Service in offline fallback mode.'],
          },
        }),
      });
    });

    await page.goto('/');

    // Add subject
    await page.getByRole('button', { name: 'Add Your First Subject' }).click();
    await page.getByLabel('Subject Name').fill('Algorithms');
    await page.getByLabel('Deadline (Exam or Assignment Date)').fill('2026-11-20');
    await page.getByPlaceholder('Topic #1 name (e.g. Limits & Continuity)').fill('Dynamic Programming');
    await page.getByRole('button', { name: 'Create Subject' }).click();

    // Navigate to Planner
    await page.getByRole('button', { name: 'AI Study Planner' }).click();
    await page.getByRole('button', { name: 'Generate AI Plan' }).click();

    // Verify fallback plan was received and rendered safely
    await expect(page.getByText('7-Day Algorithmic Fallback Plan')).toBeVisible();
    await expect(page.getByText('Service in offline fallback mode.')).toBeVisible();
  });

  test('meets WCAG 2.1 AA accessibility guidelines on main views', async ({ page }) => {
    await page.goto('/');

    // Scan Dashboard View with axe-core
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
