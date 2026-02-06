import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Tag, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CategoryFilterOption, FilterPeriod, SortOption } from '../types'

interface ReceiptFiltersPanelProps {
  isOpen: boolean
  filterPeriod: FilterPeriod
  sortBy: SortOption
  selectedCategory: string
  categoryFilterOptions: CategoryFilterOption[]
  allCategoryValue: string
  onFilterPeriodChange: (period: FilterPeriod) => void
  onSortChange: (value: SortOption) => void
  onCategoryChange: (value: string) => void
  onClear: () => void
}

export function ReceiptFiltersPanel({
  isOpen,
  filterPeriod,
  sortBy,
  selectedCategory,
  categoryFilterOptions,
  allCategoryValue,
  onFilterPeriodChange,
  onSortChange,
  onCategoryChange,
  onClear,
}: ReceiptFiltersPanelProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="card space-y-4 p-6">
            <div>
              <p className="mb-3 flex items-center gap-2 font-semibold text-dark-700 text-sm dark:text-dark-300">
                <Calendar className="h-4 w-4" />
                {t('receipts.filterByPeriod')}
              </p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'today', 'week', 'month', 'year'] as FilterPeriod[]).map((period) => (
                  <motion.button
                    key={period}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onFilterPeriodChange(period)}
                    type="button"
                    className={`rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                      filterPeriod === period
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
                    }`}
                  >
                    {period === 'all' && t('receipts.periodAll')}
                    {period === 'today' && t('receipts.periodToday')}
                    {period === 'week' && t('receipts.periodWeek')}
                    {period === 'month' && t('receipts.periodMonth')}
                    {period === 'year' && t('receipts.periodYear')}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 flex items-center gap-2 font-semibold text-dark-700 text-sm dark:text-dark-300">
                <TrendingUp className="h-4 w-4" />
                {t('receipts.sorting')}
              </p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  { value: 'date-desc', label: t('receipts.sortNewest') },
                  { value: 'date-asc', label: t('receipts.sortOldest') },
                  { value: 'amount-desc', label: t('receipts.sortHighest') },
                  { value: 'amount-asc', label: t('receipts.sortLowest') },
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSortChange(option.value as SortOption)}
                    type="button"
                    className={`rounded-lg px-3 py-2 font-medium text-sm transition-all ${
                      sortBy === option.value
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 flex items-center gap-2 font-semibold text-dark-700 text-sm dark:text-dark-300">
                <Tag className="h-4 w-4" />
                {t('receipts.filterByCategory')}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryFilterOptions.map((option) => {
                  const isAll = option.value === allCategoryValue
                  const isActive = isAll
                    ? selectedCategory === ''
                    : selectedCategory === option.value
                  return (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onCategoryChange(isAll ? '' : option.value)}
                      type="button"
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-medium text-sm transition-all ${
                        isActive
                          ? 'border-primary-600 bg-primary-600 text-white shadow-lg'
                          : 'border-dark-200 bg-dark-100 text-dark-700 hover:bg-dark-200 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="whitespace-nowrap">{option.label}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {(filterPeriod !== 'all' || selectedCategory || sortBy !== 'date-desc') && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onClear}
                type="button"
                className="w-full rounded-lg bg-dark-100 px-4 py-2 font-medium text-dark-700 text-sm transition-colors hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700"
              >
                {t('receipts.clearFilters')}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
