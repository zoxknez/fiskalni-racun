import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Trash2,
  Shield,
  Phone,
  MapPin,
  Calendar,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { sr, enUS } from 'date-fns/locale'
import { useDevice, deleteDevice } from '@/hooks/useDatabase'
import { useWarrantyStatus } from '@/hooks/useWarrantyStatus'
import { cancelDeviceReminders } from '@/lib'
import toast from 'react-hot-toast'

export default function WarrantyDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const locale = i18n.language === 'sr' ? sr : enUS
  
  // Real-time database queries
  const device = useDevice(id ? Number(id) : undefined)
  const loading = !device && id !== undefined
  
  // Warranty status with UI metadata (only if device exists)
  const warrantyStatus = device ? useWarrantyStatus(device) : null

  const handleDelete = async () => {
    if (!device || !window.confirm(t('warrantyDetail.delete'))) return
    
    try {
      // Cancel all scheduled reminders
      await cancelDeviceReminders(device.id!)
      
      // Delete device
      await deleteDevice(device.id!)
      
      toast.success(t('common.success'))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50 flex-1">
          {t('warrantyDetail.title')}
        </h1>
        <button
          onClick={() => navigate(`/warranties/${id}/edit`)}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <Edit className="w-5 h-5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Device Info */}
      <div className="card">
        {warrantyStatus ? (
          <>
            <div className="flex items-start gap-4 mb-6">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: warrantyStatus!.color }}
              >
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
                      {device.brand}
                    </h2>
                    <p className="text-lg text-dark-600 dark:text-dark-400">
                      {device.model}
                    </p>
                  </div>
                  {/* Warranty Status Badge */}
                  <div 
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${warrantyStatus!.bgColor} border ${warrantyStatus!.borderColor}`}
                  >
                    <warrantyStatus.icon className={`w-4 h-4 ${warrantyStatus!.textColor}`} />
                    <span className={`text-sm font-medium ${warrantyStatus!.textColor}`}>
                      {warrantyStatus!.label}
                    </span>
                  </div>
                </div>
                {device.serialNumber && (
                  <p className="text-sm text-dark-600 dark:text-dark-400 mt-1">
                    SN: {device.serialNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Remaining Days Card (if active) */}
            {warrantyStatus!.daysRemaining !== null && warrantyStatus!.daysRemaining >= 0 && (
              <div className={`p-4 rounded-lg mb-6 ${warrantyStatus!.bgColor} border ${warrantyStatus!.borderColor}`}>
                <div className="flex items-center gap-3">
                  <Clock className={`w-6 h-6 ${warrantyStatus!.textColor}`} />
                  <div>
                    <p className={`text-sm ${warrantyStatus!.textColor} opacity-80`}>
                      Preostalo vreme
                    </p>
                    <p className={`text-2xl font-bold ${warrantyStatus!.textColor}`}>
                      {warrantyStatus!.daysRemaining} dana
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${warrantyStatus!.textColor.replace('text-', 'bg-')}`}
                    style={{ 
                      width: `${Math.max(0, Math.min(100, (warrantyStatus!.daysRemaining! / (device.warrantyDuration * 30)) * 100))}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : null}

        <div className="divider my-4"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-dark-400" />
              <p className="text-sm text-dark-600 dark:text-dark-400">
                {t('warrantyDetail.purchaseDate')}
              </p>
            </div>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {format(device.purchaseDate, 'dd.MM.yyyy', { locale })}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-dark-400" />
              <p className="text-sm text-dark-600 dark:text-dark-400">
                {t('warrantyDetail.warrantyDuration')}
              </p>
            </div>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {device.warrantyDuration} meseci
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-dark-400" />
              <p className="text-sm text-dark-600 dark:text-dark-400">
                {t('warrantyDetail.warrantyExpires')}
              </p>
            </div>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {format(device.warrantyExpiry, 'dd.MM.yyyy', { locale })}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-dark-400" />
              <p className="text-sm text-dark-600 dark:text-dark-400">
                Tip uređaja
              </p>
            </div>
            <span className="badge badge-info capitalize">
              {device.category}
            </span>
          </div>
        </div>

        {device.category && (
          <div className="mt-4">
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
              {t('warrantyDetail.category')}
            </p>
            <span className="badge badge-info">
              {t(`categories.${device.category}`)}
            </span>
          </div>
        )}
      </div>

      {/* Warranty Terms */}
      {device.warrantyTerms && (
        <div className="card">
          <h3 className="section-title">{t('warrantyDetail.warrantyTerms')}</h3>
          <p className="text-dark-700 dark:text-dark-300 whitespace-pre-wrap">
            {device.warrantyTerms}
          </p>
        </div>
      )}

      {/* Authorized Service */}
      {(device.serviceCenterName || device.serviceCenterAddress || device.serviceCenterPhone) && (
        <div className="card">
          <h3 className="section-title">{t('warrantyDetail.authorizedService')}</h3>
          
          <div className="space-y-4">
            {device.serviceCenterName && (
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                  {t('warrantyDetail.serviceName')}
                </p>
                <p className="font-medium text-dark-900 dark:text-dark-50">
                  {device.serviceCenterName}
                </p>
              </div>
            )}

            {device.serviceCenterAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-dark-400 shrink-0 mt-0.5" />
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
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-dark-400" />
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

            <div className="flex gap-3 pt-2">
              {device.serviceCenterPhone && (
                <button
                  onClick={handleCallService}
                  className="btn-primary flex items-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  {t('warrantyDetail.callService')}
                </button>
              )}
              {device.serviceCenterAddress && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(device.serviceCenterAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  {t('warrantyDetail.openMap')}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
