/**
 * Dialog Component
 *
 * Accessible modal dialog
 *
 * @module components/ui/dialog
 */

import { cn } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const dialog = dialogRef.current
    if (!dialog) return

    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleTab)
    document.addEventListener('keydown', handleEscape)

    // Focus first element
    firstElement?.focus()

    return () => {
      document.removeEventListener('keydown', handleTab)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
              aria-describedby={description ? 'dialog-description' : undefined}
              className={cn(
                'relative w-full rounded-lg bg-white shadow-xl dark:bg-dark-800',
                'flex max-h-[90vh] flex-col',
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4">
                <div className="flex-1">
                  <h2
                    id="dialog-title"
                    className="font-semibold text-dark-900 text-xl dark:text-dark-50"
                  >
                    {title}
                  </h2>
                  {description && (
                    <p
                      id="dialog-description"
                      className="mt-1 text-dark-600 text-sm dark:text-dark-400"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-4 rounded-lg p-1 text-dark-400 transition-colors hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-700"
                    aria-label="Zatvori"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Dialog Footer
 */
interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 border-dark-200 border-t px-6 py-4 sm:flex-row sm:justify-end dark:border-dark-700',
        className
      )}
    >
      {children}
    </div>
  )
}
