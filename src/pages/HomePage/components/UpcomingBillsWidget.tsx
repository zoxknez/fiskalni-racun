/**
 * UpcomingBillsWidget
 *
 * Widget showing upcoming recurring bills due soon.
 * Displayed on the homepage dashboard.
 */

import { cn } from '@lib/utils'
import { format } from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Clock,
  CreditCard,
  Droplets,
  Flame,
  Home,
  MoreHorizontal,
  Phone,
  Shield,
  Wifi,
  Zap,
} from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BILL_CATEGORIES, useRecurringBills } from '@/hooks/useRecurringBills'

// Icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  electricity: Zap,
  water: Droplets,
  gas: Flame,
  internet: Wifi,
  phone: Phone,
  subscription: CreditCard,
  rent: Home,
  insurance: Shield,
  other: MoreHorizontal,
}

function UpcomingBillsWidgetComponent() {
  const { t, i18n } = useTranslation()
  const { upcomingBills, overdueBills, isLoading } = useRecurringBills()
  const locale = i18n.language === 'sr' ? sr : enUS

  // Show top 3 bills (overdue first, then upcoming)
  const displayBills = [...overdueBills, ...upcomingBills.filter((b) => !b.isOverdue)].slice(0, 3)

  if (isLoading || displayBills.length === 0) {
    return null
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="px-4"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-dark-900 text-lg dark:text-white">
          <CalendarClock className="h-5 w-5 text-primary-500" />
          {t('recurring.upcoming')}
        </h2>
        <Link
          to="/recurring-bills"
          className="flex items-center gap-1 font-medium text-primary-600 text-sm hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {t('home.viewAll')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {displayBills.map((bill) => {
          const CategoryIcon = CATEGORY_ICONS[bill.category] ?? MoreHorizontal
          const categoryInfo = BILL_CATEGORIES.find((c) => c.key === bill.category)

          return (
            <Link
              key={bill.id}
              to="/recurring-bills"
              className={cn(
                'flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-dark-800',
                bill.isOverdue
                  ? 'border-red-300 dark:border-red-800'
                  : 'border-dark-200 dark:border-dark-600'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${categoryInfo?.color ?? '#6B7280'}20` }}
                >
                  <CategoryIcon
                    className="h-5 w-5"
                    style={{ color: categoryInfo?.color ?? '#6B7280' }}
                  />
                </div>
                <div>
                  <p className="font-medium text-dark-900 dark:text-white">{bill.name}</p>
                  <div
                    className="flex items-center gap-1 text-sm"
                    style={{ color: bill.statusColor }}
                  >
                    {bill.isOverdue ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('recurring.overdue')}
                      </>
                    ) : bill.isDueToday ? (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        {t('recurring.dueToday')}
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(bill.nextDueDate), 'd MMM', { locale })}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-dark-900 dark:text-white">
                  {bill.amount.toLocaleString('sr-RS')}
                </p>
                <p className="text-dark-500 text-xs dark:text-dark-400">
                  {t('common.currency', 'RSD')}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </motion.section>
  )
}

export const UpcomingBillsWidget = memo(UpcomingBillsWidgetComponent)
