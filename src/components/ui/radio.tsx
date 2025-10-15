/**
 * Radio Component
 *
 * Accessible radio button with label
 *
 * @module components/ui/radio
 */

import { cn } from '@lib/utils'
import * as React from 'react'

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center">
          <input
            type="radio"
            id={radioId}
            className={cn(
              'peer h-5 w-5 shrink-0 appearance-none rounded-full border-2 border-dark-300 dark:border-dark-600 bg-white dark:bg-dark-800',
              'transition-all cursor-pointer',
              'checked:border-primary-600',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            ref={ref}
            {...props}
          />

          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-primary-600 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
            aria-hidden="true"
          />
        </div>

        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={radioId}
                className="text-sm font-medium text-dark-900 dark:text-dark-50 cursor-pointer select-none"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-dark-600 dark:text-dark-400 mt-1">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'

export { Radio }

/**
 * Radio Group Component
 */
export interface RadioGroupProps {
  name: string
  options: Array<{
    value: string
    label: string
    description?: string
  }>
  value?: string
  onChange?: (value: string) => void
  error?: string
  label?: string
  required?: boolean
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  error,
  label,
  required,
}: RadioGroupProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-3">
          {label}
          {required && (
            <span className="ml-1 text-error-500" aria-label="obavezno">
              *
            </span>
          )}
        </div>
      )}

      <div
        role="radiogroup"
        aria-labelledby={label ? `${name}-label` : undefined}
        aria-required={required}
        className="space-y-3"
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={value === option.value}
            onChange={(e) => onChange?.(e.target.value)}
            {...(option.description !== undefined ? { description: option.description } : {})}
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
