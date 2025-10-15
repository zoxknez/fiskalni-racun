import { format } from 'date-fns'
import { enUS, srLatn } from 'date-fns/locale'
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
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteDevice, useDevice } from '@/hooks/useDatabase'
import { useWarrantyStatus } from '@/hooks/useWarrantyStatus'
import { cancelDeviceReminders } from '@/lib'
import { getCategoryLabel, type Locale } from '@lib/categories'
import { PageTransition } from '../components/common/PageTransition'

export default function WarrantyDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const locale = i18n.language === 'sr' ? srLatn : enUS
  const { scrollY } = useScroll()

  // Real-time database queries
  const device = useDevice(id ? Number(id) : undefined)
  const loading = !device && id !== undefined

  // Warranty status with UI metadata (only if device exists)
  const warrantyStatus = device ? useWarrantyStatus(device) : null

  const handleDelete = async () => {
    if (!device || !window.confirm(t('common.deleteConfirm'))) return

    try {
      // Cancel all scheduled reminders
      await cancelDeviceReminders(device.id!)

      // Delete device
      await deleteDevice(device.id!)

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
            onClick={() => navigate(`/warranties/${id}/edit`)}
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
                <Shield className="w-10 h-10 text-white" />
              </motion.div>

              <div className="flex-1">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl font-bold mb-2"
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

              {warrantyStatus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl flex items-center gap-2"
                >
                  <warrantyStatus.icon className="w-5 h-5 text-white" />
                  <span className="font-semibold">{warrantyStatus.label}</span>
                </motion.div>
              )}
            </div>

            {/* Remaining Days Card */}
            {warrantyStatus &&
              warrantyStatus.daysRemaining !== null &&
              warrantyStatus.daysRemaining >= 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-5 bg-white/10 backdrop-blur-sm rounded-2xl"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <Clock className="w-6 h-6 text-white" />
                    <div className="flex-1">
                      <p className="text-white/70 text-sm">{t('common.remainingTime')}</p>
                      <p className="text-3xl font-bold">
                        {t('warrantyDetail.daysRemaining', { count: warrantyStatus.daysRemaining })}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(0, Math.min(100, (warrantyStatus.daysRemaining / (device.warrantyDuration * 30)) * 100))}%`,
                      }}
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
                  {format(device.purchaseDate, 'dd.MM.yyyy', { locale })}
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
                  {format(device.warrantyExpiry, 'dd.MM.yyyy', { locale })}
                </p>
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
                  {getCategoryLabel(device.category, i18n.language as Locale)}
                </span>
              </div>
            </motion.div>
          </div>
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
        {(device.serviceCenterName || device.serviceCenterAddress || device.serviceCenterPhone) && (
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
                  {t('warrantyDetail.callServiceButton')}
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
                  {t('warrantyDetail.openMapButton')}
                </motion.a>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
