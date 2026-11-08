import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-900 dark:text-slate-100"
          >
            {label}
            {props.required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'block w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors',
              'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1',
              'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
              leftIcon && 'pl-10',
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500'
                : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-700 dark:focus:border-primary-500',
              disabled && 'cursor-not-allowed bg-slate-100 opacity-60 dark:bg-slate-800',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

