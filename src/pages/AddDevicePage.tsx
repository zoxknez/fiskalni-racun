import { zodResolver } from '@hookform/resolvers/zod'
import { track } from '@lib/analytics'
import { deviceCategoryOptions } from '@lib/categories'
import { addDevice } from '@lib/db'
import { scheduleWarrantyReminders, type WarrantyReminderDevice } from '@lib/notifications'
import { type DeviceFormValues, deviceSchema } from '@lib/validation'
import { motion, useReducedMotion } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import {
  FormActions,
  FormInput,
  FormRow,
  FormSection,
  FormSelect,
  FormTextarea,
} from '@/components/forms'
import { useHaptic } from '@/hooks/useHaptic'
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  Hash,
  MapPin,
  Phone,
  Plus,
  Shield,
  Smartphone,
  Tag,
} from '@/lib/icons'
import { logger } from '@/lib/logger'

function AddDevicePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [searchParams] = useSearchParams()
  const { notificationSuccess, notificationError, impactMedium } = useHaptic()
  const receiptId = searchParams.get('receiptId')

  // React Hook Form with Zod validation
  const defaultValues: Partial<DeviceFormValues> = {
    receiptId: receiptId || undefined,
    warrantyDuration: 24,
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
  const expiryDate = useMemo(() => {
    if (!purchaseDate || !warrantyDuration) return null
    const expiry = new Date(purchaseDate)
    expiry.setMonth(expiry.getMonth() + warrantyDuration)
    return expiry
  }, [purchaseDate, warrantyDuration])

  // Form submission
  const onSubmit: SubmitHandler<DeviceFormValues> = useCallback(
    async (data) => {
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
        notificationSuccess()
        navigate(`/warranties/${deviceId}`)
      } catch (error) {
        logger.error('Add device error:', error)
        track('device_create_from_receipt_fail', { error: String(error) })
        toast.error(t('common.error'))
        notificationError()
      }
    },
    [t, navigate, notificationSuccess, notificationError]
  )

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
            animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={
              prefersReducedMotion ? {} : { duration: 4, repeat: Number.POSITIVE_INFINITY }
            }
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Section */}
          <FormSection icon={Smartphone} title={t('addDevice.basicInfo')}>
            <FormRow>
              {/* Brand */}
              <div>
                <FormInput
                  label={t('addDevice.brandRequired')}
                  icon={Tag}
                  {...register('brand')}
                  placeholder={t('addDevice.brandPlaceholder')}
                  error={errors.brand?.message}
                  required
                />
              </div>

              {/* Model */}
              <div>
                <FormInput
                  label={t('addDevice.modelRequired')}
                  icon={Smartphone}
                  {...register('model')}
                  placeholder={t('addDevice.modelPlaceholder')}
                  error={errors.model?.message}
                  required
                />
              </div>
            </FormRow>

            <FormRow>
              {/* Category */}
              <div>
                <FormSelect
                  label={t('addDevice.categoryRequired')}
                  icon={Tag}
                  {...register('category')}
                  options={CATEGORY_OPTIONS}
                  error={errors.category?.message}
                  required
                />
              </div>

              {/* Serial Number */}
              <div>
                <FormInput
                  label={t('addDevice.serialNumber')}
                  icon={Hash}
                  {...register('serialNumber')}
                  placeholder={t('addDevice.serialNumberPlaceholder')}
                />
              </div>
            </FormRow>
          </FormSection>

          {/* Warranty Info Section */}
          <FormSection icon={Shield} title={t('addDevice.warrantySection')}>
            <FormRow>
              {/* Purchase Date */}
              <div>
                <FormInput
                  label={t('addDevice.purchaseDateRequired')}
                  icon={Calendar}
                  type="date"
                  {...register('purchaseDate', { valueAsDate: true })}
                  error={errors.purchaseDate?.message}
                  required
                />
              </div>

              {/* Warranty Duration */}
              <div>
                <FormInput
                  label={t('addDevice.warrantyDurationRequired')}
                  icon={Calendar}
                  type="number"
                  min="0"
                  max="120"
                  {...register('warrantyDuration', { valueAsNumber: true })}
                  placeholder={t('addDevice.warrantyDurationPlaceholder')}
                  error={errors.warrantyDuration?.message}
                  suffix={t('addDevice.months', { defaultValue: 'meseci' })}
                  required
                />
              </div>
            </FormRow>

            {/* Warranty Expiry Preview */}
            {expiryDate && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100/50 p-4 dark:border-primary-800/50 dark:from-primary-900/30 dark:to-primary-900/10"
              >
                <p className="flex items-center gap-2 font-medium text-primary-700 text-sm dark:text-primary-300">
                  <Shield className="h-4 w-4" />
                  {t('addDevice.warrantyExpiresOn')}{' '}
                  <strong>{expiryDate.toLocaleDateString('sr-RS')}</strong>
                </p>
              </motion.div>
            )}

            {/* Warranty Terms */}
            <FormTextarea
              label={t('addDevice.warrantyTerms')}
              {...register('warrantyTerms')}
              placeholder={t('addDevice.warrantyTermsPlaceholder')}
              rows={3}
            />
          </FormSection>

          {/* Service Center Section */}
          <FormSection icon={Building} title={t('addDevice.serviceCenter')} defaultCollapsed>
            <FormInput
              label={t('addDevice.serviceName')}
              icon={Building}
              {...register('serviceCenterName')}
              placeholder={t('addDevice.serviceNamePlaceholder')}
            />

            <FormInput
              label={t('addDevice.serviceAddress')}
              icon={MapPin}
              {...register('serviceCenterAddress')}
              placeholder={t('addDevice.serviceAddressPlaceholder')}
            />

            <FormRow>
              <div>
                <FormInput
                  label={t('addDevice.servicePhone')}
                  icon={Phone}
                  type="tel"
                  {...register('serviceCenterPhone')}
                  placeholder={t('addDevice.servicePhonePlaceholder')}
                />
              </div>

              <div>
                <FormInput
                  label={t('addDevice.serviceHours')}
                  icon={Clock}
                  {...register('serviceCenterHours')}
                  placeholder={t('addDevice.serviceHoursPlaceholder')}
                />
              </div>
            </FormRow>
          </FormSection>

          {/* Submit Buttons */}
          <FormActions
            submitLabel={isSubmitting ? t('addDevice.saving') : t('addDevice.saveDevice')}
            cancelLabel={t('addDevice.cancel')}
            onCancel={() => {
              navigate(-1)
              impactMedium()
            }}
            isSubmitting={isSubmitting}
          />
        </form>
      </div>
    </PageTransition>
  )
}

export default memo(AddDevicePage)
