/**
 * Textarea Component
 *
 * Accessible textarea with auto-resize and error state
 *
 * @module components/ui/textarea
 */

import { cn } from '@lib/utils'
import * as React from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, autoResize = false, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

    // Auto-resize functionality
    React.useEffect(() => {
      if (!autoResize || !textareaRef.current) return

      const textarea = textareaRef.current
      const adjustHeight = () => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }

      textarea.addEventListener('input', adjustHeight)
      adjustHeight() // Initial size

      return () => {
        textarea.removeEventListener('input', adjustHeight)
      }
    }, [autoResize])

    // Combine refs
    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node

        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-error-500" aria-label="obavezno">
                *
              </span>
            )}
          </label>
        )}

        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[100px] w-full rounded-xl border-2 border-dark-300 bg-white px-4 py-3 text-sm transition-colors dark:border-dark-600 dark:bg-dark-800',
            'placeholder:text-dark-400 dark:placeholder:text-dark-500',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none',
            error && 'border-error-500 focus-visible:ring-error-500',
            className
          )}
          ref={setRefs}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
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

Textarea.displayName = 'Textarea'

export { Textarea }
