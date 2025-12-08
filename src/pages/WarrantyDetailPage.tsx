import { track } from '@lib/analytics'
import { getCategoryLabel, type Locale } from '@lib/categories'
import { cancelDeviceReminders } from '@lib/notifications'
import { cn } from '@lib/utils'
import { differenceInCalendarDays, format } from 'date-fns'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  MapPin,
  Package,
  Paperclip,
  Phone,
  Share2,
  Shield,
  Tag,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AddToCalendarButton } from '@/components/warranties/AddToCalendarButton'
import { deleteDevice, useDevice } from '@/hooks/useDatabase'
import { useScrollAnimations } from '@/hooks/useOptimizedScroll'
import { useWarrantyStatus } from '@/hooks/useWarrantyStatus'
import { logger } from '@/lib/logger'
import { shareWarranty } from '@/services/shareService'
import { PageTransition } from '../components/common/PageTransition'

function WarrantyDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [isSharing, setIsSharing] = useState(false)

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)

  // Map i18n language to categories locale reliably
  const categoryLocale: Locale = (i18n.language === 'sr' ? 'sr-Latn' : 'en') as Locale

  // ⚠️ MEMORY OPTIMIZED: Using useScrollAnimations prevents memory leaks in E2E tests
  const { heroOpacity, heroY } = useScrollAnimations()

  // Real-time database queries
  const device = useDevice(id)
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

  const handleDelete = useCallback(async () => {
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
      logger.error('Delete error:', error)
    }
  }, [device?.id, t, navigate])

  const handleCallService = useCallback(() => {
    if (device?.serviceCenterPhone) {
      window.location.href = `tel:${device.serviceCenterPhone}`
    }
  }, [device?.serviceCenterPhone])

  const handleShare = useCallback(async () => {
    if (!device) return

    setIsSharing(true)
    try {
      const locale = i18n.language === 'sr' ? 'sr' : 'en'
      const success = await shareWarranty(device, locale as 'sr' | 'en')

      if (success) {
        track('warranty_shared', { deviceId: device.id })
        toast.success(t('share.success'))
      }
    } catch (error) {
      logger.error('Share error:', error)
      toast.error(t('share.error'))
    } finally {
      setIsSharing(false)
    }
  }, [device, t, i18n.language])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={prefersReducedMotion ? {} : { rotate: 360 }}
          transition={
            prefersReducedMotion
              ? {}
              : { duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }
          }
          className="h-12 w-12 rounded-full border-4 border-primary-500/30 border-t-primary-500"
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
        className="py-16 text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
          <Shield className="h-10 w-10 text-red-500" />
        </div>
        <p className="font-semibold text-dark-600 text-xl dark:text-dark-400">
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
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Floating Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.1, x: -5 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="rounded-xl bg-white p-3 shadow-lg transition-colors hover:bg-dark-50 dark:bg-dark-800 dark:hover:bg-dark-700"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-6 w-6 text-dark-900 dark:text-dark-50" />
          </motion.button>

          <div className="flex-1" />

          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={handleShare}
            disabled={isSharing}
            className="rounded-xl bg-blue-500 p-3 text-white shadow-blue-500/30 shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('share.title')}
          >
            {isSharing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
              />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
          </motion.button>

          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={() => navigate(`/warranties/${id}/edit`)}
            className="rounded-xl bg-primary-500 p-3 text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-600"
            aria-label={t('editDevice.title')}
          >
            <Edit className="h-5 w-5" />
          </motion.button>

          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={handleDelete}
            className="rounded-xl bg-red-500 p-3 text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-600"
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-5 w-5" />
          </motion.button>
        </motion.div>

        {/* Hero Card */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-500 p-8 text-white shadow-2xl"
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
            animate={
              prefersReducedMotion
                ? {}
                : {
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }
            }
            transition={
              prefersReducedMotion ? {} : { duration: 4, repeat: Number.POSITIVE_INFINITY }
            }
            className="-top-10 -right-10 absolute h-40 w-40 rounded-full bg-white blur-2xl"
          />

          <div className="relative z-10">
            <div className="flex items-start gap-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-2xl backdrop-blur-sm"
              >
                <Shield className="h-10 w-10 text-white" />
              </motion.div>

              <div className="min-w-0 flex-1">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-2 truncate font-bold text-3xl"
                >
                  {device.brand} {device.model}
                </motion.h1>
                {device.serialNumber && (
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 text-white/80"
                  >
                    <Package className="h-4 w-4" />
                    SN: {device.serialNumber}
                  </motion.p>
                )}
              </div>

              {warrantyStatus && statusBadgeLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm"
                >
                  <warrantyStatus.icon className="h-5 w-5 text-white" />
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
                className="mt-6 rounded-2xl bg-white/10 p-5 backdrop-blur-sm"
              >
                <div className="mb-3 flex items-center gap-4">
                  <Clock className="h-6 w-6 text-white" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/70">{t('deviceCard.remaining')}</p>
                    <p className="truncate font-bold text-3xl">
                      {t('warrantyDetail.daysRemaining', { count: remainingDays })}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 overflow-hidden rounded-full bg-white/20" aria-hidden>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full rounded-full bg-white"
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
          className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="flex items-start gap-3"
            >
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
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
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
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
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                  {t('warrantyDetail.warrantyExpires')}
                </p>
                <p className="font-semibold text-dark-900 dark:text-dark-50">
                  {format(device.warrantyExpiry, 'dd.MM.yyyy')}
                </p>
                {warrantyStatus && statusBadgeLabel && (
                  <span
                    className={cn(
                      'mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-1 font-semibold text-sm',
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
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <Tag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                  {t('warrantyDetail.category')}
                </p>
                <span className="inline-flex rounded-lg bg-primary-100 px-3 py-1 font-semibold text-primary-600 text-sm capitalize dark:bg-primary-900/20 dark:text-primary-400">
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
                className="inline-flex items-center gap-2 rounded-xl bg-dark-50 px-4 py-2 transition-colors hover:bg-dark-100 dark:bg-dark-700 dark:hover:bg-dark-600"
              >
                <FileText className="h-4 w-4" />
                <span>{t('warrantyDetail.receipt')}</span>
              </Link>
            </div>
          )}

          {/* Add to Calendar */}
          <div className="mt-6 border-dark-100 border-t pt-6 dark:border-dark-700">
            <AddToCalendarButton device={device} />
          </div>
        </motion.div>

        {/* Warranty Terms */}
        {device.warrantyTerms && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
                {t('warrantyDetail.warrantyTerms')}
              </h3>
            </div>
            <p className="whitespace-pre-wrap text-dark-700 leading-relaxed dark:text-dark-300">
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
            className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
                {t('warrantyDetail.authorizedService')}
              </h3>
            </div>

            <div className="mb-6 space-y-4">
              {device.serviceCenterName && (
                <div>
                  <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                    {t('warrantyDetail.serviceName')}
                  </p>
                  <p className="font-semibold text-dark-900 text-lg dark:text-dark-50">
                    {device.serviceCenterName}
                  </p>
                </div>
              )}

              {device.serviceCenterAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary-500" />
                  <div className="flex-1">
                    <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
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
                  <Phone className="h-5 w-5 text-primary-500" />
                  <div className="flex-1">
                    <p className="mb-1 text-dark-600 text-sm dark:text-dark-400">
                      {t('warrantyDetail.servicePhone')}
                    </p>
                    <p className="font-medium text-dark-900 dark:text-dark-50">
                      {device.serviceCenterPhone}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {device.serviceCenterPhone && (
                <motion.button
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  onClick={handleCallService}
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-primary-500 px-6 py-4 font-semibold text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-600"
                >
                  <Phone className="h-5 w-5" />
                  {t('warrantyDetail.callService')}
                </motion.button>
              )}
              {device.serviceCenterAddress && (
                <motion.a
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  href={`https://maps.google.com/?q=${encodeURIComponent(device.serviceCenterAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-dark-200 bg-white px-6 py-4 font-semibold text-dark-900 shadow-lg transition-colors hover:bg-dark-50 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50 dark:hover:bg-dark-600"
                >
                  <MapPin className="h-5 w-5" />
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
            className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
                <Paperclip className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
                {t('warrantyDetail.attachments')}
              </h3>
            </div>

            <ul className="space-y-2">
              {device.attachments?.map((url) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url)
                return (
                  <li key={url} className="flex items-center justify-between gap-3">
                    {isImage ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxUrl(url)
                          setLightboxZoom(1)
                        }}
                        className="flex items-center gap-2 break-all text-primary-600 hover:underline dark:text-primary-400"
                      >
                        <Eye className="h-4 w-4" />
                        <span>{url.split('/').pop()}</span>
                      </button>
                    ) : (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 break-all text-primary-600 hover:underline dark:text-primary-400"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>{url.split('/').pop()}</span>
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxUrl(null)}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label={t('common.close') as string}
            >
              <X className="h-6 w-6" />
            </button>

            {/* Zoom controls */}
            <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-10 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxZoom((z) => Math.max(0.5, z - 0.25))
                }}
                disabled={lightboxZoom <= 0.5}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="min-w-[4rem] text-center text-white">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxZoom((z) => Math.min(3, z + 0.25))
                }}
                disabled={lightboxZoom >= 3}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            {/* Image */}
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: lightboxZoom, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxUrl}
              alt={t('warrantyDetail.attachments') as string}
              className="max-h-[85vh] max-w-[90vw] cursor-zoom-in rounded-lg object-contain"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxZoom((z) => (z >= 2 ? 1 : z + 0.5))
              }}
              style={{ transform: `scale(${lightboxZoom})` }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

export default WarrantyDetailPage
