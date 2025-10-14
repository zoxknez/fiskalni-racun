import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  Edit, 
  Trash2,
  Shield,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { sr, enUS } from 'date-fns/locale'
import type { Device } from '@/types'
import toast from 'react-hot-toast'

export default function WarrantyDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const locale = i18n.language === 'sr' ? sr : enUS
  const [device, setDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDevice()
  }, [id])

  const loadDevice = async () => {
    // TODO: Load from Dexie DB
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(t('warrantyDetail.delete'))) return
    
    // TODO: Delete from DB
    toast.success(t('common.success'))
    navigate('/warranties')
  }

  const handleCallService = () => {
    if (device?.servicePhone) {
      window.location.href = `tel:${device.servicePhone}`
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
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
              {device.brand}
            </h2>
            <p className="text-lg text-dark-600 dark:text-dark-400">
              {device.model}
            </p>
            {device.serialNumber && (
              <p className="text-sm text-dark-600 dark:text-dark-400 mt-1">
                SN: {device.serialNumber}
              </p>
            )}
          </div>
        </div>

        <div className="divider my-4"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
              {t('warrantyDetail.purchaseDate')}
            </p>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {format(device.purchaseDate, 'dd.MM.yyyy', { locale })}
            </p>
          </div>
          <div>
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
              {t('warrantyDetail.warrantyDuration')}
            </p>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {device.warrantyDuration} {t('addDevice.warrantyDuration').split('(')[1]}
            </p>
          </div>
          <div>
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
              {t('warrantyDetail.warrantyExpires')}
            </p>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {format(device.warrantyExpires, 'dd.MM.yyyy', { locale })}
            </p>
          </div>
          <div>
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
              {t('warrantyDetail.warrantyStatus')}
            </p>
            {device.warrantyStatus === 'active' && (
              <span className="badge badge-success">{t('warranties.active')}</span>
            )}
            {device.warrantyStatus === 'expiring' && (
              <span className="badge badge-warning">
                {t('warranties.expiresIn')} {t('warranties.days')}
              </span>
            )}
            {device.warrantyStatus === 'expired' && (
              <span className="badge badge-danger">{t('warranties.expired')}</span>
            )}
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
      {(device.serviceName || device.serviceAddress || device.servicePhone) && (
        <div className="card">
          <h3 className="section-title">{t('warrantyDetail.authorizedService')}</h3>
          
          <div className="space-y-4">
            {device.serviceName && (
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                  {t('warrantyDetail.serviceName')}
                </p>
                <p className="font-medium text-dark-900 dark:text-dark-50">
                  {device.serviceName}
                </p>
              </div>
            )}

            {device.serviceAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-dark-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                    {t('warrantyDetail.serviceAddress')}
                  </p>
                  <p className="font-medium text-dark-900 dark:text-dark-50">
                    {device.serviceAddress}
                  </p>
                </div>
              </div>
            )}

            {device.servicePhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-dark-400" />
                <div className="flex-1">
                  <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                    {t('warrantyDetail.servicePhone')}
                  </p>
                  <p className="font-medium text-dark-900 dark:text-dark-50">
                    {device.servicePhone}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {device.servicePhone && (
                <button
                  onClick={handleCallService}
                  className="btn-primary flex items-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  {t('warrantyDetail.callService')}
                </button>
              )}
              {device.serviceAddress && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(device.serviceAddress)}`}
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
