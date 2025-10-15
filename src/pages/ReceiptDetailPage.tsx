import { format } from 'date-fns'
import { enUS, srLatn } from 'date-fns/locale'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  FileText,
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
import { formatCurrency, track } from '@/lib'
import { PageTransition } from '../components/common/PageTransition'

export default function ReceiptDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const locale = i18n.language === 'sr' ? srLatn : enUS
  const { scrollY } = useScroll()

  // Real-time database query
  const receipt = useReceipt(id ? Number(id) : undefined)
  const loading = !receipt && id !== undefined

  const handleDelete = async () => {
    if (!receipt || !window.confirm(t('receiptDetail.deleteConfirm'))) return

    try {
      await deleteReceipt(receipt.id!)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full"
        />
      </div>
    )
  }

  if (!receipt) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <FileText className="w-10 h-10 text-red-500" />
        </div>
        <p className="text-xl font-semibold text-dark-600 dark:text-dark-400">
          {t('receiptDetail.notFound')}
        </p>
      </motion.div>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl mx-auto">
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
            className="p-3 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 rounded-xl shadow-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-dark-900 dark:text-dark-50" />
          </motion.button>

          <div className="flex-1" />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/receipts/${id}/edit`)}
            className="p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/30 transition-colors"
          >
            <Edit className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/30 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
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
            className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex items-start gap-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-2xl"
              >
                <ReceiptIcon className="w-10 h-10 text-white" />
              </motion.div>

              <div className="flex-1">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl font-bold mb-2"
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
                    <Building2 className="w-4 h-4" />
                    <span>
                      {t('receiptDetail.pibLabel')}: {receipt.pib}
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
                <p className="text-sm text-white/70 mb-1">{t('receiptDetail.total')}</p>
                <p className="text-4xl font-bold">{formatCurrency(receipt.totalAmount)}</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Details Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-start gap-3"
            >
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                  {t('receiptDetail.date')}
                </p>
                <p className="font-semibold text-dark-900 dark:text-dark-50">
                  {format(receipt.date, 'dd.MM.yyyy', { locale })}
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
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                  <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
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
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                  <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                    {t('receiptDetail.category')}
                  </p>
                  <span className="inline-flex px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-semibold">
                    {t(`categories.${receipt.category}`)}
                  </span>
                </div>
              </motion.div>
            )}

            {receipt.vatAmount && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 }}
                className="flex items-start gap-3"
              >
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                    {t('receiptDetail.vat')}
                  </p>
                  <p className="font-semibold text-dark-900 dark:text-dark-50">
                    {receipt.vatAmount.toLocaleString()} RSD
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {receipt.qrLink && (
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={receipt.qrLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary-500/30"
            >
              <ExternalLink className="w-5 h-5" />
              {t('receiptDetail.openEReceiptButton')}
            </motion.a>
          )}
        </motion.div>

        {/* Items */}
        {receipt.items && receipt.items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
                {t('receiptDetail.itemsWithCount', { count: receipt.items.length })}
              </h3>
            </div>

            <div className="space-y-3">
              {receipt.items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + index * 0.05 }}
                  whileHover={{ x: 5, backgroundColor: 'rgba(0,0,0,0.02)' }}
                  className="flex items-center justify-between py-4 px-4 rounded-xl border border-dark-200 dark:border-dark-700 transition-all"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-dark-900 dark:text-dark-50 mb-1">
                      {item.name}
                    </p>
                    {item.quantity && item.price && (
                      <p className="text-sm text-dark-600 dark:text-dark-400">
                        {item.quantity}x @ {item.price.toLocaleString()} RSD
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {item.total?.toLocaleString()} RSD
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Add as Device */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link to={`/warranties/add?receiptId=${id}`} className="block">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/10 dark:to-blue-900/10 p-6 border-2 border-dashed border-primary-300 dark:border-primary-700 hover:border-primary-500 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-500 rounded-xl shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-1">
                    {t('receiptDetail.addToWarranties')}
                  </h3>
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    {t('receiptDetail.addToWarrantiesDesc')}
                  </p>
                </div>
                <ArrowLeft className="w-5 h-5 text-primary-500 rotate-180" />
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
            className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
                {t('receiptDetail.notesTitle')}
              </h3>
            </div>
            <p className="text-dark-700 dark:text-dark-300 leading-relaxed">{receipt.notes}</p>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
