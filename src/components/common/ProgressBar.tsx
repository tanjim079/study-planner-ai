import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
  color?: string; // Hex color or class
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  color,
  size = 'md',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          {label && <span>{label}</span>}
          {showPercentage && <span>{clampedValue}%</span>}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            !color && 'bg-primary-600 dark:bg-primary-500'
          )}
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
