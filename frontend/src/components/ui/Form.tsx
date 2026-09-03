import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/format';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, hint, leftIcon, rightSlot, isPassword, className, type, id, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const inputId = id || `in-${Math.random().toString(36).slice(2, 8)}`;
    const inputType = isPassword ? (show ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label-base">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              'input-base',
              leftIcon ? 'pl-10' : '',
              (rightSlot || isPassword) ? 'pr-10' : '',
              error && 'border-error-400 focus:border-error-500 focus:ring-error-500/20',
              success && 'border-success-400 focus:border-success-500 focus:ring-success-500/20',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-err` : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {rightSlot && !isPassword && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-err`} className="mt-1.5 flex items-center gap-1 text-xs text-error-600">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
        {success && !error && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-success-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {success}
          </p>
        )}
        {hint && !error && !success && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || `sel-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="label-base">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn('input-base appearance-none bg-no-repeat pr-9', error && 'border-error-400', className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2367718c' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
            backgroundPosition: 'right 0.6rem center',
            backgroundSize: '1.1rem',
          }}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-error-600"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const taId = id || `ta-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={taId} className="label-base">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          className={cn('input-base resize-y min-h-[100px]', error && 'border-error-400', className)}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-error-600"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export function Checkbox({
  label,
  checked,
  onChange,
  error,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700 dark:text-ink-200">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
        />
        <span>{label}</span>
      </label>
      {error && <p className="mt-1 flex items-center gap-1 text-xs text-error-600"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}
      {hint && !error && <p className="mt-1 ml-6 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
}: {
  name: string;
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div>
      {label && <span className="label-base">{label}</span>}
      <div className="grid gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition',
              value === o.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                : 'border-ink-200 hover:border-ink-300 dark:border-ink-700'
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 h-4 w-4 border-ink-300 text-primary-600 focus:ring-primary-500"
            />
            <span>
              <span className="font-medium text-ink-900 dark:text-ink-100">{o.label}</span>
              {o.description && <span className="block text-xs text-ink-500">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
