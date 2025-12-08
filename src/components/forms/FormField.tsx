/**
 * FormField Component
 *
 * Enhanced form field with floating label effect, icons, and error states.
 */

import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import {
  forwardRef,
  type InputHTMLAttributes,
  memo,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from 'react'

// ────────────────────────────────────────────────────────────────
// Base Field Wrapper
// ────────────────────────────────────────────────────────────────

interface FieldWrapperProps {
  error?: string | undefined
  hint?: string | undefined
  children: ReactNode
  className?: string
}

function FieldWrapper({ error, hint, children, className = '' }: FieldWrapperProps) {
  return (
    <div className={`relative ${className}`}>
      {children}

      {/* Hint or Error */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1.5 flex items-center gap-1.5 text-red-500 text-sm"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1.5 text-dark-400 text-sm"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// FormInput
// ────────────────────────────────────────────────────────────────

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  icon?: LucideIcon
  error?: string | undefined
  hint?: string | undefined
  suffix?: ReactNode
}

const FormInputComponent = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, icon: Icon, error, hint, required, suffix, id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = props.value !== undefined && props.value !== ''

    return (
      <FieldWrapper error={error} hint={hint}>
        <div className="relative">
          {/* Icon */}
          {Icon && (
            <div
              className={`-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 transition-colors duration-200 ${
                isFocused ? 'text-primary-500' : 'text-dark-400'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={id}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            className={`peer w-full rounded-xl border-2 bg-white px-4 py-3.5 text-dark-900 transition-all duration-200 placeholder:text-transparent focus:outline-none dark:bg-dark-800 dark:text-white ${
              Icon ? 'pl-12' : ''
            } ${suffix ? 'pr-16' : ''} ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                : 'border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:border-dark-600 dark:focus:border-primary-500'
            }`}
            placeholder={label}
          />

          {/* Floating Label */}
          <label
            htmlFor={id}
            className={`pointer-events-none absolute left-4 transition-all duration-200 ${Icon ? 'left-12' : 'left-4'} ${
              isFocused || hasValue
                ? '-top-2.5 bg-white px-1 font-medium text-xs dark:bg-dark-800'
                : '-translate-y-1/2 top-1/2 text-sm'
            } ${
              isFocused
                ? 'text-primary-500'
                : error
                  ? 'text-red-500'
                  : 'text-dark-400 dark:text-dark-500'
            }`}
          >
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>

          {/* Suffix */}
          {suffix && (
            <div className="-translate-y-1/2 absolute top-1/2 right-4 text-dark-400 text-sm">
              {suffix}
            </div>
          )}
        </div>
      </FieldWrapper>
    )
  }
)
FormInputComponent.displayName = 'FormInput'
export const FormInput = memo(FormInputComponent)

// ────────────────────────────────────────────────────────────────
// FormSelect
// ────────────────────────────────────────────────────────────────

interface FormSelectOption {
  value: string
  label: string
}

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label: string
  icon?: LucideIcon
  options: FormSelectOption[]
  error?: string | undefined
  hint?: string | undefined
}

const FormSelectComponent = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, icon: Icon, options, error, hint, required, id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = props.value !== undefined && props.value !== ''

    return (
      <FieldWrapper error={error} hint={hint}>
        <div className="relative">
          {/* Icon */}
          {Icon && (
            <div
              className={`-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 transition-colors duration-200 ${
                isFocused ? 'text-primary-500' : 'text-dark-400'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}

          {/* Select */}
          <select
            ref={ref}
            id={id}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            className={`peer w-full appearance-none rounded-xl border-2 bg-white px-4 py-3.5 text-dark-900 transition-all duration-200 focus:outline-none dark:bg-dark-800 dark:text-white ${
              Icon ? 'pl-12' : ''
            } pr-10 ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                : 'border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:border-dark-600 dark:focus:border-primary-500'
            }`}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Floating Label */}
          <label
            htmlFor={id}
            className={`pointer-events-none absolute transition-all duration-200 ${Icon ? 'left-12' : 'left-4'} ${
              isFocused || hasValue
                ? '-top-2.5 bg-white px-1 font-medium text-xs dark:bg-dark-800'
                : '-translate-y-1/2 top-1/2 text-sm'
            } ${
              isFocused
                ? 'text-primary-500'
                : error
                  ? 'text-red-500'
                  : 'text-dark-400 dark:text-dark-500'
            }`}
          >
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>

          {/* Chevron */}
          <div className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-4">
            <svg
              className="h-5 w-5 text-dark-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </FieldWrapper>
    )
  }
)
FormSelectComponent.displayName = 'FormSelect'
export const FormSelect = memo(FormSelectComponent)

// ────────────────────────────────────────────────────────────────
// FormTextarea
// ────────────────────────────────────────────────────────────────

interface FormTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label: string
  icon?: LucideIcon
  error?: string | undefined
  hint?: string | undefined
}

const FormTextareaComponent = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, icon: Icon, error, hint, required, id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = props.value !== undefined && props.value !== ''

    return (
      <FieldWrapper error={error} hint={hint}>
        <div className="relative">
          {/* Icon */}
          {Icon && (
            <div
              className={`pointer-events-none absolute top-4 left-4 transition-colors duration-200 ${
                isFocused ? 'text-primary-500' : 'text-dark-400'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={ref}
            id={id}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            className={`peer w-full resize-none rounded-xl border-2 bg-white px-4 py-3.5 text-dark-900 transition-all duration-200 placeholder:text-transparent focus:outline-none dark:bg-dark-800 dark:text-white ${
              Icon ? 'pl-12' : ''
            } ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                : 'border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:border-dark-600 dark:focus:border-primary-500'
            }`}
            placeholder={label}
            rows={props.rows || 3}
          />

          {/* Floating Label */}
          <label
            htmlFor={id}
            className={`pointer-events-none absolute transition-all duration-200 ${Icon ? 'left-12' : 'left-4'} ${
              isFocused || hasValue
                ? '-top-2.5 bg-white px-1 font-medium text-xs dark:bg-dark-800'
                : 'top-4 text-sm'
            } ${
              isFocused
                ? 'text-primary-500'
                : error
                  ? 'text-red-500'
                  : 'text-dark-400 dark:text-dark-500'
            }`}
          >
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        </div>
      </FieldWrapper>
    )
  }
)
FormTextareaComponent.displayName = 'FormTextarea'
export const FormTextarea = memo(FormTextareaComponent)

// ────────────────────────────────────────────────────────────────
// FormRow - Grid layout helper
// ────────────────────────────────────────────────────────────────

interface FormRowProps {
  children: ReactNode
  cols?: 1 | 2 | 3
}

export function FormRow({ children, cols = 2 }: FormRowProps) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }

  return <div className={`grid gap-4 ${colsClass[cols]}`}>{children}</div>
}
