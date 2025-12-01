/**
 * Toast Component
 *
 * Accessible toast notifications
 *
 * @module components/ui/toast
 */

import { cn } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast = { ...toast, id }

      setToasts((prev) => [...prev, newToast])

      // Auto remove after duration
      if (toast.duration !== 0) {
        setTimeout(() => {
          removeToast(id)
        }, toast.duration || 5000)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[]
  removeToast: (id: string) => void
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { t } = useTranslation()
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  }

  const colors = {
    success:
      'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200',
    error:
      'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800 text-error-800 dark:text-error-200',
    warning:
      'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200',
    info: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-200',
  }

  const Icon = icons[toast.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', duration: 0.3 }}
      role="alert"
      aria-live="polite"
      className={cn('rounded-lg border p-4 shadow-lg backdrop-blur-sm', colors[toast.type])}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">{toast.title}</p>
          {toast.description && <p className="mt-1 text-sm opacity-90">{toast.description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Toast helper functions
 */
export const toast = {
  success: (title: string, description?: string) => ({
    type: 'success' as const,
    title,
    description,
  }),
  error: (title: string, description?: string) => ({
    type: 'error' as const,
    title,
    description,
  }),
  warning: (title: string, description?: string) => ({
    type: 'warning' as const,
    title,
    description,
  }),
  info: (title: string, description?: string) => ({
    type: 'info' as const,
    title,
    description,
  }),
}
