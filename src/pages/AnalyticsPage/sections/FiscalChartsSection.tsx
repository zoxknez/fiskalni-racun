import { motion } from 'framer-motion'
import type { TFunction } from 'i18next'
import { Award, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { memo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/charts/LazyCharts'
import { CHART_COLORS } from '../constants'

type MonthlyDatum = { month: string; amount: number }
type CategoryDatum = { key: string; name: string; value: number; color: string }
type TopMerchant = { name: string; total: number; count: number }

type FiscalChartsSectionProps = {
  t: TFunction
  prefersReducedMotion: boolean
  monthlyData: MonthlyDatum[]
  categoryData: CategoryDatum[]
  topMerchants: TopMerchant[]
  gradientId: string
  isSmall: boolean
  formatCurrency: (value: number) => string
}

function FiscalChartsSection({
  t,
  prefersReducedMotion,
  monthlyData,
  categoryData,
  topMerchants,
  gradientId,
  isSmall,
  formatCurrency,
}: FiscalChartsSectionProps) {
  return (
    <>
      {/* Monthly Spending */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="card p-4 sm:p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
            <BarChart3 className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
            {t('analytics.monthlySpending')}
          </h2>
        </div>

        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              role="img"
              aria-label={t('analytics.monthlySpending') || 'Monthly spending'}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickMargin={10} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickMargin={10}
                tickFormatter={(v: number) => `${((v as number) / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number) => [
                  formatCurrency(value),
                  t('receipts.total') || 'Total',
                ]}
                labelFormatter={(label: string | number) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={CHART_COLORS.primary}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Category & Top Merchants */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-4 sm:p-6"
        >
          <h2 className="mb-6 flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
            <PieChartIcon className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
            {t('analytics.categories')}
          </h2>

          {categoryData.length > 0 ? (
            <>
              <div className="mb-4 h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isSmall ? 40 : 60}
                      outerRadius={isSmall ? 70 : 90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {categoryData.map((cat) => (
                  <div key={cat.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate text-dark-700 dark:text-dark-300">{cat.name}</span>
                    </div>
                    <span className="ml-2 font-semibold text-dark-900 dark:text-dark-50">
                      {formatCurrency(cat.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-dark-500">{t('analytics.noData')}</div>
          )}
        </motion.div>

        {/* Top Merchants */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-4 sm:p-6"
        >
          <h2 className="mb-6 flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
            <Award className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
            {t('analytics.topMerchants')}
          </h2>

          {topMerchants.length > 0 ? (
            <div className="space-y-4">
              {topMerchants.map((merchant, index) => {
                const maxTotal = topMerchants[0]?.total ?? merchant.total
                const percentage = maxTotal ? (merchant.total / maxTotal) * 100 : 0
                return (
                  <div key={merchant.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 font-bold text-white text-xs sm:h-8 sm:w-8 sm:text-sm">
                          {index + 1}
                        </div>
                        <span className="truncate font-medium text-dark-900 dark:text-dark-50">
                          {merchant.name}
                        </span>
                      </div>
                      <div className="ml-2 flex-shrink-0 text-right">
                        <div className="font-bold text-dark-900 dark:text-dark-50">
                          {formatCurrency(merchant.total)}
                        </div>
                        <div className="text-dark-500 text-xs">
                          {merchant.count} {t('analytics.receiptsCount')}
                        </div>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-dark-100 dark:bg-dark-800">
                      <motion.div
                        initial={prefersReducedMotion ? { width: `${percentage}%` } : { width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={
                          prefersReducedMotion ? {} : { duration: 0.5, delay: index * 0.1 }
                        }
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-dark-500">{t('analytics.noData')}</div>
          )}
        </motion.div>
      </div>
    </>
  )
}

export default memo(FiscalChartsSection)
