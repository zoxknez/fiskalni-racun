/**
 * BudgetProgressWidget
 *
 * Widget showing current budget progress.
 * Displayed on the homepage dashboard.
 */

import { cn } from '@lib/utils'
import { motion } from 'framer-motion'
import { ChevronRight, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useBudgets } from '@/hooks/useBudgets'

function BudgetProgressWidgetComponent() {
  const { t } = useTranslation()
  const { budgetsWithSpending, isLoading, getTotalBudget, getTotalSpent } = useBudgets()

  // Show top 3 active budgets
  const displayBudgets = budgetsWithSpending.slice(0, 3)
  const totalBudget = getTotalBudget()
  const totalSpent = getTotalSpent()
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  if (isLoading || displayBudgets.length === 0) {
    return null
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="px-4"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-dark-900 text-lg dark:text-white">
          <Target className="h-5 w-5 text-primary-500" />
          {t('budget.title')}
        </h2>
        <Link
          to="/budget"
          className="flex items-center gap-1 font-medium text-primary-600 text-sm hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {t('home.viewAll')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Overall Summary */}
      <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-white/80">{t('budget.categories.total')}</span>
          <span className="font-bold">
            {totalSpent.toLocaleString('sr-RS')} / {totalBudget.toLocaleString('sr-RS')}{' '}
            {t('common.currency', 'RSD')}
          </span>
        </div>
        <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className={cn('h-full rounded-full', totalPercentage > 100 ? 'bg-red-400' : 'bg-white')}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, totalPercentage)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-white/80 text-xs">
          <span>
            {t('budget.spent')}: {Math.round(totalPercentage)}%
          </span>
          <span>
            {t('budget.remaining')}: {Math.max(0, totalBudget - totalSpent).toLocaleString('sr-RS')}{' '}
            {t('common.currency', 'RSD')}
          </span>
        </div>
      </div>

      {/* Individual Budgets */}
      <div className="space-y-3">
        {displayBudgets.map((budget) => (
          <Link
            key={budget.id}
            to="/budget"
            className="block rounded-xl border border-dark-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-dark-600 dark:bg-dark-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: budget.color }} />
                <span className="font-medium text-dark-900 dark:text-white">{budget.name}</span>
              </div>
              <span
                className={cn(
                  'flex items-center gap-1 font-medium text-sm',
                  budget.isOverBudget
                    ? 'text-red-600 dark:text-red-400'
                    : budget.percentage > 80
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                )}
              >
                {budget.isOverBudget ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.round(budget.percentage)}%
              </span>
            </div>
            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-dark-200 dark:bg-dark-600">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: budget.isOverBudget
                    ? '#EF4444'
                    : budget.percentage > 80
                      ? '#F59E0B'
                      : budget.color,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, budget.percentage)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-dark-500 text-xs dark:text-dark-400">
              <span>
                {budget.spent.toLocaleString('sr-RS')} / {budget.amount.toLocaleString('sr-RS')}{' '}
                {t('common.currency', 'RSD')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </motion.section>
  )
}

export const BudgetProgressWidget = memo(BudgetProgressWidgetComponent)
