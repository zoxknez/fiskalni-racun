import type { Budget, BudgetPeriod } from '@lib/db'
import { cn } from '@lib/utils'
import { format, type Locale } from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  Check,
  Pencil,
  Plus,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { memo, useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BUDGET_COLORS, type BudgetWithSpending, useBudgets } from '@/hooks/useBudgets'

const PERIODS: BudgetPeriod[] = ['weekly', 'monthly', 'yearly']

// Category options for budgets
const CATEGORIES = [
  { key: 'food', label: 'budget.categories.food' },
  { key: 'transport', label: 'budget.categories.transport' },
  { key: 'utilities', label: 'budget.categories.utilities' },
  { key: 'entertainment', label: 'budget.categories.entertainment' },
  { key: 'health', label: 'budget.categories.health' },
  { key: 'shopping', label: 'budget.categories.shopping' },
  { key: 'other', label: 'budget.categories.other' },
] as const

export default function BudgetPage() {
  const { t, i18n } = useTranslation()
  const {
    budgetsWithSpending,
    isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
    getNextColor,
    getTotalBudget,
    getTotalSpent,
  } = useBudgets()
  const shouldReduceMotion = useReducedMotion()

  const [isCreating, setIsCreating] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    period: 'monthly' as BudgetPeriod,
    category: '',
    color: BUDGET_COLORS[0] ?? '#3B82F6',
    isActive: true,
  })

  const locale = i18n.language === 'sr' ? sr : enUS
  const headingId = 'budget-heading'

  const totalBudget = getTotalBudget()
  const totalSpent = getTotalSpent()
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    setFormData({
      name: '',
      amount: '',
      period: 'monthly',
      category: '',
      color: getNextColor(),
      isActive: true,
    })
    setError(null)
  }, [getNextColor])

  const handleStartEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget)
    setFormData({
      name: budget.name,
      amount: String(budget.amount),
      period: budget.period,
      category: budget.category ?? '',
      color: budget.color,
      isActive: budget.isActive,
    })
    setError(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    try {
      const amount = Number.parseFloat(formData.amount)
      if (!formData.name.trim()) {
        setError(t('validation.required', 'Ovo polje je obavezno'))
        return
      }
      if (Number.isNaN(amount) || amount <= 0) {
        setError(t('validation.amountPositive', 'Iznos mora biti veći od 0'))
        return
      }

      const budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        amount,
        period: formData.period,
        color: formData.color,
        isActive: formData.isActive,
        startDate: new Date(),
      }

      // Only add category if specified
      if (formData.category) {
        budgetData.category = formData.category
      }

      if (editingBudget?.id) {
        await updateBudget(editingBudget.id, budgetData)
        setEditingBudget(null)
      } else {
        await createBudget(budgetData)
        setIsCreating(false)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error', 'Greška'))
    }
  }, [formData, editingBudget, createBudget, updateBudget, t])

  const handleDelete = useCallback(async () => {
    if (!deletingBudget?.id) return
    try {
      await deleteBudget(deletingBudget.id)
      setDeletingBudget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error', 'Greška'))
    }
  }, [deletingBudget, deleteBudget, t])

  const handleCancel = useCallback(() => {
    setIsCreating(false)
    setEditingBudget(null)
    setError(null)
  }, [])

  const animationProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1
          id={headingId}
          className="flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-white"
        >
          <Target className="h-7 w-7 text-primary-500" />
          {t('budget.title')}
        </h1>
        <p className="mt-1 text-dark-500 dark:text-dark-400">{t('budget.subtitle')}</p>
      </div>

      {/* Summary Card */}
      {budgetsWithSpending.length > 0 && (
        <motion.div
          {...animationProps}
          className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white shadow-lg"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className="font-medium">{t('budget.categories.total')}</span>
            </div>
            <span className="font-bold text-2xl">
              {totalBudget.toLocaleString('sr-RS')} {t('common.currency', 'RSD')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className={cn(
                'h-full rounded-full',
                totalPercentage > 100 ? 'bg-red-400' : 'bg-white'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, totalPercentage)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span>
              {t('budget.spent')}: {totalSpent.toLocaleString('sr-RS')}{' '}
              {t('common.currency', 'RSD')}
            </span>
            <span>{Math.round(totalPercentage)}%</span>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            {...animationProps}
            className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Button / Form */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          {isCreating || editingBudget ? (
            <motion.div
              key="form"
              {...animationProps}
              className="rounded-lg border border-dark-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-800"
            >
              <BudgetForm
                formData={formData}
                onChange={setFormData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isEditing={!!editingBudget}
              />
            </motion.div>
          ) : (
            <motion.button
              key="create-button"
              {...animationProps}
              type="button"
              onClick={handleStartCreate}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dark-300 border-dashed bg-white px-4 py-3 text-dark-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300 dark:hover:border-primary-400 dark:hover:text-primary-400"
            >
              <Plus className="h-5 w-5" />
              {t('budget.addBudget')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Budgets List */}
      {budgetsWithSpending.length > 0 ? (
        <section className="space-y-4" aria-labelledby={headingId}>
          <AnimatePresence>
            {budgetsWithSpending.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                locale={locale}
                onEdit={() => budget.id && handleStartEdit(budget)}
                onDelete={() => setDeletingBudget(budget)}
                animationProps={animationProps}
              />
            ))}
            n{' '}
          </AnimatePresence>
        </section>
      ) : (
        <div className="rounded-lg bg-dark-100 py-12 text-center dark:bg-dark-800">
          <Target className="mx-auto mb-3 h-12 w-12 text-dark-400 dark:text-dark-500" />
          <p className="mb-2 font-medium text-dark-700 dark:text-dark-300">
            {t('budget.noBudgets')}
          </p>
          <p className="text-dark-500 text-sm dark:text-dark-400">{t('budget.noBudgetsHint')}</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deletingBudget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDeletingBudget(null)}
            onKeyDown={(e) => e.key === 'Escape' && setDeletingBudget(null)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-dark-800"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="font-semibold text-dark-900 text-lg dark:text-white">
                  {t('budget.deleteBudget')}
                </h2>
              </div>
              <p className="mb-6 text-dark-600 dark:text-dark-300">{t('budget.deleteConfirm')}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingBudget(null)}
                  className="flex-1 rounded-lg bg-dark-100 px-4 py-2.5 font-medium text-dark-700 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600"
                >
                  {t('budget.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
                >
                  {t('common.delete', 'Obriši')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Budget Card Component
interface BudgetCardProps {
  budget: BudgetWithSpending
  locale: Locale
  onEdit: () => void
  onDelete: () => void
  animationProps: Record<string, unknown>
}

const BudgetCard = memo(function BudgetCard({
  budget,
  locale,
  onEdit,
  onDelete,
  animationProps,
}: BudgetCardProps) {
  const { t } = useTranslation()

  const getPeriodLabel = (period: BudgetPeriod): string => {
    switch (period) {
      case 'weekly':
        return t('budget.weekly')
      case 'monthly':
        return t('budget.monthly')
      case 'yearly':
        return t('budget.yearly')
      default:
        return t('budget.monthly')
    }
  }

  return (
    <motion.div
      layout
      {...animationProps}
      className="overflow-hidden rounded-xl border border-dark-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-800"
    >
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${budget.color}20` }}
            >
              <Target className="h-5 w-5" style={{ color: budget.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-dark-900 dark:text-white">{budget.name}</h3>
              <div className="flex items-center gap-2 text-dark-500 text-sm dark:text-dark-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>{getPeriodLabel(budget.period)}</span>
                {budget.category && (
                  <>
                    <span>•</span>
                    <Tag className="h-3.5 w-3.5" />
                    <span>{budget.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-2 text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-700 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200"
              aria-label={t('budget.editBudget')}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-2 text-dark-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-dark-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              aria-label={t('budget.deleteBudget')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-dark-600 dark:text-dark-300">
              {budget.spent.toLocaleString('sr-RS')} / {budget.amount.toLocaleString('sr-RS')}{' '}
              {t('common.currency', 'RSD')}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 font-medium',
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
          <div className="h-2 overflow-hidden rounded-full bg-dark-200 dark:bg-dark-600">
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-dark-500 text-xs dark:text-dark-400">
          <span>
            {format(budget.periodStart, 'd MMM', { locale })} -{' '}
            {format(budget.periodEnd, 'd MMM', { locale })}
          </span>
          <span>
            {t('budget.remaining')}: {budget.remaining.toLocaleString('sr-RS')}{' '}
            {t('common.currency', 'RSD')}
          </span>
        </div>
      </div>
    </motion.div>
  )
})

// Budget Form Component
interface BudgetFormProps {
  formData: {
    name: string
    amount: string
    period: BudgetPeriod
    category: string
    color: string
    isActive: boolean
  }
  onChange: (data: BudgetFormProps['formData']) => void
  onSubmit: () => void
  onCancel: () => void
  isEditing: boolean
}

const BudgetForm = memo(function BudgetForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
}: BudgetFormProps) {
  const { t } = useTranslation()
  const nameId = useId()
  const amountId = useId()
  const periodId = useId()
  const categoryId = useId()

  const getPeriodLabel = (period: BudgetPeriod): string => {
    switch (period) {
      case 'weekly':
        return t('budget.weekly')
      case 'monthly':
        return t('budget.monthly')
      case 'yearly':
        return t('budget.yearly')
      default:
        return t('budget.monthly')
    }
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label
          htmlFor={nameId}
          className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('budget.name')}
        </label>
        <input
          id={nameId}
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          placeholder={t('budget.namePlaceholder')}
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:placeholder:text-dark-500"
        />
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor={amountId}
          className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('budget.amount')} ({t('common.currency', 'RSD')})
        </label>
        <input
          id={amountId}
          type="number"
          min="0"
          step="100"
          value={formData.amount}
          onChange={(e) => onChange({ ...formData, amount: e.target.value })}
          placeholder="10000"
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:placeholder:text-dark-500"
        />
      </div>

      {/* Period */}
      <div>
        <label
          htmlFor={periodId}
          className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('budget.period')}
        </label>
        <select
          id={periodId}
          value={formData.period}
          onChange={(e) => onChange({ ...formData, period: e.target.value as BudgetPeriod })}
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {getPeriodLabel(p)}
            </option>
          ))}
        </select>
      </div>

      {/* Category (optional) */}
      <div>
        <label
          htmlFor={categoryId}
          className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('budget.category')}
        </label>
        <select
          id={categoryId}
          value={formData.category}
          onChange={(e) => onChange({ ...formData, category: e.target.value })}
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
        >
          <option value="">{t('budget.categories.total')}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {t(cat.label)}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div>
        <span className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
          {t('tags.tagColor')}
        </span>
        <div className="flex flex-wrap gap-2">
          {BUDGET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...formData, color: c })}
              className={cn(
                'h-8 w-8 rounded-full transition-transform hover:scale-110',
                formData.color === c &&
                  'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-800'
              )}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!formData.name.trim() || !formData.amount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {isEditing ? t('budget.save') : t('budget.addBudget')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center rounded-lg bg-dark-100 px-4 py-2.5 font-medium text-dark-700 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
})
