import { zodResolver } from '@hookform/resolvers/zod'
import { track } from '@lib/analytics'
import { deviceCategoryOptions } from '@lib/categories'
import { addDevice } from '@lib/db'
import { scheduleWarrantyReminders, type WarrantyReminderDevice } from '@lib/notifications'
import { type DeviceFormValues, deviceSchema } from '@lib/validation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Plus, Save, Shield } from 'lucide-react'
import { useEffect, useId, useMemo } from 'react'
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { logger } from '@/lib/logger'

export default function AddDevicePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const receiptId = searchParams.get('receiptId')

  // React Hook Form with Zod validation
  const defaultValues: Partial<DeviceFormValues> = {
    receiptId: receiptId ? Number(receiptId) : undefined,
    warrantyDuration: 24,
  }

  const idPrefix = useId()
  const fieldIds = {
    brand: `${idPrefix}-brand`,
    model: `${idPrefix}-model`,
    category: `${idPrefix}-category`,
    serialNumber: `${idPrefix}-serial-number`,
    purchaseDate: `${idPrefix}-purchase-date`,
    warrantyDuration: `${idPrefix}-warranty-duration`,
    warrantyTerms: `${idPrefix}-warranty-terms`,
    serviceCenterName: `${idPrefix}-service-center-name`,
    serviceCenterAddress: `${idPrefix}-service-center-address`,
    serviceCenterPhone: `${idPrefix}-service-center-phone`,
    serviceCenterHours: `${idPrefix}-service-center-hours`,
  }

  const resolver = zodResolver(deviceSchema) as Resolver<DeviceFormValues>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<DeviceFormValues>({
    resolver,
    defaultValues,
  })

  const purchaseDate = watch('purchaseDate')

  const CATEGORY_OPTIONS = useMemo(
    () => [
      { value: '', label: t('addDevice.selectCategory') as string },
      ...deviceCategoryOptions(i18n.language),
    ],
    [i18n.language, t]
  )

  useEffect(() => {
    if (!purchaseDate) {
      setValue('purchaseDate', new Date(), { shouldDirty: false })
    }
  }, [purchaseDate, setValue])

  // Watch warranty duration to calculate expiry date
  const warrantyDuration = watch('warrantyDuration')

  // Calculate warranty expiry
  const calculateExpiryDate = () => {
    if (!purchaseDate || !warrantyDuration) return null
    const expiry = new Date(purchaseDate)
    expiry.setMonth(expiry.getMonth() + warrantyDuration)
    return expiry
  }

  const expiryDate = calculateExpiryDate()

  // Form submission
  const onSubmit: SubmitHandler<DeviceFormValues> = async (data) => {
    try {
      track('device_create_from_receipt_start', {
        receiptId: data.receiptId,
        warrantyDuration: data.warrantyDuration,
      })

      // Add device to database (addDevice auto-calculates expiry, status, timestamps)
      const devicePayload: Parameters<typeof addDevice>[0] = {
        brand: data.brand,
        model: data.model,
        category: data.category,
        purchaseDate: data.purchaseDate,
        warrantyDuration: data.warrantyDuration,
        reminders: [],
      }

      if (data.receiptId !== undefined) {
        devicePayload.receiptId = data.receiptId
      }

      if (data.serialNumber) {
        devicePayload.serialNumber = data.serialNumber
      }

      if (data.warrantyTerms) {
        devicePayload.warrantyTerms = data.warrantyTerms
      }

      if (data.serviceCenterName) {
        devicePayload.serviceCenterName = data.serviceCenterName
      }

      if (data.serviceCenterAddress) {
        devicePayload.serviceCenterAddress = data.serviceCenterAddress
      }

      if (data.serviceCenterPhone) {
        devicePayload.serviceCenterPhone = data.serviceCenterPhone
      }

      if (data.serviceCenterHours) {
        devicePayload.serviceCenterHours = data.serviceCenterHours
      }

      const deviceId = await addDevice(devicePayload)

      // Schedule warranty reminders (30, 7, 1 days before expiry)
      if (deviceId) {
        // Calculate warranty expiry for reminders
        const warrantyExpiry = new Date(data.purchaseDate)
        warrantyExpiry.setMonth(warrantyExpiry.getMonth() + data.warrantyDuration)

        const device: WarrantyReminderDevice = {
          id: deviceId,
          brand: data.brand,
          model: data.model,
          warrantyExpiry,
          warrantyDuration: data.warrantyDuration,
        }
        scheduleWarrantyReminders(device)
      }

      track('device_create_from_receipt_success', {
        deviceId,
        warrantyDuration: data.warrantyDuration,
      })

      toast.success(t('warranties.deviceAdded'))
      navigate(`/warranties/${deviceId}`)
    } catch (error) {
      logger.error('Add device error:', error)
      track('device_create_from_receipt_fail', { error: String(error) })
      toast.error(t('common.error'))
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-6 pb-8">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-6 text-white shadow-2xl sm:p-8"
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
            className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
          />

          <div className="relative z-10">
            <div className="flex items-start gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl p-2 transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <Plus className="h-7 w-7" />
                  <h1 className="font-black text-3xl sm:text-4xl">{t('warranties.addDevice')}</h1>
                </div>
                <p className="text-sm text-white/80 sm:text-base">{t('addDevice.subtitle')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
              <Shield className="h-5 w-5" />
              {t('addDevice.basicInfo')}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Brand */}
              <div>
                <label
                  htmlFor={fieldIds.brand}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.brandRequired')}
                </label>
                <input
                  id={fieldIds.brand}
                  {...register('brand')}
                  type="text"
                  className={`input ${errors.brand ? 'border-red-500' : ''}`}
                  placeholder={t('addDevice.brandPlaceholder')}
                />
                {errors.brand && (
                  <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                    {errors.brand.message}
                  </p>
                )}
              </div>

              {/* Model */}
              <div>
                <label
                  htmlFor={fieldIds.model}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.modelRequired')}
                </label>
                <input
                  id={fieldIds.model}
                  {...register('model')}
                  type="text"
                  className={`input ${errors.model ? 'border-red-500' : ''}`}
                  placeholder={t('addDevice.modelPlaceholder')}
                />
                {errors.model && (
                  <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                    {errors.model.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Category */}
              <div>
                <label
                  htmlFor={fieldIds.category}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.categoryRequired')}
                </label>
                <select
                  id={fieldIds.category}
                  {...register('category')}
                  className={`input ${errors.category ? 'border-red-500' : ''}`}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* Serial Number */}
              <div>
                <label
                  htmlFor={fieldIds.serialNumber}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.serialNumber')}
                </label>
                <input
                  id={fieldIds.serialNumber}
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
            <h2 className="flex items-center gap-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
              <Calendar className="h-5 w-5" />
              {t('addDevice.warrantySection')}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Purchase Date */}
              <div>
                <label
                  htmlFor={fieldIds.purchaseDate}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.purchaseDateRequired')}
                </label>
                <input
                  id={fieldIds.purchaseDate}
                  {...register('purchaseDate', {
                    valueAsDate: true,
                  })}
                  type="date"
                  className={`input ${errors.purchaseDate ? 'border-red-500' : ''}`}
                />
                {errors.purchaseDate && (
                  <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                    {errors.purchaseDate.message}
                  </p>
                )}
              </div>

              {/* Warranty Duration */}
              <div>
                <label
                  htmlFor={fieldIds.warrantyDuration}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.warrantyDurationRequired')}
                </label>
                <input
                  id={fieldIds.warrantyDuration}
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
                  <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                    {errors.warrantyDuration.message}
                  </p>
                )}
              </div>
            </div>

            {/* Warranty Expiry Preview */}
            {expiryDate && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
                <p className="text-primary-700 text-sm dark:text-primary-300">
                  {t('addDevice.warrantyExpiresOn')}{' '}
                  <strong>{expiryDate.toLocaleDateString('sr-RS')}</strong>
                </p>
              </div>
            )}

            {/* Warranty Terms */}
            <div>
              <label
                htmlFor={fieldIds.warrantyTerms}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('addDevice.warrantyTerms')}
              </label>
              <textarea
                id={fieldIds.warrantyTerms}
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
            <h2 className="font-semibold text-dark-900 text-lg dark:text-dark-50">
              {t('addDevice.serviceCenter')}
            </h2>

            <div>
              <label
                htmlFor={fieldIds.serviceCenterName}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('addDevice.serviceName')}
              </label>
              <input
                id={fieldIds.serviceCenterName}
                {...register('serviceCenterName')}
                type="text"
                className="input"
                placeholder={t('addDevice.serviceNamePlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor={fieldIds.serviceCenterAddress}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('addDevice.serviceAddress')}
              </label>
              <input
                id={fieldIds.serviceCenterAddress}
                {...register('serviceCenterAddress')}
                type="text"
                className="input"
                placeholder={t('addDevice.serviceAddressPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor={fieldIds.serviceCenterPhone}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.servicePhone')}
                </label>
                <input
                  id={fieldIds.serviceCenterPhone}
                  {...register('serviceCenterPhone')}
                  type="tel"
                  className="input"
                  placeholder={t('addDevice.servicePhonePlaceholder')}
                />
              </div>

              <div>
                <label
                  htmlFor={fieldIds.serviceCenterHours}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addDevice.serviceHours')}
                </label>
                <input
                  id={fieldIds.serviceCenterHours}
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
              className="btn btn-primary flex flex-1 items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-white border-b-2" />
                  {t('addDevice.saving')}
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
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
