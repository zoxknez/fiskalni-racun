import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  QrCode, 
  Camera, 
  PenSquare, 
  TrendingUp, 
  AlertCircle,
  Wrench,
  Clock,
  ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'
import { sr, enUS } from 'date-fns/locale'
import { useDashboardStats, useRecentReceipts, useExpiringDevices } from '@/hooks/useDatabase'

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'sr' ? sr : enUS

  // Use live queries for real-time updates
  const stats = useDashboardStats()
  const recentReceipts = useRecentReceipts(5)
  const expiringDevices = useExpiringDevices(30)

  const loading = !stats || !recentReceipts || !expiringDevices
  const monthSpending = stats?.monthSpending || 0

  const quickActions = [
    {
      name: t('home.scanQR'),
      icon: QrCode,
      href: '/add?mode=qr',
      color: 'from-blue-500 to-blue-700',
    },
    {
      name: t('home.photoReceipt'),
      icon: Camera,
      href: '/add?mode=photo',
      color: 'from-purple-500 to-purple-700',
    },
    {
      name: t('home.addManual'),
      icon: PenSquare,
      href: '/add?mode=manual',
      color: 'from-green-500 to-green-700',
    },
  ]

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
          {t('home.title')}
        </h1>
        <p className="text-dark-600 dark:text-dark-400 mt-1">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale })}
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="section-title">{t('home.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.name}
                to={action.href}
                className="card-hover group"
              >
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="font-medium text-dark-900 dark:text-dark-50">
                    {action.name}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Month Spending */}
        <Link to="/receipts" className="stat-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  {t('home.monthSpending')}
                </p>
                <p className="text-2xl font-bold text-dark-900 dark:text-dark-50">
                  {monthSpending.toLocaleString()} {t('common.currency')}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-dark-400" />
          </div>
        </Link>

        {/* Expiring Warranties */}
        <Link to="/warranties?filter=expiring" className="stat-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  {t('home.expiringWarranties')}
                </p>
                <p className="text-2xl font-bold text-dark-900 dark:text-dark-50">
                  {expiringDevices?.length || 0}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-dark-400" />
          </div>
        </Link>

        {/* In Service */}
        <Link to="/warranties?filter=in-service" className="stat-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  {t('home.inService')}
                </p>
                <p className="text-2xl font-bold text-dark-900 dark:text-dark-50">
                  0
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-dark-400" />
          </div>
        </Link>
      </div>

      {/* Recently Added */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">{t('home.recentlyAdded')}</h2>
          <Link
            to="/receipts"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            {t('home.viewAll')}
          </Link>
        </div>

        {recentReceipts.length === 0 ? (
          <div className="empty-state">
            <div className="w-20 h-20 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-dark-400" />
            </div>
            <p className="text-dark-600 dark:text-dark-400 max-w-md">
              {t('home.emptyState')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentReceipts.map((receipt) => (
              <Link
                key={receipt.id}
                to={`/receipts/${receipt.id}`}
                className="card-hover flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-900 dark:text-dark-50 truncate">
                      {receipt.merchantName}
                    </p>
                    <p className="text-sm text-dark-600 dark:text-dark-400">
                      {format(receipt.date, 'dd.MM.yyyy', { locale })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-semibold text-dark-900 dark:text-dark-50">
                    {receipt.totalAmount.toLocaleString()} {t('common.currency')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
