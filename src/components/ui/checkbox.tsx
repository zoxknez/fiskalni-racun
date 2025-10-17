/**
 * Checkbox Component
 *
 * Accessible checkbox with label
 *
 * @module components/ui/checkbox
 */

import { cn } from '@lib/utils'
import { Check } from 'lucide-react'
import * as React from 'react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  error?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        <div className="flex items-start gap-3">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              id={checkboxId}
              className={cn(
                'peer h-5 w-5 shrink-0 appearance-none rounded border-2 border-dark-300 bg-white dark:border-dark-600 dark:bg-dark-800',
                'cursor-pointer transition-all',
                'checked:border-primary-600 checked:bg-primary-600',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-error-500',
                className
              )}
              ref={ref}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={
                error ? `${checkboxId}-error` : description ? `${checkboxId}-desc` : undefined
              }
              {...props}
            />

            <Check
              className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
              aria-hidden="true"
            />
          </div>

          {(label || description) && (
            <div className="flex-1">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className="cursor-pointer select-none font-medium text-dark-900 text-sm dark:text-dark-50"
                >
                  {label}
                </label>
              )}
              {description && (
                <p
                  id={`${checkboxId}-desc`}
                  className="mt-1 text-dark-600 text-xs dark:text-dark-400"
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${checkboxId}-error`}
            className="mt-1.5 text-error-600 text-sm dark:text-error-400"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
