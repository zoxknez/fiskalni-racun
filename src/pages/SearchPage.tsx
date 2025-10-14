import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Receipt as ReceiptIcon, Shield } from 'lucide-react'
import { useReceiptSearch, useDeviceSearch } from '@/hooks/useDatabase'
import { formatCurrency } from '@/lib'

export default function SearchPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  
  // Real-time search with live queries
  const receipts = useReceiptSearch(query)
  const devices = useDeviceSearch(query)
  
  const hasResults = (receipts && receipts.length > 0) || (devices && devices.length > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          {t('search.title')}
        </h1>
      </div>

      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="input pl-12 text-lg"
          autoFocus
        />
      </div>

      {/* Empty State */}
      {!query && (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
            <SearchIcon className="w-10 h-10 text-dark-400" />
          </div>
          <p className="text-dark-600 dark:text-dark-400">
            {t('search.emptyState')}
          </p>
        </div>
      )}

      {/* No Results */}
      {query && !hasResults && (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
            <SearchIcon className="w-10 h-10 text-dark-400" />
          </div>
          <p className="text-dark-600 dark:text-dark-400">
            {t('search.noResults')}
          </p>
        </div>
      )}

      {/* Results */}
      {query && hasResults && (
        <div className="space-y-6">
          {/* Receipts */}
          {receipts && receipts.length > 0 && (
            <div>
              <h2 className="section-title">
                {t('search.receipts')} ({receipts.length})
              </h2>
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <Link
                    key={receipt.id}
                    to={`/receipts/${receipt.id}`}
                    className="card-hover flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <ReceiptIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-900 dark:text-dark-50 truncate">
                        {receipt.merchantName}
                      </p>
                      <p className="text-sm text-dark-600 dark:text-dark-400">
                        {formatCurrency(receipt.totalAmount)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Devices */}
          {devices && devices.length > 0 && (
            <div>
              <h2 className="section-title">
                {t('search.devices')} ({devices.length})
              </h2>
              <div className="space-y-2">
                {devices.map((device) => (
                  <Link
                    key={device.id}
                    to={`/warranties/${device.id}`}
                    className="card-hover flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-900 dark:text-dark-50 truncate">
                        {device.brand} {device.model}
                      </p>
                      <p className="text-sm text-dark-600 dark:text-dark-400">
                        {t(`categories.${device.category}`)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
