import { zodResolver } from '@hookform/resolvers/zod'
import { type DeviceFormValues, deviceSchema } from '@lib/validation'
import { ArrowLeft, Bell, Calendar, Loader2, Save, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { updateDevice, useDevice } from '@/hooks/useDatabase'
// updateDevice automatically handles reminder rescheduling

export default function EditDevicePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()

  // Load existing device data
  const device = useDevice(id ? Number(id) : undefined)
  const loading = !device && id !== undefined

  // Reminder notification settings (in days before expiry)
  const [reminderDays, setReminderDays] = useState<number[]>([30, 7, 1])

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema) as any,
  })

  // Populate form when device loads
  useEffect(() => {
    if (device) {
      reset({
        receiptId: device.receiptId,
        brand: device.brand,
        model: device.model,
        category: device.category,
        serialNumber: device.serialNumber || '',
        purchaseDate: new Date(device.purchaseDate).toISOString().split('T')[0],
        warrantyDuration: device.warrantyDuration,
        warrantyTerms: device.warrantyTerms || '',
        serviceCenterName: device.serviceCenterName || '',
        serviceCenterAddress: device.serviceCenterAddress || '',
        serviceCenterPhone: device.serviceCenterPhone || '',
        serviceCenterHours: device.serviceCenterHours || '',
      } as any)

      // Set existing reminder days
      if (device.reminders && device.reminders.length > 0) {
        const days = device.reminders.map((r) => r.daysBeforeExpiry).filter((d) => d > 0)
        if (days.length > 0) {
          setReminderDays(days.sort((a, b) => b - a))
        }
      }
    }
  }, [device, reset])

  // Watch warranty fields to calculate expiry date preview
  const warrantyDuration = watch('warrantyDuration')
  const purchaseDate = watch('purchaseDate')

  // Calculate warranty expiry preview
  const calculateExpiryDate = () => {
    if (!purchaseDate || !warrantyDuration) return null
    const expiry = new Date(purchaseDate)
    expiry.setMonth(expiry.getMonth() + warrantyDuration)
    return expiry
  }

  const expiryDate = calculateExpiryDate()

  // Form submission
  const onSubmit = async (data: DeviceFormValues) => {
    if (!device || !device.id) return

    try {
      // Update device in database with custom reminder days
      // updateDevice automatically calculates warrantyExpiry, status, and reschedules reminders
      await updateDevice(
        device.id,
        {
          receiptId: data.receiptId,
          brand: data.brand,
          model: data.model,
          category: data.category,
          serialNumber: data.serialNumber,
          purchaseDate: new Date(data.purchaseDate),
          warrantyDuration: data.warrantyDuration,
          warrantyTerms: data.warrantyTerms,
          serviceCenterName: data.serviceCenterName,
          serviceCenterAddress: data.serviceCenterAddress,
          serviceCenterPhone: data.serviceCenterPhone,
          serviceCenterHours: data.serviceCenterHours,
        },
        reminderDays
      )

      toast.success(t('common.success'))
      navigate(`/warranties/${device.id}`)
    } catch (error) {
      console.error('Update device error:', error)
      toast.error(t('common.error'))
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  // Device not found
  if (!device) {
    return (
      <div className="empty-state">
        <p className="text-dark-600 dark:text-dark-400">{t('common.error')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
            {t('editDevice.title')}
          </h1>
          <p className="text-dark-600 dark:text-dark-400 mt-1">
            {device.brand} {device.model}
          </p>
        </div>
      </div>

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
                  valueAsDate: false,
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

          {/* Warranty Duration Changed Warning */}
          {device && warrantyDuration !== device.warrantyDuration && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t('editDevice.warrantyChangedWarning')}
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

        {/* Reminder Notifications Section */}
        <div className="divider" />
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('addDevice.reminderNotifications')}
          </h2>

          <p className="text-sm text-dark-600 dark:text-dark-400">
            {t('addDevice.reminderDescription')}
          </p>

          <div className="space-y-3">
            {/* Predefined reminder options */}
            {[
              { days: 30, label: t('addDevice.reminder30days'), color: 'amber' },
              { days: 14, label: t('addDevice.reminder14days'), color: 'orange' },
              { days: 7, label: t('addDevice.reminder7days'), color: 'red' },
              { days: 3, label: t('addDevice.reminder3days'), color: 'red' },
              { days: 1, label: t('addDevice.reminder1day'), color: 'red' },
            ].map(({ days, label, color }) => (
              <label
                key={days}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={reminderDays.includes(days)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setReminderDays([...reminderDays, days].sort((a, b) => b - a))
                    } else {
                      setReminderDays(reminderDays.filter((d) => d !== days))
                    }
                  }}
                  className={`w-5 h-5 rounded border-2 border-${color}-500 text-${color}-600 focus:ring-${color}-500 focus:ring-offset-0 cursor-pointer`}
                />
                <div className="flex-1">
                  <span className="font-medium text-dark-900 dark:text-dark-50">{label}</span>
                  <p className="text-xs text-dark-500 dark:text-dark-500">
                    {t('addDevice.reminderBeforeExpiry', { count: days })}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {reminderDays.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ {t('addDevice.remindersEnabled', { count: reminderDays.length })}:{' '}
                <strong>{reminderDays.join(', ')} dana</strong>
              </p>
            </div>
          )}
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
            {t('editDevice.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('editDevice.saving')}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t('editDevice.saveChanges')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
