/**
 * FormSection Component
 *
 * A visually appealing section wrapper for form fields with icon and title.
 */

import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { memo, type ReactNode, useState } from 'react'

interface FormSectionProps {
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
  className?: string
  delay?: number
  variant?: 'default' | 'highlight' | 'subtle'
  defaultCollapsed?: boolean
}

function FormSectionComponent({
  icon: Icon,
  title,
  description,
  children,
  className = '',
  delay = 0,
  variant = 'default',
  defaultCollapsed = false,
}: FormSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const variantStyles = {
    default: 'bg-white dark:bg-dark-800 border border-dark-100 dark:border-dark-700',
    highlight:
      'bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-dark-800 border border-primary-100 dark:border-primary-800/30',
    subtle: 'bg-dark-50/50 dark:bg-dark-800/50',
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`rounded-2xl p-5 sm:p-6 ${variantStyles[variant]} ${className}`}
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-dark-900 text-lg dark:text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-dark-500 text-sm dark:text-dark-400">{description}</p>
          )}
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-dark-100 dark:bg-dark-700"
        >
          <ChevronDown className="h-4 w-4 text-dark-500 dark:text-dark-400" />
        </motion.div>
      </button>

      {/* Section Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

export const FormSection = memo(FormSectionComponent)
