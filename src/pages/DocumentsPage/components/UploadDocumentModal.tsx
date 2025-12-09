/**
 * UploadDocumentModal Component
 *
 * Modal for uploading a new document with enhanced UI
 */

import type { DocumentType } from '@lib/db'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Bell, Calendar, FileText, FolderUp, Loader2, Upload, X } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <FolderUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-xl">{t('documents.addDocument')}</h2>
                <p className="text-sm text-white/80">
                  {t('documents.addDocumentHint', 'Dodaj novi dokument za praćenje')}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 90 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="mb-3 flex items-center gap-2 font-semibold text-dark-900 text-sm dark:text-dark-50">
                <FileText className="h-4 w-4 text-blue-500" />
                {t('documents.documentTypeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENT_TYPES.map((type) => (
                  <motion.button
                    key={type.value}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-3 font-medium text-sm transition-all ${
                      selectedType === type.value
                        ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                        : 'border-2 border-dark-200 bg-white text-dark-700 hover:border-dark-300 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300'
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
              <label className="mb-3 flex items-center gap-2 font-semibold text-dark-900 text-sm dark:text-dark-50">
                <Upload className="h-4 w-4 text-blue-500" />
                {t('documents.selectFile')}
              </label>
              <motion.div
                whileHover={
                  prefersReducedMotion ? {} : { borderColor: 'rgb(59, 130, 246)', scale: 1.01 }
                }
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  selectedFile
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                    : 'border-dark-300 bg-dark-50 hover:bg-dark-100 dark:border-dark-600 dark:bg-dark-800/50 dark:hover:bg-dark-700'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="font-semibold text-dark-900 dark:text-dark-50">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-dark-500 text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
                      <Upload className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="font-semibold text-dark-900 dark:text-dark-50">
                      {t('documents.dropFile')}
                    </p>
                    <p className="mt-1 text-dark-500 text-sm">{t('documents.fileFormatsHint')}</p>
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
              <label className="mb-3 flex items-center gap-2 font-semibold text-dark-900 text-sm dark:text-dark-50">
                <Calendar className="h-4 w-4 text-blue-500" />
                {t('documents.expiryDateLabel')}
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border-2 border-dark-200 bg-white px-4 py-3 font-medium text-dark-900 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50"
              />
            </div>

            {/* Expiry Reminder Days */}
            <div>
              <label className="mb-3 flex items-center gap-2 font-semibold text-dark-900 text-sm dark:text-dark-50">
                <Bell className="h-4 w-4 text-blue-500" />
                {t('documents.expiryReminderLabel', { count: expiryReminderDays })}
              </label>
              <div className="rounded-xl bg-dark-50 p-4 dark:bg-dark-700/50">
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={expiryReminderDays}
                  onChange={(e) => setExpiryReminderDays(Number(e.target.value))}
                  className="w-full cursor-pointer accent-blue-500"
                />
                <div className="mt-2 flex items-center justify-between text-dark-600 text-xs dark:text-dark-400">
                  <span>{t('common.days', { count: 1 })}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {expiryReminderDays} {expiryReminderDays === 1 ? 'dan' : 'dana'}
                  </span>
                  <span>{t('common.days', { count: 90 })}</span>
                </div>
              </div>
            </div>

            {/* Info hint */}
            {!selectedFile && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-700 text-sm dark:text-amber-300">
                  {t('documents.selectFileFirst', 'Izaberite fajl za upload klikom na polje iznad')}
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-8 flex gap-3">
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-700 transition-all hover:bg-dark-50 disabled:opacity-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
            >
              {t('common.cancel')}
            </motion.button>
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isLoading || !selectedFile}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 font-semibold text-white shadow-blue-500/25 shadow-lg transition-all hover:shadow-blue-500/30 hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('documents.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  {t('documents.uploadButton')}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
