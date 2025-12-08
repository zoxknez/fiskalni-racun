/**
 * FormActions Component
 *
 * Sticky footer with form action buttons (submit, cancel, etc.)
 */

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { memo, type ReactNode } from 'react'

interface FormActionsProps {
  children?: ReactNode
  submitLabel: string
  cancelLabel?: string
  isSubmitting?: boolean
  isDisabled?: boolean
  onCancel?: () => void
  variant?: 'sticky' | 'inline'
}

function FormActionsComponent({
  children,
  submitLabel,
  cancelLabel,
  isSubmitting = false,
  isDisabled = false,
  onCancel,
  variant = 'inline',
}: FormActionsProps) {
  const stickyClasses =
    variant === 'sticky'
      ? 'sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 mt-6 rounded-b-2xl border-t border-dark-100 bg-white/80 px-5 sm:px-6 py-4 backdrop-blur-lg dark:border-dark-700 dark:bg-dark-800/80'
      : 'mt-6 pt-6 border-t border-dark-100 dark:border-dark-700'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={stickyClasses}
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {/* Cancel button */}
        {cancelLabel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border-2 border-dark-200 bg-white px-6 py-3 font-semibold text-dark-700 transition-all hover:bg-dark-50 disabled:opacity-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700"
          >
            {cancelLabel}
          </button>
        )}

        {/* Custom children (additional buttons) */}
        {children}

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={isSubmitting || isDisabled}
          whileHover={{ scale: isSubmitting || isDisabled ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting || isDisabled ? 1 : 0.98 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/30 hover:shadow-xl disabled:opacity-70 disabled:shadow-none"
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={isSubmitting ? {} : { x: '200%' }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 3 }}
          />

          <span className="relative flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {submitLabel}
          </span>
        </motion.button>
      </div>
    </motion.div>
  )
}

export const FormActions = memo(FormActionsComponent)
