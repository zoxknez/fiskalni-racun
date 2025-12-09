/**
 * EditDocumentModal Component
 *
 * Modal for editing document details
 */

import type { DocumentType } from '@lib/db'
import { motion, useReducedMotion } from 'framer-motion'
import { Edit3, FileEdit, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DOCUMENT_TYPES, type Document } from '../types'

interface EditDocumentModalProps {
  document: Document
  name: string
  type: DocumentType
  expiryDate: string
  notes: string
  isLoading: boolean
  onNameChange: (name: string) => void
  onTypeChange: (type: DocumentType) => void
  onExpiryDateChange: (date: string) => void
  onNotesChange: (notes: string) => void
  onSave: () => void
  onClose: () => void
}

export function EditDocumentModal({
  document,
  name,
  type,
  expiryDate,
  notes,
  isLoading,
  onNameChange,
  onTypeChange,
  onExpiryDateChange,
  onNotesChange,
  onSave,
  onClose,
}: EditDocumentModalProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
              >
                <FileEdit className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h2 className="font-bold text-xl text-white">{t('documents.editDocument')}</h2>
                <p className="text-sm text-white/80 truncate max-w-[200px]">{document.name}</p>
              </div>
            </div>
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 90 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              onClick={onClose}
              className="rounded-xl bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6 space-y-6">
          {/* Document Name */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.documentName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full rounded-lg border border-dark-300 bg-white px-4 py-2 text-dark-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50"
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.documentTypeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {DOCUMENT_TYPES.map((docType) => (
                <motion.button
                  key={docType.value}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  onClick={() => onTypeChange(docType.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-2 font-medium text-xs transition-all sm:gap-2 sm:px-3 sm:text-sm ${
                    type === docType.value
                      ? `bg-gradient-to-r ${docType.color} text-white shadow-lg`
                      : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                  }`}
                >
                  {docType.icon}
                  <span className="truncate">{t(docType.labelKey)}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.expiryDateLabel')}
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => onExpiryDateChange(e.target.value)}
              className="w-full rounded-lg border border-dark-300 bg-white px-4 py-2 text-dark-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-dark-300 bg-white px-4 py-2 text-dark-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50"
              placeholder={t('documents.notesPlaceholder')}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-700 transition-all hover:bg-dark-50 dark:border-dark-600 dark:text-dark-200 dark:hover:bg-dark-700"
            >
              {t('common.cancel')}
            </motion.button>
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={onSave}
              disabled={isLoading || !name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Edit3 className="h-5 w-5" />
                  {t('common.save')}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
