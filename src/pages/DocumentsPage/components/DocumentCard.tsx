/**
 * DocumentCard Component
 *
 * Card for displaying a document with preview, details and actions
 */

import { format } from 'date-fns'
import { motion, useReducedMotion } from 'framer-motion'
import { Calendar, Edit3, Eye, File, Trash2, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type Document, getDocumentTypeInfo } from '../types'

interface DocumentCardProps {
  doc: Document
  index: number
  onView: (url: string) => void
  onEdit: (doc: Document) => void
  onDelete: (id: string) => void
}

export function DocumentCard({ doc, index, onView, onEdit, onDelete }: DocumentCardProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  const typeInfo = getDocumentTypeInfo(doc.type)
  const typeLabelKey = typeInfo?.labelKey ?? 'documents.types.other'
  const typeIcon = typeInfo?.icon ?? <File className="h-5 w-5" />
  const typeGradient = typeInfo?.color ?? 'from-slate-500 to-slate-600'
  const isExpired = doc.expiryDate && new Date(doc.expiryDate).getTime() < Date.now()
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.fileUrl)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05 }}
      className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
        isExpired
          ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          : 'border-dark-200 bg-white hover:border-primary-300 dark:border-dark-700 dark:bg-dark-800'
      }`}
    >
      {/* Image Preview / Thumbnail */}
      {isImage ? (
        <button
          type="button"
          className="relative block h-40 w-full cursor-pointer overflow-hidden bg-dark-100 dark:bg-dark-700"
          onClick={() => onView(doc.fileUrl)}
        >
          <img
            src={doc.thumbnailUrl || doc.fileUrl}
            alt={doc.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <Eye className="h-8 w-8 text-white drop-shadow-lg" />
          </div>
          {/* Type Badge on image */}
          <div
            className={`absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-gradient-to-r ${typeGradient} px-2 py-1 font-semibold text-white text-xs shadow-lg`}
          >
            {typeIcon}
            <span className="max-w-[60px] truncate">{t(typeLabelKey)}</span>
          </div>
          {/* Expired Badge on image */}
          {isExpired && (
            <div className="absolute top-2 left-2 rounded-lg bg-red-600 px-2 py-1 font-bold text-white text-xs">
              {t('documents.expiredBadge')}
            </div>
          )}
        </button>
      ) : (
        <>
          {/* Type Badge for non-image files */}
          <div
            className={`absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-gradient-to-r ${typeGradient} px-2 py-1 font-semibold text-white text-xs shadow-lg sm:top-3 sm:right-3 sm:px-3 sm:text-sm`}
          >
            {typeIcon}
            <span className="max-w-[80px] truncate sm:max-w-none">{t(typeLabelKey)}</span>
          </div>

          {/* Expired Badge for non-image files */}
          {isExpired && (
            <div className="absolute top-3 left-3 rounded-lg bg-red-600 px-3 py-1 font-bold text-white text-xs">
              {t('documents.expiredBadge')}
            </div>
          )}
        </>
      )}

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Title */}
        <div>
          <h3 className="line-clamp-2 font-semibold text-dark-900 dark:text-dark-50">{doc.name}</h3>
        </div>

        {/* Dates */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 text-dark-600 dark:text-dark-400">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {t('documents.addedOn')} {format(new Date(doc.createdAt), 'dd.MM.yyyy')}
            </span>
          </div>
          {doc.expiryDate && (
            <div
              className={`flex items-center gap-2 ${
                isExpired ? 'text-red-600 dark:text-red-400' : 'text-dark-600 dark:text-dark-400'
              }`}
            >
              <Zap className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {t('documents.expiresOn')} {format(new Date(doc.expiryDate), 'dd.MM.yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {doc.notes && (
          <p className="line-clamp-2 text-dark-600 text-xs dark:text-dark-400">{doc.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={() => {
              if (isImage) {
                onView(doc.fileUrl)
              } else {
                window.open(doc.fileUrl, '_blank')
              }
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-2 font-semibold text-sm text-white transition-all hover:bg-primary-700 dark:hover:bg-primary-500"
          >
            <Eye className="h-4 w-4" />
            {t('documents.view')}
          </motion.button>
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={() => onEdit(doc)}
            className="rounded-lg bg-dark-100 p-2 text-dark-600 transition-all hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600"
            title={t('documents.edit')}
          >
            <Edit3 className="h-4 w-4" />
          </motion.button>
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={() => {
              if (doc.id) onDelete(doc.id)
            }}
            className="rounded-lg bg-red-100 p-2 text-red-600 transition-all hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
