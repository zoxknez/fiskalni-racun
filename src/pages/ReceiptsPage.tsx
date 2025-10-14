import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Search as SearchIcon, Receipt as ReceiptIcon } from 'lucide-react'
import { format } from 'date-fns'
import { sr, enUS } from 'date-fns/locale'
import type { Receipt } from '@/types'

export default function ReceiptsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'sr' ? sr : enUS
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadReceipts()
  }, [])

  const loadReceipts = async () => {
    // TODO: Load from Dexie DB
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          {t('receipts.title')}
        </h1>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder={t('receipts.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary flex items-center gap-2"
        >
          <Filter className="w-5 h-5" />
          <span>{t('receipts.filters')}</span>
        </button>
      </div>

      {/* Empty State */}
      {receipts.length === 0 && !searchQuery && (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
            <ReceiptIcon className="w-10 h-10 text-dark-400" />
          </div>
          <p className="text-dark-600 dark:text-dark-400 max-w-md mb-4">
            {t('receipts.emptyState')}
          </p>
          <Link to="/add" className="btn-primary">
            {t('receipts.addReceipt')}
          </Link>
        </div>
      )}

      {/* Receipts List */}
      {receipts.length > 0 && (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <Link
              key={receipt.id}
              to={`/receipts/${receipt.id}`}
              className="card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <ReceiptIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-dark-900 dark:text-dark-50 truncate">
                      {receipt.vendor}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
                      <span>{format(receipt.date, 'dd.MM.yyyy', { locale })}</span>
                      {receipt.category && (
                        <>
                          <span>•</span>
                          <span className="badge badge-info">
                            {t(`categories.${receipt.category}`)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-bold text-dark-900 dark:text-dark-50">
                    {receipt.amount.toLocaleString()} {t('common.currency')}
                  </p>
                  {receipt.syncStatus === 'pending' && (
                    <span className="badge badge-warning text-xs">
                      Sync pending
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
