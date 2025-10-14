import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save, Calendar, Shield, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDevice, updateDevice } from '@/hooks/useDatabase'
import { deviceSchema, type DeviceFormValues } from '@lib/validation'
// updateDevice automatically handles reminder rescheduling

export default function EditDevicePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  
  // Load existing device data
  const device = useDevice(id ? Number(id) : undefined)
  const loading = !device && id !== undefined

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema) as any,
    defaultValues: device ? {
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
    } as any : undefined,
  })

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
    if (!device) return

    try {
      // Update device in database
      // updateDevice automatically calculates warrantyExpiry, status, and reschedules reminders
      await updateDevice(device.id!, {
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
      })

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Device not found
  if (!device) {
    return (
      <div className="empty-state">
        <p className="text-dark-600 dark:text-dark-400">
          {t('common.error')}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="btn-icon"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
            Izmeni uređaj
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
            Osnovne informacije
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Brend *
              </label>
              <input
                {...register('brand')}
                type="text"
                className={`input ${errors.brand ? 'border-red-500' : ''}`}
                placeholder="Samsung, LG, Apple..."
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
                Model *
              </label>
              <input
                {...register('model')}
                type="text"
                className={`input ${errors.model ? 'border-red-500' : ''}`}
                placeholder="Galaxy S24, iPhone 15..."
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
                Kategorija *
              </label>
              <select
                {...register('category')}
                className={`input ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Odaberi kategoriju</option>
                <option value="elektronika">Elektronika</option>
                <option value="kucni-aparati">Kućni aparati</option>
                <option value="automobil">Automobil</option>
                <option value="sport">Sport</option>
                <option value="ostalo">Ostalo</option>
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
                Serijski broj
              </label>
              <input
                {...register('serialNumber')}
                type="text"
                className="input"
                placeholder="SN123456789"
              />
            </div>
          </div>
        </div>

        {/* Warranty Info Section */}
        <div className="divider"></div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Garancija
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Datum kupovine *
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
                Trajanje garancije (meseci) *
              </label>
              <input
                {...register('warrantyDuration', {
                  valueAsNumber: true,
                })}
                type="number"
                min="0"
                max="120"
                className={`input ${errors.warrantyDuration ? 'border-red-500' : ''}`}
                placeholder="24"
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
                ⏰ Garancija ističe: <strong>{expiryDate.toLocaleDateString('sr-RS')}</strong>
              </p>
            </div>
          )}

          {/* Warranty Duration Changed Warning */}
          {device && warrantyDuration !== device.warrantyDuration && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ Trajanje garancije je promenjeno. Podsetnici će biti automatski ažurirani.
              </p>
            </div>
          )}

          {/* Warranty Terms */}
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              Uslovi garancije
            </label>
            <textarea
              {...register('warrantyTerms')}
              className="input"
              rows={3}
              placeholder="Opis uslova garancije..."
            />
          </div>
        </div>

        {/* Service Center Section */}
        <div className="divider"></div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Servisni centar (opciono)
          </h2>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              Naziv
            </label>
            <input
              {...register('serviceCenterName')}
              type="text"
              className="input"
              placeholder="Samsung ovlašćeni servis"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              Adresa
            </label>
            <input
              {...register('serviceCenterAddress')}
              type="text"
              className="input"
              placeholder="Knez Mihailova 42, Beograd"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Telefon
              </label>
              <input
                {...register('serviceCenterPhone')}
                type="tel"
                className="input"
                placeholder="011 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Radno vreme
              </label>
              <input
                {...register('serviceCenterHours')}
                type="text"
                className="input"
                placeholder="Pon-Pet 9-17h"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary flex-1"
          >
            Otkaži
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Čuvanje...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Sačuvaj izmene
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
