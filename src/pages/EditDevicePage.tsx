import { zodResolver } from '@hookform/resolvers/zod'
import { type DeviceFormValues, deviceSchema } from '@lib/validation'
import { ArrowLeft, Bell, Calendar, Loader2, Save, Shield } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { updateDevice, useDevice } from '@/hooks/useDatabase'

export default function EditDevicePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()

  const deviceId = useMemo(() => (id ? Number.parseInt(id, 10) : undefined), [id])

  // Load existing device data
  const device = useDevice(deviceId)
  const loading = !device && id !== undefined

  // Reminder notification settings (days before expiry)
  const [reminderDays, setReminderDays] = useState<number[]>([30, 7, 1])

  // RHF + Zod validation
  const resolver = zodResolver(deviceSchema) as Resolver<DeviceFormValues>
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<DeviceFormValues>({ resolver })

  const idPrefix = useId()
  const fieldIds = useMemo(
    () => ({
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
    }),
    [idPrefix]
  )

  // Helpers
  const toDateInput = useCallback((d: Date | string | undefined) => {
    if (!d) return ''
    const date = typeof d === 'string' ? new Date(d) : d
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const uniqueSortedDays = useCallback((days: number[]) => {
    return Array.from(new Set(days.filter((d) => Number.isFinite(d) && d > 0))).sort(
      (a, b) => b - a
    )
  }, [])

  // Populate form when device loads
  useEffect(() => {
    if (!device) return

    reset(
      deviceSchema.parse({
        receiptId: device.receiptId,
        brand: device.brand,
        model: device.model,
        category: device.category,
        serialNumber: device.serialNumber ?? '',
        purchaseDate: new Date(device.purchaseDate),
        warrantyDuration: device.warrantyDuration,
        warrantyTerms: device.warrantyTerms ?? '',
        serviceCenterName: device.serviceCenterName ?? '',
        serviceCenterAddress: device.serviceCenterAddress ?? '',
        serviceCenterPhone: device.serviceCenterPhone ?? '',
        serviceCenterHours: device.serviceCenterHours ?? '',
      })
    )

    // Existing reminders → days
    if (device.reminders?.length) {
      const days = device.reminders.map((r) => r.daysBeforeExpiry).filter((d) => d > 0)
      if (days.length) setReminderDays(uniqueSortedDays(days))
    }
  }, [device, reset, uniqueSortedDays])

  // Watch fields to compute expiry preview
  const warrantyDuration = watch('warrantyDuration')
  const purchaseDate = watch('purchaseDate')

  const expiryDate: Date | null = useMemo(() => {
    if (!purchaseDate || !warrantyDuration) return null
    const d = new Date(purchaseDate)
    d.setMonth(d.getMonth() + warrantyDuration)
    return d
  }, [purchaseDate, warrantyDuration])

  // Submit
  const onSubmit: SubmitHandler<DeviceFormValues> = async (data) => {
    if (!device || !device.id) return

    try {
      const updates: Parameters<typeof updateDevice>[1] = {
        brand: data.brand,
        model: data.model,
        category: data.category,
        purchaseDate: new Date(data.purchaseDate),
        warrantyDuration: Math.max(0, Math.floor(data.warrantyDuration)),
      }

      if (data.receiptId !== undefined) updates.receiptId = data.receiptId
      if (data.serialNumber !== undefined) updates.serialNumber = data.serialNumber
      if (data.warrantyTerms !== undefined) updates.warrantyTerms = data.warrantyTerms
      if (data.serviceCenterName !== undefined) updates.serviceCenterName = data.serviceCenterName
      if (data.serviceCenterAddress !== undefined)
        updates.serviceCenterAddress = data.serviceCenterAddress
      if (data.serviceCenterPhone !== undefined)
        updates.serviceCenterPhone = data.serviceCenterPhone
      if (data.serviceCenterHours !== undefined)
        updates.serviceCenterHours = data.serviceCenterHours

      await updateDevice(device.id, updates, uniqueSortedDays(reminderDays))

      toast.success(t('editDevice.success'))
      navigate(`/warranties/${device.id}`)
    } catch (error) {
      console.error('Update device error:', error)
      toast.error(t('common.error'))
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }

  // Not found
  if (!device) {
    return (
      <div className="empty-state" role="alert">
        <p className="text-dark-600 dark:text-dark-400">{t('warrantyDetail.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-icon"
          aria-label={t('common.back') || 'Back'}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-bold text-3xl text-dark-900 dark:text-dark-50">
            {t('editDevice.title')}
          </h1>
          <p className="mt-1 text-dark-600 dark:text-dark-400">
            {device.brand} {device.model}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6" noValidate>
        {/* Basic Info */}
        <fieldset className="space-y-4">
          <legend className="flex items-center gap-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
            <Shield className="h-5 w-5" />
            {t('addDevice.basicInfo')}
          </legend>

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
                placeholder={t('addDevice.brandPlaceholder') || ''}
                aria-invalid={!!errors.brand}
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
                placeholder={t('addDevice.modelPlaceholder') || ''}
                aria-invalid={!!errors.model}
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
                aria-invalid={!!errors.category}
              >
                <option value="">{t('addDevice.selectCategory')}</option>
                <option value="elektronika">{t('addDevice.electronics')}</option>
                <option value="kucni-aparati">{t('addDevice.homeAppliances')}</option>
                <option value="automobil">{t('addDevice.automobile')}</option>
                <option value="sport">{t('addDevice.sport')}</option>
                <option value="ostalo">{t('addDevice.other')}</option>
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
                placeholder={t('addDevice.serialNumberPlaceholder') || ''}
              />
            </div>
          </div>
        </fieldset>

        {/* Warranty */}
        <div className="divider" />
        <fieldset className="space-y-4">
          <legend className="flex items-center gap-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
            <Calendar className="h-5 w-5" />
            {t('addDevice.warrantySection')}
          </legend>

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
                {...register('purchaseDate', { valueAsDate: true })}
                type="date"
                className={`input ${errors.purchaseDate ? 'border-red-500' : ''}`}
                defaultValue={toDateInput(device.purchaseDate)}
                max={toDateInput(new Date())}
                aria-invalid={!!errors.purchaseDate}
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
                {...register('warrantyDuration', { valueAsNumber: true })}
                type="number"
                min={0}
                max={120}
                inputMode="numeric"
                pattern="[0-9]*"
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                className={`input ${errors.warrantyDuration ? 'border-red-500' : ''}`}
                placeholder={t('addDevice.warrantyDurationPlaceholder') || ''}
                aria-invalid={!!errors.warrantyDuration}
              />
              {errors.warrantyDuration && (
                <p className="mt-1 text-red-600 text-sm dark:text-red-400">
                  {errors.warrantyDuration.message}
                </p>
              )}
            </div>
          </div>

          {/* Expiry Preview */}
          {expiryDate && (
            <div
              className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20"
              aria-live="polite"
            >
              <p className="text-primary-700 text-sm dark:text-primary-300">
                {t('addDevice.warrantyExpiresOn')}{' '}
                <strong>{new Intl.DateTimeFormat(i18n.language).format(expiryDate)}</strong>
              </p>
            </div>
          )}

          {/* Warning if duration changed */}
          {device && warrantyDuration !== device.warrantyDuration && (
            <div
              className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
              role="alert"
            >
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t('editDevice.warrantyChangedWarning')}
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
              placeholder={t('addDevice.warrantyTermsPlaceholder') || ''}
            />
          </div>
        </fieldset>

        {/* Reminders */}
        <div className="divider" />
        <fieldset className="space-y-4">
          <legend className="flex items-center gap-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
            <Bell className="h-5 w-5" />
            {t('addDevice.reminderNotifications')}
          </legend>

          <p className="text-dark-600 text-sm dark:text-dark-400">
            {t('addDevice.reminderDescription')}
          </p>

          <div className="space-y-3">
            {(
              [
                {
                  days: 30,
                  label: t('addDevice.reminder30days'),
                  cls: 'border-amber-500 text-amber-600 focus:ring-amber-500',
                },
                {
                  days: 14,
                  label: t('addDevice.reminder14days'),
                  cls: 'border-orange-500 text-orange-600 focus:ring-orange-500',
                },
                {
                  days: 7,
                  label: t('addDevice.reminder7days'),
                  cls: 'border-red-500 text-red-600 focus:ring-red-500',
                },
                {
                  days: 3,
                  label: t('addDevice.reminder3days'),
                  cls: 'border-red-500 text-red-600 focus:ring-red-500',
                },
                {
                  days: 1,
                  label: t('addDevice.reminder1day'),
                  cls: 'border-red-500 text-red-600 focus:ring-red-500',
                },
              ] as const
            ).map(({ days, label, cls }) => {
              const checkboxId = `${idPrefix}-reminder-${days}`
              const checked = reminderDays.includes(days)
              return (
                <div
                  key={days}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-dark-50 dark:hover:bg-dark-700"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setReminderDays((prev) =>
                        e.target.checked
                          ? uniqueSortedDays([...prev, days])
                          : prev.filter((d) => d !== days)
                      )
                    }}
                    className={`h-5 w-5 rounded border-2 ${cls} cursor-pointer`}
                  />
                  <label htmlFor={checkboxId} className="flex-1 cursor-pointer">
                    <span className="font-medium text-dark-900 dark:text-dark-50">{label}</span>
                    <p className="text-dark-500 text-xs dark:text-dark-500">
                      {t('addDevice.reminderBeforeExpiry', { count: days })}
                    </p>
                  </label>
                </div>
              )
            })}
          </div>

          {reminderDays.length > 0 && (
            <div
              className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
              aria-live="polite"
            >
              <p className="text-green-700 text-sm dark:text-green-300">
                ✓ {t('addDevice.remindersEnabled', { count: reminderDays.length })}:{' '}
                <strong>
                  {reminderDays
                    .map((d) => t('addDevice.reminderBeforeExpiry', { count: d }))
                    .join(', ')}
                </strong>
              </p>
            </div>
          )}
        </fieldset>

        {/* Service Center */}
        <div className="divider" />
        <fieldset className="space-y-4">
          <legend className="font-semibold text-dark-900 text-lg dark:text-dark-50">
            {t('addDevice.serviceCenter')}
          </legend>

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
              placeholder={t('addDevice.serviceNamePlaceholder') || ''}
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
              placeholder={t('addDevice.serviceAddressPlaceholder') || ''}
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
                placeholder={t('addDevice.servicePhonePlaceholder') || ''}
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
                placeholder={t('addDevice.serviceHoursPlaceholder') || ''}
              />
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
            {t('editDevice.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary flex flex-1 items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('editDevice.saving')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('editDevice.saveChanges')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
