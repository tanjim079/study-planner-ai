import React from 'react';
import { Edit2, Trash2, Calendar, BookOpen, Clock } from 'lucide-react';
import { Subject } from '@/types';
import {
  formatDate,
  formatMinutes,
  getDaysRemaining,
  getDifficultyBadge,
  getPriorityBadge,
  getTodayIso,
  getUrgencyBadge,
} from '@/lib/utils';
import { Button } from '../common/Button';

interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onDelete: (id: string) => void;
}

export function SubjectCard({ subject, onEdit, onDelete }: SubjectCardProps) {
  const today = getTodayIso();
  const daysLeft = getDaysRemaining(subject.deadline, today);
  const urgency = getUrgencyBadge(daysLeft);
  const diffBadge = getDifficultyBadge(subject.difficulty);
  const prioBadge = getPriorityBadge(subject.priority);

  const totalMinutes = subject.topics.reduce((acc, t) => acc + t.estimatedMinutes, 0);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-card dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: subject.color || '#2563EB' }}
              aria-hidden="true"
            />
            <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
              {subject.name}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(subject)}
              aria-label={`Edit subject ${subject.name}`}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(subject.id)}
              aria-label={`Delete subject ${subject.name}`}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional Description */}
        {subject.description && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {subject.description}
          </p>
        )}

        {/* Metadata Badges */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${diffBadge.className}`}
          >
            {diffBadge.label}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${prioBadge.className}`}
          >
            {prioBadge.label}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${urgency.className}`}
          >
            {urgency.label}
          </span>
        </div>

        {/* Deadline & Total Time Info */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Target: {formatDate(subject.deadline)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatMinutes(totalMinutes)} total</span>
          </div>
        </div>

        {/* Topics preview */}
        <div className="mt-3 space-y-1.5">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Topics ({subject.topics.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {subject.topics.slice(0, 4).map((topic) => (
              <span
                key={topic.id}
                className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {topic.name} ({topic.estimatedMinutes}m)
              </span>
            ))}
            {subject.topics.length > 4 && (
              <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                +{subject.topics.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

