'use client';

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useStudy } from '@/context/StudyContext';

export function ThemeToggle() {
  const { preferences, updatePreferences } = useStudy();
  const currentTheme = preferences.theme || 'system';

  return (
    <div
      role="group"
      aria-label="Theme selector"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
    >
      <button
        type="button"
        onClick={() => updatePreferences({ theme: 'light' })}
        aria-pressed={currentTheme === 'light'}
        aria-label="Light mode"
        className={`rounded-md p-1.5 text-xs font-medium transition-colors ${
          currentTheme === 'light'
            ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => updatePreferences({ theme: 'dark' })}
        aria-pressed={currentTheme === 'dark'}
        aria-label="Dark mode"
        className={`rounded-md p-1.5 text-xs font-medium transition-colors ${
          currentTheme === 'dark'
            ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => updatePreferences({ theme: 'system' })}
        aria-pressed={currentTheme === 'system'}
        aria-label="System theme"
        className={`rounded-md p-1.5 text-xs font-medium transition-colors ${
          currentTheme === 'system'
            ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
      >
        <Laptop className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
