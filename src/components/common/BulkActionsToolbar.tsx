/**
 * BulkActionsToolbar
 *
 * Floating toolbar for bulk selection operations.
 * Shows selected count and action buttons.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { CheckSquare, Download, Square, Tag, Trash2, X } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

interface BulkActionsToolbarProps {
  selectionCount: number
  isAllSelected: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete?: () => void
  onExport?: () => void
  onTag?: () => void
  onClose: () => void
  isDeleting?: boolean
  showTagAction?: boolean
}

function BulkActionsToolbarComponent({
  selectionCount,
  isAllSelected,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onTag,
  onClose,
  isDeleting = false,
  showTagAction = true,
}: BulkActionsToolbarProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {selectionCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-full max-w-lg items-center justify-between gap-2 rounded-2xl border border-dark-200 bg-white px-4 py-3 shadow-xl dark:border-dark-600 dark:bg-dark-800 sm:bottom-6"
        >
          {/* Left: Selection info & toggle all */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="rounded-lg p-2 text-dark-600 transition-colors hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-700"
              aria-label={isAllSelected ? t('bulk.deselectAll') : t('bulk.selectAll')}
            >
              {isAllSelected ? (
                <CheckSquare className="h-5 w-5 text-primary-500" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
            <span className="font-medium text-dark-900 text-sm dark:text-white">
              {t('bulk.selected', { count: selectionCount })}
            </span>
          </div>

          {/* Center: Actions */}
          <div className="flex items-center gap-1">
            {showTagAction && onTag && (
              <button
                type="button"
                onClick={onTag}
                className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 font-medium text-primary-700 text-sm transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
                aria-label={t('bulk.addTags')}
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">{t('bulk.tag')}</span>
              </button>
            )}

            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700 text-sm transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                aria-label={t('bulk.export')}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t('bulk.export')}</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 text-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                aria-label={t('bulk.delete')}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('bulk.delete')}</span>
              </button>
            )}
          </div>

          {/* Right: Close button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-dark-600 transition-colors hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-700"
            aria-label={t('bulk.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const BulkActionsToolbar = memo(BulkActionsToolbarComponent)
