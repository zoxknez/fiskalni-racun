import type { HouseholdBill } from '@lib/db'
import { differenceInCalendarDays } from 'date-fns'
import { motion } from 'framer-motion'
import type { TFunction } from 'i18next'
import {
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Home,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react'
import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/charts/LazyCharts'
import { CONSUMPTION_UNIT_LABEL_KEYS, HOUSEHOLD_STATUS_LABEL_KEYS } from '../constants'

type HouseholdStats = {
  totalPaid: number
  outstanding: number
  averageBill: number
  onTimeRate: number | null
  upcomingCount: number
}

type HouseholdMonthlyDatum = { month: string; paid: number; outstanding: number; total?: number }
type HouseholdTypeDatum = { key: string; label: string; value: number; color: string }
type HouseholdStatusDatum = { key: string; label: string; value: number; color: string }

type UpcomingBill = {
  provider: string
  billType: HouseholdBill['billType']
  amount: number
  dueDate: Date | string
  status: HouseholdBill['status']
}

type ConsumptionEntry = {
  provider: string
  billType: HouseholdBill['billType']
  amount: number
  consumptionValue: number
  consumptionUnit: keyof typeof CONSUMPTION_UNIT_LABEL_KEYS
  periodStart?: Date
  periodEnd?: Date
  dueDate: Date
  id?: number
}

type HouseholdChartsSectionProps = {
  t: TFunction
  hasAnyHouseholdBills: boolean
  householdBillsCount: number
  householdStats: HouseholdStats
  householdMonthlyData: HouseholdMonthlyDatum[]
  householdTypeData: HouseholdTypeDatum[]
  householdStatusData: HouseholdStatusDatum[]
  upcomingBills: UpcomingBill[]
  latestConsumption: ConsumptionEntry[]
  isSmall: boolean
  formatCurrency: (value: number) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (date: Date) => string
}

function HouseholdChartsSection({
  t,
  hasAnyHouseholdBills,
  householdBillsCount,
  householdStats,
  householdMonthlyData,
  householdTypeData,
  householdStatusData,
  upcomingBills,
  latestConsumption,
  isSmall,
  formatCurrency,
  formatNumber,
  formatDate,
}: HouseholdChartsSectionProps) {
  return (
    <>
      {/* Household Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="card p-4 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
              <Home className="h-5 w-5 text-purple-500 sm:h-6 sm:w-6" aria-hidden="true" />
              {t('analytics.household.title')}
            </h3>
            <p className="max-w-2xl text-dark-500 text-sm sm:text-base dark:text-dark-300">
              {t('analytics.household.subtitle')}
            </p>
          </div>
          {hasAnyHouseholdBills && (
            <div className="rounded-xl border border-dark-100 bg-dark-50/80 px-4 py-2 text-dark-600 text-sm shadow-sm dark:border-dark-700 dark:bg-dark-900/40 dark:text-dark-300">
              {t('analytics.household.totalBills', { count: householdBillsCount })}
            </div>
          )}
        </div>

        {hasAnyHouseholdBills ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                key: 'totalPaid' as const,
                label: t('analytics.household.stats.totalPaid'),
                value: formatCurrency(householdStats.totalPaid),
                icon: CheckCircle2,
                accent: 'from-emerald-500 to-emerald-600',
              },
              {
                key: 'outstanding' as const,
                label: t('analytics.household.stats.outstanding'),
                value: formatCurrency(householdStats.outstanding),
                icon: DollarSign,
                accent: 'from-amber-500 to-orange-500',
              },
              {
                key: 'averageBill' as const,
                label: t('analytics.household.stats.averageBill'),
                value: formatCurrency(householdStats.averageBill),
                icon: TrendingUp,
                accent: 'from-indigo-500 to-indigo-600',
              },
              {
                key: 'onTimeRate' as const,
                label: t('analytics.household.stats.onTimeRate'),
                value:
                  householdStats.onTimeRate === null
                    ? t('analytics.household.onTimeRateEmpty')
                    : `${formatNumber(householdStats.onTimeRate, { maximumFractionDigits: 0 })}%`,
                icon: Activity,
                accent: 'from-sky-500 to-sky-600',
              },
              {
                key: 'upcoming' as const,
                label: t('analytics.household.stats.upcoming'),
                value: formatNumber(householdStats.upcomingCount, { maximumFractionDigits: 0 }),
                icon: CalendarClock,
                accent: 'from-purple-500 to-purple-600',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="hover:-translate-y-1 rounded-2xl border border-dark-100 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-dark-700 dark:bg-dark-900/30"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`rounded-xl bg-gradient-to-br ${item.accent} p-2 text-white shadow-inner`}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="font-semibold text-2xl text-dark-900 dark:text-dark-50">
                  {item.value}
                </div>
                <div className="mt-1 text-dark-500 text-sm dark:text-dark-300">{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dark-200 border-dashed bg-dark-50/60 p-8 text-center text-dark-500 dark:border-dark-700 dark:bg-dark-900/30 dark:text-dark-300">
            <CalendarClock className="h-12 w-12 text-primary-400" aria-hidden="true" />
            <p className="max-w-md text-sm sm:text-base">{t('analytics.household.empty')}</p>
          </div>
        )}
      </motion.div>

      {hasAnyHouseholdBills && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="card p-4 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                <BarChart3 className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
                {t('analytics.household.monthlyTrend')}
              </h3>
            </div>

            <div className="h-64 sm:h-80">
              {householdMonthlyData.some((item) => (item.total ?? 0) > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={householdMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickMargin={10} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickMargin={10}
                      tickFormatter={(v: number) =>
                        `${formatNumber(v, { maximumFractionDigits: 0 })}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number, key: string) => {
                        const label =
                          key === 'paid'
                            ? t('analytics.household.chartPaid')
                            : t('analytics.household.chartOutstanding')
                        return [formatCurrency(value), label]
                      }}
                    />
                    <Bar dataKey="paid" stackId="a" fill="#34d399" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="outstanding" stackId="a" fill="#fb923c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-dark-500 dark:text-dark-300">
                  {t('analytics.household.noDataInRange')}
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="card p-4 sm:p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                <PieChartIcon
                  className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                  aria-hidden="true"
                />
                {t('analytics.household.typeDistribution')}
              </h3>

              {householdTypeData.length > 0 ? (
                <div className="h-60 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={householdTypeData}
                      layout="vertical"
                      margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" hide domain={[0, 'dataMax']} />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={120}
                        tick={{ fill: '#475569', fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {householdTypeData.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                  {t('analytics.household.noTypeData')}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="card p-4 sm:p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                <Activity className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
                {t('analytics.household.statusBreakdown')}
              </h3>

              {householdStatusData.length > 0 ? (
                <div className="h-60 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={householdStatusData}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={isSmall ? 40 : 60}
                        outerRadius={isSmall ? 70 : 90}
                        paddingAngle={3}
                      >
                        {householdStatusData.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                  {t('analytics.household.noStatusData')}
                </div>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="card p-4 sm:p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                <CalendarClock
                  className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                  aria-hidden="true"
                />
                {t('analytics.household.upcomingBills')}
              </h3>

              {upcomingBills.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBills.map((bill) => {
                    const dueDate =
                      bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
                    const daysDiff = differenceInCalendarDays(dueDate, new Date())
                    const dueLabel =
                      daysDiff === 0
                        ? t('analytics.household.dueToday')
                        : daysDiff === 1
                          ? t('analytics.household.dueTomorrow')
                          : t('analytics.household.dueInDays', { count: daysDiff })

                    return (
                      <div
                        key={`${bill.provider}-${dueDate.toISOString()}`}
                        className="hover:-translate-y-1 flex flex-col gap-2 rounded-2xl border border-dark-100 p-4 shadow-sm transition hover:shadow-lg dark:border-dark-700 dark:bg-dark-900/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 font-semibold text-dark-900 dark:text-dark-50">
                              {bill.provider || t('analytics.household.unknownProvider')}
                            </div>
                            <div className="text-dark-500 text-sm dark:text-dark-300">
                              {t(`household.${bill.billType}` as const)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-dark-900 dark:text-dark-50">
                              {formatCurrency(bill.amount)}
                            </div>
                            <div className="text-dark-500 text-xs dark:text-dark-400">
                              {dueLabel}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-dark-500 text-xs uppercase tracking-wide dark:text-dark-400">
                          <span>
                            {t('analytics.household.payBy', { date: formatDate(dueDate) })}
                          </span>
                          <span>{t(HOUSEHOLD_STATUS_LABEL_KEYS[bill.status])}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                  {t('analytics.household.noUpcoming')}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="card p-4 sm:p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                <TrendingUp className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
                {t('analytics.household.consumptionTitle')}
              </h3>

              {latestConsumption.length > 0 ? (
                <div className="space-y-3">
                  {latestConsumption.map((entry) => {
                    const periodLabel =
                      entry.periodStart && entry.periodEnd
                        ? t('analytics.household.consumptionPeriod', {
                            start: formatDate(entry.periodStart),
                            end: formatDate(entry.periodEnd),
                          })
                        : entry.periodEnd
                          ? formatDate(entry.periodEnd)
                          : entry.periodStart
                            ? formatDate(entry.periodStart)
                            : null

                    return (
                      <div
                        key={`${entry.provider}-${entry.dueDate.toISOString()}-${entry.billType}`}
                        className="hover:-translate-y-1 rounded-2xl border border-dark-100 p-4 shadow-sm transition hover:shadow-lg dark:border-dark-700 dark:bg-dark-900/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-dark-900 dark:text-dark-50">
                              {entry.provider || t('analytics.household.unknownProvider')}
                            </div>
                            <div className="text-dark-500 text-xs uppercase tracking-wide dark:text-dark-400">
                              {t(`household.${entry.billType}` as const)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-dark-900 dark:text-dark-50">
                              {formatCurrency(entry.amount)}
                            </div>
                            <div className="text-dark-500 text-xs dark:text-dark-400">
                              {formatNumber(entry.consumptionValue, { maximumFractionDigits: 2 })}{' '}
                              {t(CONSUMPTION_UNIT_LABEL_KEYS[entry.consumptionUnit])}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-dark-500 text-xs uppercase tracking-wide dark:text-dark-400">
                          {periodLabel ? (
                            <span>{periodLabel}</span>
                          ) : (
                            <span>{t('analytics.household.periodUnknown')}</span>
                          )}
                          <span>
                            {t('analytics.household.payBy', {
                              date: formatDate(entry.dueDate),
                            })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                  {t('analytics.household.noConsumptionData')}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </>
  )
}

export default memo(HouseholdChartsSection)
