import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  ExternalLink, 
  Edit, 
  Trash2,
  Package,
  Calendar,
  Receipt as ReceiptIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { sr, enUS } from 'date-fns/locale'
import type { Receipt } from '@/types'
import toast from 'react-hot-toast'

export default function ReceiptDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const locale = i18n.language === 'sr' ? sr : enUS
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReceipt()
  }, [id])

  const loadReceipt = async () => {
    // TODO: Load from Dexie DB
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(t('receiptDetail.deleteConfirm'))) return
    
    // TODO: Delete from DB
    toast.success(t('common.success'))
    navigate('/receipts')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!receipt) {
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
          {t('receiptDetail.title')}
        </h1>
        <button
          onClick={() => navigate(`/receipts/${id}/edit`)}
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

      {/* Main Info */}
      <div className="card">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
            <ReceiptIcon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
              {receipt.vendor}
            </h2>
            {receipt.pib && (
              <p className="text-dark-600 dark:text-dark-400">
                {t('receiptDetail.pib')}: {receipt.pib}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-dark-900 dark:text-dark-50">
              {receipt.amount.toLocaleString()}
            </p>
            <p className="text-dark-600 dark:text-dark-400">
              {t('common.currency')}
            </p>
          </div>
        </div>

        <div className="divider my-4"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
              {t('receiptDetail.date')}
            </p>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {format(receipt.date, 'dd.MM.yyyy', { locale })}
            </p>
          </div>
          {receipt.time && (
            <div>
              <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                {t('receiptDetail.time')}
              </p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {receipt.time}
              </p>
            </div>
          )}
          {receipt.category && (
            <div>
              <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                {t('receiptDetail.category')}
              </p>
              <span className="badge badge-info">
                {t(`categories.${receipt.category}`)}
              </span>
            </div>
          )}
          {receipt.vat && (
            <div>
              <p className="text-sm text-dark-600 dark:text-dark-400 mb-1">
                {t('receiptDetail.vat')}
              </p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {receipt.vat.toLocaleString()} {t('common.currency')}
              </p>
            </div>
          )}
        </div>

        {receipt.eReceiptUrl && (
          <a
            href={receipt.eReceiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            {t('receiptDetail.openEReceipt')}
          </a>
        )}
      </div>

      {/* Items */}
      {receipt.items && receipt.items.length > 0 && (
        <div className="card">
          <h3 className="section-title">{t('receiptDetail.items')}</h3>
          <div className="space-y-2">
            {receipt.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-dark-200 dark:border-dark-700 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-dark-900 dark:text-dark-50">
                    {item.name}
                  </p>
                  {item.quantity && (
                    <p className="text-sm text-dark-600 dark:text-dark-400">
                      {item.quantity}x @ {item.price?.toLocaleString()} {t('common.currency')}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-dark-900 dark:text-dark-50">
                  {item.total?.toLocaleString()} {t('common.currency')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add as Device */}
      <Link
        to={`/warranties/add?receiptId=${id}`}
        className="card-hover flex items-center gap-3 justify-center text-primary-600 dark:text-primary-400"
      >
        <Package className="w-6 h-6" />
        <span className="font-medium">{t('receiptDetail.addAsDevice')}</span>
      </Link>

      {/* Notes */}
      {receipt.notes && (
        <div className="card">
          <h3 className="section-title">{t('receiptDetail.notes')}</h3>
          <p className="text-dark-700 dark:text-dark-300">{receipt.notes}</p>
        </div>
      )}
    </div>
  )
}
