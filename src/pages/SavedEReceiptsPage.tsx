/**
 * Saved E-Receipts Page
 *
 * Lists all saved e-receipt links from QR scanning.
 * Users can open, edit notes, or delete saved links.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { useToast } from '@/hooks/useToast'
import {
  ArrowLeft,
  Calendar,
  Check,
  Edit2,
  ExternalLink,
  FileText,
  QrCode,
  Trash2,
  X,
} from '@/lib/icons'
import {
  deleteEReceiptLink,
  getSavedEReceipts,
  type SavedEReceipt,
  updateEReceiptMerchant,
  updateEReceiptNotes,
} from '@/services/savedEReceiptsService'

function SavedEReceiptsPageComponent() {
  const { t, i18n } = useTranslation()
  const navigate = useSmoothNavigate()
  const toast = useToast()

  const [receipts, setReceipts] = useState<SavedEReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editField, setEditField] = useState<'merchantName' | 'notes'>('merchantName')

  // Load saved receipts
  useEffect(() => {
    const loadReceipts = async () => {
      try {
        const data = await getSavedEReceipts()
        setReceipts(data)
      } catch (_error) {
        toast.error(t('savedEReceipts.loadError'))
      } finally {
        setLoading(false)
      }
    }
    loadReceipts()
  }, [t, toast])

  // Delete receipt
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteEReceiptLink(id)
        setReceipts((prev) => prev.filter((r) => r.id !== id))
        toast.success(t('savedEReceipts.deleted'))
      } catch {
        toast.error(t('savedEReceipts.deleteError'))
      }
    },
    [t, toast]
  )

  // Start editing
  const startEdit = useCallback((receipt: SavedEReceipt, field: 'merchantName' | 'notes') => {
    setEditingId(receipt.id ?? null)
    setEditField(field)
    setEditValue(field === 'merchantName' ? receipt.merchantName || '' : receipt.notes || '')
  }, [])

  // Save edit
  const saveEdit = useCallback(async () => {
    if (!editingId) return

    try {
      if (editField === 'merchantName') {
        await updateEReceiptMerchant(editingId, editValue)
      } else {
        await updateEReceiptNotes(editingId, editValue)
      }

      setReceipts((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, [editField]: editValue || undefined } : r))
      )
      setEditingId(null)
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }, [editingId, editField, editValue, t, toast])

  // Format date
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))

  // Extract domain from URL for display
  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  return (
    <PageTransition className="min-h-screen bg-dark-50 pb-24 dark:bg-dark-900">
      {/* Header */}
      <header className="safe-area-top sticky top-0 z-10 border-dark-200 border-b bg-white/80 backdrop-blur-lg dark:border-dark-700 dark:bg-dark-800/80">
        <div className="flex items-center justify-between p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-lg p-2 text-dark-600 transition-colors hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-700"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-dark-900 text-lg dark:text-white">
            {t('savedEReceipts.title')}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-2 rounded-lg bg-primary-500 p-2 text-white transition-colors hover:bg-primary-600"
            aria-label={t('qrScanner.title')}
          >
            <QrCode className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl p-4">
        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-4 dark:bg-dark-800">
                <div className="mb-2 h-5 w-32 rounded bg-dark-200 dark:bg-dark-600" />
                <div className="mb-3 h-4 w-full rounded bg-dark-200 dark:bg-dark-600" />
                <div className="h-3 w-24 rounded bg-dark-200 dark:bg-dark-600" />
              </div>
            ))}
          </div>
        ) : receipts.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-6 rounded-full bg-dark-100 p-6 dark:bg-dark-800">
              <QrCode className="h-12 w-12 text-dark-400" />
            </div>
            <h2 className="mb-2 font-semibold text-dark-900 text-xl dark:text-white">
              {t('savedEReceipts.empty')}
            </h2>
            <p className="mb-6 max-w-xs text-dark-500">{t('savedEReceipts.emptyDescription')}</p>
            <motion.button
              type="button"
              onClick={() => navigate('/scan')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 font-semibold text-white"
            >
              <QrCode className="h-5 w-5" />
              {t('qrScanner.title')}
            </motion.button>
          </motion.div>
        ) : (
          // List of saved receipts
          <div className="space-y-4">
            <p className="text-dark-500 text-sm">
              {t('savedEReceipts.count', { count: receipts.length })}
            </p>

            <AnimatePresence>
              {receipts.map((receipt, index) => (
                <motion.article
                  key={receipt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-dark-800"
                >
                  {/* Main content */}
                  <div className="p-4">
                    {/* Merchant name or domain */}
                    <div className="mb-2 flex items-start justify-between">
                      {editingId === receipt.id && editField === 'merchantName' ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder={t('savedEReceipts.merchantPlaceholder')}
                            className="flex-1 rounded-lg border border-dark-300 bg-transparent px-3 py-1 text-dark-900 dark:border-dark-600 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="rounded-lg bg-green-500 p-1.5 text-white"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg bg-dark-200 p-1.5 text-dark-600 dark:bg-dark-600 dark:text-dark-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-dark-900 dark:text-white">
                            {receipt.merchantName || extractDomain(receipt.url)}
                          </h3>
                          <button
                            type="button"
                            onClick={() => startEdit(receipt, 'merchantName')}
                            className="rounded-lg p-1.5 text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700"
                            aria-label={t('common.edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* URL */}
                    <p className="mb-2 truncate text-dark-500 text-sm">{receipt.url}</p>

                    {/* Notes */}
                    {editingId === receipt.id && editField === 'notes' ? (
                      <div className="mb-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder={t('savedEReceipts.notesPlaceholder')}
                          className="flex-1 rounded-lg border border-dark-300 bg-transparent px-3 py-1 text-dark-900 text-sm dark:border-dark-600 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="rounded-lg bg-green-500 p-1.5 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg bg-dark-200 p-1.5 text-dark-600 dark:bg-dark-600 dark:text-dark-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : receipt.notes ? (
                      <button
                        type="button"
                        onClick={() => startEdit(receipt, 'notes')}
                        className="mb-3 w-full cursor-pointer rounded-lg bg-dark-50 px-3 py-2 text-left text-dark-600 text-sm dark:bg-dark-700 dark:text-dark-300"
                      >
                        <FileText className="mr-2 inline h-4 w-4" />
                        {receipt.notes}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(receipt, 'notes')}
                        className="mb-3 text-dark-400 text-sm hover:text-primary-500"
                      >
                        + {t('savedEReceipts.addNote')}
                      </button>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1 text-dark-400 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDate(receipt.scannedAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex border-dark-100 border-t dark:border-dark-700">
                    <a
                      href={receipt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 py-3 text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('savedEReceipts.open')}
                    </a>
                    <button
                      type="button"
                      onClick={() => receipt.id && handleDelete(receipt.id)}
                      className="flex flex-1 items-center justify-center gap-2 py-3 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('common.delete')}
                    </button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </PageTransition>
  )
}

export const SavedEReceiptsPage = memo(SavedEReceiptsPageComponent)
export default SavedEReceiptsPage
