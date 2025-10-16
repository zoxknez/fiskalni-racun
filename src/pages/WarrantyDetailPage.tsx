import { getCategoryLabel, type Locale } from '@lib/categories'
import { differenceInCalendarDays, format } from 'date-fns'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  FileText,
  MapPin,
  Package,
  Phone,
  Shield,
  Tag,
  Trash2,
  Paperclip,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { deleteDevice, useDevice } from '@/hooks/useDatabase'
import { useWarrantyStatus } from '@/hooks/useWarrantyStatus'
import { cancelDeviceReminders, cn } from '@/lib'
import { PageTransition } from '../components/common/PageTransition'

export default function WarrantyDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  // Map i18n language to categories locale reliably
  const categoryLocale: Locale = (i18n.language === 'sr' ? 'sr-Latn' : 'en') as Locale

  const { scrollY } = useScroll()

  // Real-time database queries
  const device = useDevice(id ? Number(id) : undefined)
  const loading = !device && id !== undefined

  // Warranty status (hook safely handles undefined device)
  const warrantyStatus = useWarrantyStatus(device)
  const statusBadgeLabel: string | null = warrantyStatus
    ? (() => {
        if (warrantyStatus.type === 'active') return t('warrantyDetail.statusActive')
        if (warrantyStatus.type === 'expired') return t('warrantyDetail.statusExpired')
        if (warrantyStatus.type === 'in-service') return t('warrantyDetail.statusInService')

        const remaining = Math.max(0, warrantyStatus.daysRemaining)
        if (warrantyStatus.type === 'expiring-critical') {
          return t('warrantyDetail.statusExpiringCritical', { count: remaining })
        }
        return t('warrantyDetail.statusExpiringSoon', { count: remaining })
      })()
    : null

  const handleDelete = async () => {
    // Use existing translation key from receipt detail for confirm (present in both locales)
    const confirmed = window.confirm(t('receiptDetail.deleteConfirm'))
    if (!confirmed || !device?.id) return

    try {
      // Cancel all scheduled reminders (hooks also cascade, but this is explicit)
      await cancelDeviceReminders(device.id)

      // Delete device
      await deleteDevice(device.id)

      toast.success(t('warrantyDetail.deleteSuccess'))
      navigate('/warranties')
    } catch (error) {
      toast.error(t('common.error'))
      console.error('Delete error:', error)
    }
  }

  const handleCallService = () => {
    if (device?.serviceCenterPhone) {
      window.location.href = `tel:${device.serviceCenterPhone}`
    }
  }

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
          role="status"
          aria-label={t('common.loading')}
        />
      </div>
    )
  }

  if (!device) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <p className="text-xl font-semibold text-dark-600 dark:text-dark-400">
          {t('warrantyDetail.notFound')}
        </p>
      </motion.div>
    )
  }

  // Progress calculation: portion of warranty that has elapsed
  const totalWarrantyDays = Math.max(
    1,
    differenceInCalendarDays(device.warrantyExpiry, device.purchaseDate)
  )
  const remainingDays = warrantyStatus?.daysRemaining ?? null
  const progressPercent =
    remainingDays === null
      ? 100
      : Math.max(0, Math.min(100, ((totalWarrantyDays - remainingDays) / totalWarrantyDays) * 100))

  // Convenience helpers
  const hasServiceInfo =
    !!device.serviceCenterName || !!device.serviceCenterAddress || !!device.serviceCenterPhone

  const hasAttachments = Array.isArray(device.attachments) && device.attachments.length > 0

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
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-6 h-6 text-dark-900 dark:text-dark-50" />
          </motion.button>

          <div className="flex-1" />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/warranties/${id}/edit`)}
            className="p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/30 transition-colors"
            aria-label={t('editDevice.title')}
          >
            <Edit className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/30 transition-colors"
            aria-label={t('common.delete')}
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
                <Shield className="w-10 h-10 text-white" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl font-bold mb-2 truncate"
                >
                  {device.brand} {device.model}
                </motion.h1>
                {device.serialNumber && (
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/80 flex items-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    SN: {device.serialNumber}
                  </motion.p>
                )}
              </div>

              {warrantyStatus && statusBadgeLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl flex items-center gap-2"
                >
                  <warrantyStatus.icon className="w-5 h-5 text-white" />
                  <span className="font-semibold">{statusBadgeLabel}</span>
                </motion.div>
              )}
            </div>

            {/* Remaining Days Card */}
            {warrantyStatus && remainingDays !== null && remainingDays >= 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 p-5 bg-white/10 backdrop-blur-sm rounded-2xl"
              >
                <div className="flex items-center gap-4 mb-3">
                  <Clock className="w-6 h-6 text-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm">{t('deviceCard.remaining')}</p>
                    <p className="text-3xl font-bold truncate">
                      {t('warrantyDetail.daysRemaining', { count: remainingDays })}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-white/20 rounded-full overflow-hidden" aria-hidden>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Details Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="flex items-start gap-3"
            >
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                  {t('warrantyDetail.purchaseDate')}
                </p>
                <p className="font-semibold text-dark-900 dark:text-dark-50">
                  {format(device.purchaseDate, 'dd.MM.yyyy')}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-start gap-3"
            >
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                  {t('warrantyDetail.warrantyDuration')}
                </p>
                <p className="font-semibold text-dark-900 dark:text-dark-50">
                  {device.warrantyDuration} {t('warrantyDetail.months')}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
              className="flex items-start gap-3"
            >
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                  {t('warrantyDetail.warrantyExpires')}
                </p>
                <p className="font-semibold text-dark-900 dark:text-dark-50">
                  {format(device.warrantyExpiry, 'dd.MM.yyyy')}
                </p>
                {warrantyStatus && statusBadgeLabel && (
                  <span
                    className={cn(
                      'mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm font-semibold',
                      warrantyStatus.bgColor,
                      warrantyStatus.textColor,
                      warrantyStatus.borderColor
                    )}
                  >
                    <warrantyStatus.icon className="h-4 w-4" aria-hidden="true" />
                    {statusBadgeLabel}
                  </span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-start gap-3"
            >
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                  {t('warrantyDetail.category')}
                </p>
                <span className="inline-flex px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-semibold capitalize">
                  {getCategoryLabel(device.category, categoryLocale)}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Linked Receipt */}
          {device.receiptId !== undefined && (
            <div className="mt-6">
              <Link
                to={`/receipts/${device.receiptId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-50 dark:bg-dark-700 hover:bg-dark-100 dark:hover:bg-dark-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>{t('warrantyDetail.receipt')}</span>
              </Link>
            </div>
          )}
        </motion.div>

        {/* Warranty Terms */}
        {device.warrantyTerms && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
                {t('warrantyDetail.warrantyTerms')}
              </h3>
            </div>
            <p className="text-dark-700 dark:text-dark-300 leading-relaxed whitespace-pre-wrap">
              {device.warrantyTerms}
            </p>
          </motion.div>
        )}

        {/* Authorized Service */}
        {hasServiceInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
                {t('warrantyDetail.authorizedService')}
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              {device.serviceCenterName && (
                <div>
                  <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                    {t('warrantyDetail.serviceName')}
                  </p>
                  <p className="font-semibold text-dark-900 dark:text-dark-50 text-lg">
                    {device.serviceCenterName}
                  </p>
                </div>
              )}

              {device.serviceCenterAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary-500 shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                      {t('warrantyDetail.serviceAddress')}
                    </p>
                    <p className="font-medium text-dark-900 dark:text-dark-50">
                      {device.serviceCenterAddress}
                    </p>
                  </div>
                </div>
              )}

              {device.serviceCenterPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary-500" />
                  <div className="flex-1">
                    <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                      {t('warrantyDetail.servicePhone')}
                    </p>
                    <p className="font-medium text-dark-900 dark:text-dark-50">
                      {device.serviceCenterPhone}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {device.serviceCenterPhone && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCallService}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary-500/30"
                >
                  <Phone className="w-5 h-5" />
                  {t('warrantyDetail.callService')}
                </motion.button>
              )}
              {device.serviceCenterAddress && (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={`https://maps.google.com/?q=${encodeURIComponent(device.serviceCenterAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-dark-700 hover:bg-dark-50 dark:hover:bg-dark-600 text-dark-900 dark:text-dark-50 rounded-xl font-semibold transition-colors shadow-lg border-2 border-dark-200 dark:border-dark-600"
                >
                  <MapPin className="w-5 h-5" />
                  {t('warrantyDetail.openMap')}
                </motion.a>
              )}
            </div>
          </motion.div>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Paperclip className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
                {t('warrantyDetail.attachments')}
              </h3>
            </div>

            <ul className="space-y-2">
              {device.attachments!.map((url, idx) => (
                <li key={`${url}-${idx}`} className="flex items-center justify-between gap-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline break-all"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>{url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
