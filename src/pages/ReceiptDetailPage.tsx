import { track } from '@lib/analytics'
import { getCategoryLabel, type Locale } from '@lib/categories'
import { formatCurrency } from '@lib/utils'
import { format } from 'date-fns'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Package,
  Receipt as ReceiptIcon,
  ShoppingBag,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteReceipt, useReceipt } from '@/hooks/useDatabase'
import { PageTransition } from '../components/common/PageTransition'

export default function ReceiptDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const categoryLocale: Locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
  const { scrollY } = useScroll()

  const numericId = id !== undefined ? Number(id) : undefined
  const isInvalidId = id !== undefined && (numericId === undefined || Number.isNaN(numericId))

  // Real-time database query
  const receipt = useReceipt(isInvalidId ? undefined : numericId)

  const renderNotFound = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-16 text-center"
    >
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
        <FileText className="h-10 w-10 text-red-500" />
      </div>
      <p className="font-semibold text-dark-600 text-xl dark:text-dark-400">
        {t('receiptDetail.notFound')}
      </p>
    </motion.div>
  )

  const handleDelete = async () => {
    if (!receipt || !window.confirm(t('receiptDetail.deleteConfirm'))) return

    try {
      if (!receipt.id) {
        toast.error(t('common.error'))
        return
      }

      await deleteReceipt(receipt.id)
      track('receipt_delete', { receiptId: receipt.id })
      toast.success(t('receiptDetail.deleteSuccess'))
      navigate('/receipts')
    } catch (error) {
      toast.error(t('common.error'))
      console.error('Delete error:', error)
    }
  }

  // Track receipt view on mount
  useEffect(() => {
    if (receipt?.id) {
      track('receipt_view', { receiptId: receipt.id })
    }
  }, [receipt?.id])

  // Parallax effects
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const heroY = useTransform(scrollY, [0, 200], [0, -50])

  if (!isInvalidId && numericId !== undefined && receipt === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-primary-500/30 border-t-primary-500"
          role="progressbar"
          aria-label={t('common.loading') as string}
        />
      </div>
    )
  }

  if (isInvalidId || receipt === null) {
    return renderNotFound()
  }

  if (!receipt) {
    return renderNotFound()
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Floating Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            type="button"
            aria-label={t('common.back') as string}
            className="rounded-xl bg-white p-3 shadow-lg transition-colors hover:bg-dark-50 dark:bg-dark-800 dark:hover:bg-dark-700"
          >
            <ArrowLeft className="h-6 w-6 text-dark-900 dark:text-dark-50" />
          </motion.button>

          <div className="flex-1" />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/receipts/${id}/edit`)}
            type="button"
            aria-label={t('common.edit') as string}
            className="rounded-xl bg-primary-500 p-3 text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-600"
          >
            <Edit className="h-5 w-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            type="button"
            aria-label={t('common.delete') as string}
            className="rounded-xl bg-red-500 p-3 text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-600"
          >
            <Trash2 className="h-5 w-5" />
          </motion.button>
        </motion.div>

        {/* Hero Card */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-400 p-8 text-white shadow-2xl"
        >
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>

          {/* Floating orb */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            className="-top-10 -right-10 absolute h-40 w-40 rounded-full bg-white blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex items-start gap-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-2xl backdrop-blur-sm"
              >
                <ReceiptIcon className="h-10 w-10 text-white" />
              </motion.div>

              <div className="min-w-0 flex-1">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-2 truncate font-bold text-3xl"
                >
                  {receipt.merchantName}
                </motion.h1>
                {receipt.pib && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 text-white/80"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>
                      {t('receiptDetail.pib')}: {receipt.pib}
                    </span>
                  </motion.div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-right"
              >
                <p className="mb-1 text-sm text-white/70">{t('receiptDetail.total')}</p>
                <p className="font-bold text-4xl">{formatCurrency(receipt.totalAmount)}</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Details Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-start gap-3"
            >
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                  {t('receiptDetail.date')}
                </p>
                <p className="font-semibold text-dark-900 dark:text-dark-50">
                  {format(receipt.date, 'dd.MM.yyyy')}
                </p>
              </div>
            </motion.div>

            {receipt.time && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="flex items-start gap-3"
              >
                <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                  <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                    {t('receiptDetail.time')}
                  </p>
                  <p className="font-semibold text-dark-900 dark:text-dark-50">{receipt.time}</p>
                </div>
              </motion.div>
            )}

            {receipt.category && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-start gap-3"
              >
                <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                  <Tag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                    {t('receiptDetail.category')}
                  </p>
                  <span className="inline-flex rounded-lg bg-primary-100 px-3 py-1 font-semibold text-primary-600 text-sm dark:bg-primary-900/20 dark:text-primary-400">
                    {getCategoryLabel(receipt.category, categoryLocale)}
                  </span>
                </div>
              </motion.div>
            )}

            {typeof receipt.vatAmount === 'number' && !Number.isNaN(receipt.vatAmount) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 }}
                className="flex items-start gap-3"
              >
                <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                  <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                    {t('receiptDetail.vat')}
                  </p>
                  <p className="font-semibold text-dark-900 dark:text-dark-50">
                    {formatCurrency(receipt.vatAmount)}
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Attachments / Links */}
          {(receipt.qrLink || receipt.imageUrl || receipt.pdfUrl) && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {receipt.qrLink && (
                <motion.a
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={receipt.qrLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-primary-500 px-6 py-4 font-semibold text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-600"
                >
                  <ExternalLink className="h-5 w-5" />
                  {t('receiptDetail.openEReceipt')}
                </motion.a>
              )}

              {receipt.imageUrl && (
                <motion.a
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={receipt.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-dark-200 bg-white px-6 py-4 font-semibold text-dark-900 transition-colors hover:bg-dark-50 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50 dark:hover:bg-dark-600"
                  aria-label="Open receipt image"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="sr-only">Open image</span>
                  <span aria-hidden>Image</span>
                </motion.a>
              )}

              {receipt.pdfUrl && (
                <motion.a
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={receipt.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-dark-200 bg-white px-6 py-4 font-semibold text-dark-900 transition-colors hover:bg-dark-50 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50 dark:hover:bg-dark-600"
                  aria-label="Open receipt PDF"
                >
                  <FileText className="h-5 w-5" />
                  <span className="sr-only">Open PDF</span>
                  <span aria-hidden>PDF</span>
                </motion.a>
              )}
            </div>
          )}
        </motion.div>

        {/* Items */}
        {Array.isArray(receipt.items) && receipt.items.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <ShoppingBag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
                {t('receiptDetail.itemsWithCount', { count: receipt.items.length })}
              </h3>
            </div>

            <div className="space-y-3">
              {receipt.items.map((item, itemIndex) => (
                <motion.div
                  key={`${item.name}-${item.total}-${item.price}-${item.quantity}-${itemIndex}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + itemIndex * 0.05 }}
                  whileHover={{ x: 5, backgroundColor: 'rgba(0,0,0,0.02)' }}
                  className="flex items-center justify-between rounded-xl border border-dark-200 px-4 py-4 transition-all dark:border-dark-700"
                >
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate font-semibold text-dark-900 dark:text-dark-50">
                      {item.name}
                    </p>
                    {typeof item.quantity === 'number' && typeof item.price === 'number' && (
                      <p className="text-dark-600 text-sm dark:text-dark-400">
                        {item.quantity}× @ {formatCurrency(item.price)}
                      </p>
                    )}
                  </div>
                  <p className="ml-3 flex-shrink-0 font-bold text-lg text-primary-600 dark:text-primary-400">
                    {typeof item.total === 'number' ? formatCurrency(item.total) : '—'}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <ShoppingBag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-dark-900 text-lg dark:text-dark-50">
                {t('receiptDetail.items')}
              </h3>
            </div>
            <p className="text-dark-600 dark:text-dark-400">{t('receiptDetail.emptyItems')}</p>
          </motion.div>
        )}

        {/* Add as Device */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link
            to={`/warranties/add?receiptId=${id}`}
            className="block"
            aria-label={t('receiptDetail.addAsDevice') as string}
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-2xl border-2 border-primary-300 border-dashed bg-gradient-to-br from-primary-50 to-blue-50 p-6 transition-colors hover:border-primary-500 dark:border-primary-700 dark:from-primary-900/10 dark:to-blue-900/10"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary-500 p-3 shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-dark-900 text-lg dark:text-dark-50">
                    {t('receiptDetail.addToWarranties')}
                  </h3>
                  <p className="text-dark-600 text-sm dark:text-dark-400">
                    {t('receiptDetail.addToWarrantiesDesc')}
                  </p>
                </div>
                <ArrowLeft className="h-5 w-5 rotate-180 text-primary-500" />
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Notes */}
        {receipt.notes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
                {t('receiptDetail.notesTitle')}
              </h3>
            </div>
            <p className="whitespace-pre-wrap text-dark-700 leading-relaxed dark:text-dark-300">
              {receipt.notes}
            </p>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
