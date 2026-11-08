import { describe, it, expect } from 'vitest';
import { generateIcsCalendar } from '../calendarExport';
import { StudyPlan } from '@/types';

describe('iCalendar Export Utility', () => {
  const mockPlan: StudyPlan = {
    id: 'plan-test',
    planTitle: '7-Day Study Schedule',
    summary: 'Focused exam preparation',
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
            id: 'task-1',
            subjectId: 'sub-1',
            subjectName: 'Operating Systems',
            topic: 'Deadlocks and Concurrency',
            durationMinutes: 60,
            priority: 'high',
            reason: 'Approaching midterm',
            completed: false,
          },
        ],
      },
    ],
    warnings: [],
  };

  it('generates a valid RFC 5545 iCalendar string', () => {
    const ics = generateIcsCalendar(mockPlan);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:[StudyFlow] Operating Systems — Deadlocks and Concurrency');
    expect(ics).toContain('PRIORITY:1'); // high priority -> 1
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
