import { zodResolver } from '@hookform/resolvers/zod'
import { track } from '@lib/analytics'
import { addDevice } from '@lib/db'
import { scheduleWarrantyReminders } from '@lib/notifications'
import { type DeviceFormValues, deviceSchema } from '@lib/validation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Plus, Save, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'

export default function AddDevicePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const receiptId = searchParams.get('receiptId')

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema) as any, // Zod resolver with coerce.date() type workaround
    defaultValues: {
      receiptId: receiptId ? Number(receiptId) : undefined,
      warrantyDuration: 24, // Default 2 years
      purchaseDate: new Date().toISOString().split('T')[0], // Format for input[type=date]
    } as any,
  })

  // Watch warranty duration to calculate expiry date
  const warrantyDuration = watch('warrantyDuration')
  const purchaseDate = watch('purchaseDate')

  // Calculate warranty expiry
  const calculateExpiryDate = () => {
    if (!purchaseDate || !warrantyDuration) return null
    const expiry = new Date(purchaseDate)
    expiry.setMonth(expiry.getMonth() + warrantyDuration)
    return expiry
  }

  const expiryDate = calculateExpiryDate()

  // Form submission
  const onSubmit = async (data: DeviceFormValues) => {
    try {
      track('device_create_from_receipt_start', {
        receiptId: data.receiptId,
        warrantyDuration: data.warrantyDuration,
      })

      // Add device to database (addDevice auto-calculates expiry, status, timestamps)
      const deviceId = await addDevice({
        receiptId: data.receiptId,
        brand: data.brand,
        model: data.model,
        category: data.category,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate,
        warrantyDuration: data.warrantyDuration,
        warrantyTerms: data.warrantyTerms,
        serviceCenterName: data.serviceCenterName,
        serviceCenterAddress: data.serviceCenterAddress,
        serviceCenterPhone: data.serviceCenterPhone,
        serviceCenterHours: data.serviceCenterHours,
        reminders: [],
      })

      // Schedule warranty reminders (30, 7, 1 days before expiry)
      if (deviceId) {
        // Calculate warranty expiry for reminders
        const warrantyExpiry = new Date(data.purchaseDate)
        warrantyExpiry.setMonth(warrantyExpiry.getMonth() + data.warrantyDuration)

        const device = {
          id: deviceId as number,
          brand: data.brand,
          model: data.model,
          warrantyExpiry,
          warrantyDuration: data.warrantyDuration,
        }
        scheduleWarrantyReminders(device as any)
      }

      track('device_create_from_receipt_success', {
        deviceId,
        warrantyDuration: data.warrantyDuration,
      })

      toast.success(t('warranties.deviceAdded'))
      navigate(`/warranties/${deviceId}`)
    } catch (error) {
      console.error('Add device error:', error)
      track('device_create_from_receipt_fail', { error: String(error) })
      toast.error(t('common.error'))
    }
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-6 sm:p-8 text-white shadow-2xl"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
                backgroundSize: '100px 100px',
              }}
            />
          </div>

          {/* Floating Orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex items-start gap-3 sm:gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Plus className="w-7 h-7" />
                  <h1 className="text-3xl sm:text-4xl font-black">{t('warranties.addDevice')}</h1>
                </div>
                <p className="text-white/80 text-sm sm:text-base">{t('addDevice.subtitle')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('addDevice.basicInfo')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.brandRequired')}
                </label>
                <input
                  {...register('brand')}
                  type="text"
                  className={`input ${errors.brand ? 'border-red-500' : ''}`}
                  placeholder={t('addDevice.brandPlaceholder')}
                />
                {errors.brand && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.brand.message}
                  </p>
                )}
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.modelRequired')}
                </label>
                <input
                  {...register('model')}
                  type="text"
                  className={`input ${errors.model ? 'border-red-500' : ''}`}
                  placeholder={t('addDevice.modelPlaceholder')}
                />
                {errors.model && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.model.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.categoryRequired')}
                </label>
                <select
                  {...register('category')}
                  className={`input ${errors.category ? 'border-red-500' : ''}`}
                >
                  <option value="">{t('addDevice.selectCategory')}</option>
                  <option value="elektronika">{t('addDevice.electronics')}</option>
                  <option value="kucni-aparati">{t('addDevice.homeAppliances')}</option>
                  <option value="automobil">{t('addDevice.automobile')}</option>
                  <option value="sport">{t('addDevice.sport')}</option>
                  <option value="ostalo">{t('addDevice.other')}</option>
                </select>
                {errors.category && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.serialNumber')}
                </label>
                <input
                  {...register('serialNumber')}
                  type="text"
                  className="input"
                  placeholder={t('addDevice.serialNumberPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Warranty Info Section */}
          <div className="divider" />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('addDevice.warrantySection')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.purchaseDateRequired')}
                </label>
                <input
                  {...register('purchaseDate', {
                    valueAsDate: true,
                  })}
                  type="date"
                  className={`input ${errors.purchaseDate ? 'border-red-500' : ''}`}
                />
                {errors.purchaseDate && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.purchaseDate.message}
                  </p>
                )}
              </div>

              {/* Warranty Duration */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.warrantyDurationRequired')}
                </label>
                <input
                  {...register('warrantyDuration', {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min="0"
                  max="120"
                  className={`input ${errors.warrantyDuration ? 'border-red-500' : ''}`}
                  placeholder={t('addDevice.warrantyDurationPlaceholder')}
                />
                {errors.warrantyDuration && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.warrantyDuration.message}
                  </p>
                )}
              </div>
            </div>

            {/* Warranty Expiry Preview */}
            {expiryDate && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  {t('addDevice.warrantyExpiresOn')}{' '}
                  <strong>{expiryDate.toLocaleDateString('sr-RS')}</strong>
                </p>
              </div>
            )}

            {/* Warranty Terms */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('addDevice.warrantyTerms')}
              </label>
              <textarea
                {...register('warrantyTerms')}
                className="input"
                rows={3}
                placeholder={t('addDevice.warrantyTermsPlaceholder')}
              />
            </div>
          </div>

          {/* Service Center Section */}
          <div className="divider" />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
              {t('addDevice.serviceCenter')}
            </h2>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('addDevice.serviceName')}
              </label>
              <input
                {...register('serviceCenterName')}
                type="text"
                className="input"
                placeholder={t('addDevice.serviceNamePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('addDevice.serviceAddress')}
              </label>
              <input
                {...register('serviceCenterAddress')}
                type="text"
                className="input"
                placeholder={t('addDevice.serviceAddressPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.servicePhone')}
                </label>
                <input
                  {...register('serviceCenterPhone')}
                  type="tel"
                  className="input"
                  placeholder={t('addDevice.servicePhonePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addDevice.serviceHours')}
                </label>
                <input
                  {...register('serviceCenterHours')}
                  type="text"
                  className="input"
                  placeholder={t('addDevice.serviceHoursPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
              {t('addDevice.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  {t('addDevice.saving')}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('addDevice.saveDevice')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  )
}
