/**
 * UploadDocumentModal Component
 *
 * Modal for uploading a new document
 */

import type { DocumentType } from '@lib/db'
import { motion, useReducedMotion } from 'framer-motion'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DOCUMENT_TYPES } from '../types'

interface UploadDocumentModalProps {
  onUpload: (file: File, type: DocumentType, expiryDate: string, reminderDays: number) => void
  onClose: () => void
  isLoading: boolean
}

export function UploadDocumentModal({ onUpload, onClose, isLoading }: UploadDocumentModalProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedType, setSelectedType] = useState<DocumentType>('id_card')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryReminderDays, setExpiryReminderDays] = useState(30)

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile, selectedType, expiryDate, expiryReminderDays)
    } else {
      fileInputRef.current?.click()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6 dark:bg-dark-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-bold text-2xl text-dark-900 dark:text-dark-50">
            {t('documents.addDocument')}
          </h2>
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-dark-100 dark:hover:bg-dark-700"
          >
            <X className="h-6 w-6" />
          </motion.button>
        </div>

        <div className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.documentTypeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {DOCUMENT_TYPES.map((type) => (
                <motion.button
                  key={type.value}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-2 font-medium text-xs transition-all sm:gap-2 sm:px-3 sm:text-sm ${
                    selectedType === type.value
                      ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                      : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                  }`}
                >
                  {type.icon}
                  <span className="truncate">{t(type.labelKey)}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.selectFile')}
            </label>
            <motion.div
              whileHover={prefersReducedMotion ? {} : { borderColor: 'rgb(59, 130, 246)' }}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                selectedFile
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-900 dark:bg-primary-900/20'
                  : 'border-dark-300 bg-dark-50 hover:bg-dark-100 dark:border-dark-600 dark:bg-dark-800/50 dark:hover:bg-dark-700'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <>
                  <FileText className="mx-auto h-8 w-8 text-primary-600" />
                  <p className="mt-2 font-semibold text-dark-900 dark:text-dark-50">
                    {selectedFile.name}
                  </p>
                  <p className="text-dark-600 text-sm dark:text-dark-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-primary-600" />
                  <p className="mt-2 font-semibold text-dark-900 dark:text-dark-50">
                    {t('documents.dropFile')}
                  </p>
                  <p className="text-dark-600 text-sm dark:text-dark-400">
                    {t('documents.fileFormatsHint')}
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0])
                  }
                }}
                className="hidden"
              />
            </motion.div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.expiryDateLabel')}
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-dark-300 bg-white px-4 py-2 text-dark-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50"
            />
          </div>

          {/* Expiry Reminder Days */}
          <div>
            <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
              {t('documents.expiryReminderLabel', { count: expiryReminderDays })}
            </label>
            <input
              type="range"
              min="1"
              max="90"
              value={expiryReminderDays}
              onChange={(e) => setExpiryReminderDays(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="mt-2 flex items-center justify-between text-dark-600 text-xs dark:text-dark-400">
              <span>{t('common.days', { count: 1 })}</span>
              <span>{t('common.days', { count: 90 })}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border-2 border-dark-300 py-3 font-semibold text-dark-900 transition-all hover:bg-dark-50 dark:border-dark-600 dark:text-dark-50 dark:hover:bg-dark-700"
            >
              {t('common.cancel')}
            </motion.button>
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 py-3 font-semibold text-white shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('documents.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  {selectedFile ? t('documents.uploadButton') : t('documents.selectFile')}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
