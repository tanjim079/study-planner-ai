import { StudyPlan } from '@/types';

/**
 * Format date and time for iCalendar (YYYYMMDDTHHMMSSZ or YYYYMMDD)
 */
function formatIcsDateTime(dateStr: string, hourOffset: number = 9): string {
  const [year, month, day] = dateStr.split('-');
  const hour = String(hourOffset).padStart(2, '0');
  return `${year}${month}${day}T${hour}0000Z`;
}

function addMinutesToIcsDateTime(dateStr: string, startHour: number, durationMinutes: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, startHour, 0, 0));
  date.setUTCMinutes(date.getUTCMinutes() + durationMinutes);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}00Z`;
}

/**
 * Generate standard RFC 5545 iCalendar string from an active StudyPlan
 */
export function generateIcsCalendar(plan: StudyPlan): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyFlow AI//Intelligent Study Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${plan.planTitle}`,
  ];

  let eventCounter = 1;

  for (const day of plan.days) {
    let currentHourOffset = 9; // Start at 9:00 AM UTC

    for (const task of day.tasks) {
      const dtStart = formatIcsDateTime(day.date, currentHourOffset);
      const dtEnd = addMinutesToIcsDateTime(day.date, currentHourOffset, task.durationMinutes);
      const uid = `studyflow-${plan.id}-${day.date}-${task.id || eventCounter}@studyflow.ai`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${formatIcsDateTime(new Date().toISOString().slice(0, 10), 0)}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:[StudyFlow] ${task.subjectName} — ${task.topic}`);
      lines.push(
        `DESCRIPTION:Study Session for ${task.subjectName}\\nTopic: ${task.topic}\\nDuration: ${task.durationMinutes} mins\\nPriority: ${task.priority.toUpperCase()}\\nFocus Reason: ${task.reason}`
      );
      lines.push(`STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`);
      lines.push(`PRIORITY:${task.priority === 'high' ? '1' : task.priority === 'medium' ? '5' : '9'}`);
      lines.push('END:VEVENT');

      eventCounter += 1;
      currentHourOffset = Math.min(20, currentHourOffset + Math.ceil(task.durationMinutes / 60) + 1);
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Trigger client-side download of the .ics calendar file
 */
export function downloadIcsFile(plan: StudyPlan): void {
  if (typeof window === 'undefined') return;

  const icsContent = generateIcsCalendar(plan);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `studyflow-${plan.planningPeriodDays}day-schedule.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
