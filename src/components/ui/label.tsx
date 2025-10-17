/**
 * Label Component
 *
 * Accessible form label
 *
 * @module components/ui/label
 */

import { cn } from '@lib/utils'
import * as React from 'react'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'font-medium text-dark-700 text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-dark-300',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-error-500" aria-label="obavezno">
            *
          </span>
        )}
      </label>
    )
  }
)

Label.displayName = 'Label'

export { Label }
