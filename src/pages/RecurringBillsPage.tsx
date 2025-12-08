import type { RecurringBill, RecurringFrequency } from '@lib/db'
import { cn } from '@lib/utils'
import { format, type Locale } from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Droplets,
  Flame,
  Home,
  MoreHorizontal,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Shield,
  Trash2,
  Wifi,
  X,
  Zap,
} from 'lucide-react'
import { memo, useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BILL_CATEGORIES,
  type RecurringBillWithStatus,
  useRecurringBills,
} from '@/hooks/useRecurringBills'

const FREQUENCIES: RecurringFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly']

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

export default function RecurringBillsPage() {
  const { t, i18n } = useTranslation()
  const {
    billsWithStatus,
    upcomingBills,
    overdueBills,
    isLoading,
    createBill,
    updateBill,
    deleteBill,
    markAsPaid,
    togglePause,
    getMonthlyTotal,
  } = useRecurringBills()
  const shouldReduceMotion = useReducedMotion()

  const [isCreating, setIsCreating] = useState(false)
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null)
  const [deletingBill, setDeletingBill] = useState<RecurringBill | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'other' as string,
    frequency: 'monthly' as RecurringFrequency,
    nextDueDate: format(new Date(), 'yyyy-MM-dd'),
    reminderDays: '3',
    notes: '',
  })

  const locale = i18n.language === 'sr' ? sr : enUS
  const headingId = 'recurring-bills-heading'
  const monthlyTotal = getMonthlyTotal()

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    setFormData({
      name: '',
      amount: '',
      category: 'other',
      frequency: 'monthly',
      nextDueDate: format(new Date(), 'yyyy-MM-dd'),
      reminderDays: '3',
      notes: '',
    })
    setError(null)
  }, [])

  const handleStartEdit = useCallback((bill: RecurringBill) => {
    setEditingBill(bill)
    setFormData({
      name: bill.name,
      amount: String(bill.amount),
      category: bill.category,
      frequency: bill.frequency,
      nextDueDate: format(new Date(bill.nextDueDate), 'yyyy-MM-dd'),
      reminderDays: String(bill.reminderDays),
      notes: bill.notes ?? '',
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

      const billData: Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        amount,
        category: formData.category,
        frequency: formData.frequency,
        nextDueDate: new Date(formData.nextDueDate),
        reminderDays: Number.parseInt(formData.reminderDays, 10) || 3,
        isPaused: false,
      }

      if (formData.notes.trim()) {
        billData.notes = formData.notes.trim()
      }

      if (editingBill?.id) {
        await updateBill(editingBill.id, billData)
        setEditingBill(null)
      } else {
        await createBill(billData)
        setIsCreating(false)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error', 'Greška'))
    }
  }, [formData, editingBill, createBill, updateBill, t])

  const handleDelete = useCallback(async () => {
    if (!deletingBill?.id) return
    try {
      await deleteBill(deletingBill.id)
      setDeletingBill(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error', 'Greška'))
    }
  }, [deletingBill, deleteBill, t])

  const handleCancel = useCallback(() => {
    setIsCreating(false)
    setEditingBill(null)
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
          <CalendarClock className="h-7 w-7 text-primary-500" />
          {t('recurring.title')}
        </h1>
        <p className="mt-1 text-dark-500 dark:text-dark-400">{t('recurring.subtitle')}</p>
      </div>

      {/* Summary Card */}
      {billsWithStatus.length > 0 && (
        <motion.div {...animationProps} className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {/* Monthly Total */}
          <div className="rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white shadow-lg">
            <div className="mb-1 flex items-center gap-2 text-sm opacity-90">
              <Calendar className="h-4 w-4" />
              {t('recurring.monthlyTotal')}
            </div>
            <div className="font-bold text-2xl">
              {Math.round(monthlyTotal).toLocaleString('sr-RS')} {t('common.currency', 'RSD')}
            </div>
          </div>

          {/* Upcoming */}
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-lg">
            <div className="mb-1 flex items-center gap-2 text-sm opacity-90">
              <Clock className="h-4 w-4" />
              {t('recurring.upcoming')}
            </div>
            <div className="font-bold text-2xl">{upcomingBills.length}</div>
          </div>

          {/* Overdue */}
          {overdueBills.length > 0 && (
            <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-4 text-white shadow-lg">
              <div className="mb-1 flex items-center gap-2 text-sm opacity-90">
                <AlertTriangle className="h-4 w-4" />
                {t('recurring.overdue')}
              </div>
              <div className="font-bold text-2xl">{overdueBills.length}</div>
            </div>
          )}
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
          {isCreating || editingBill ? (
            <motion.div
              key="form"
              {...animationProps}
              className="rounded-lg border border-dark-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-800"
            >
              <BillForm
                formData={formData}
                onChange={setFormData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isEditing={!!editingBill}
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
              {t('recurring.addBill')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bills List */}
      {billsWithStatus.length > 0 ? (
        <div className="space-y-3" aria-labelledby={headingId}>
          <AnimatePresence>
            {billsWithStatus.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                locale={locale}
                onEdit={() => bill.id && handleStartEdit(bill)}
                onDelete={() => setDeletingBill(bill)}
                onMarkPaid={() => bill.id && markAsPaid(bill.id)}
                onTogglePause={() => bill.id && togglePause(bill.id, !bill.isPaused)}
                animationProps={animationProps}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-lg bg-dark-100 py-12 text-center dark:bg-dark-800">
          <CalendarClock className="mx-auto mb-3 h-12 w-12 text-dark-400 dark:text-dark-500" />
          <p className="mb-2 font-medium text-dark-700 dark:text-dark-300">
            {t('recurring.noBills')}
          </p>
          <p className="text-dark-500 text-sm dark:text-dark-400">{t('recurring.noBillsHint')}</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deletingBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDeletingBill(null)}
            onKeyDown={(e) => e.key === 'Escape' && setDeletingBill(null)}
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
                  {t('recurring.deleteBill')}
                </h2>
              </div>
              <p className="mb-6 text-dark-600 dark:text-dark-300">
                {t('recurring.deleteConfirm')}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingBill(null)}
                  className="flex-1 rounded-lg bg-dark-100 px-4 py-2.5 font-medium text-dark-700 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600"
                >
                  {t('common.cancel', 'Otkaži')}
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

// Bill Card Component
interface BillCardProps {
  bill: RecurringBillWithStatus
  locale: Locale
  onEdit: () => void
  onDelete: () => void
  onMarkPaid: () => void
  onTogglePause: () => void
  animationProps: Record<string, unknown>
}

const BillCard = memo(function BillCard({
  bill,
  locale,
  onEdit,
  onDelete,
  onMarkPaid,
  onTogglePause,
  animationProps,
}: BillCardProps) {
  const { t } = useTranslation()
  const CategoryIcon = CATEGORY_ICONS[bill.category] ?? MoreHorizontal
  const categoryInfo = BILL_CATEGORIES.find((c) => c.key === bill.category)

  const getFrequencyLabel = (freq: RecurringFrequency): string => {
    switch (freq) {
      case 'weekly':
        return t('recurring.weekly')
      case 'monthly':
        return t('recurring.monthly')
      case 'quarterly':
        return t('recurring.quarterly')
      case 'yearly':
        return t('recurring.yearly')
      default:
        return t('recurring.monthly')
    }
  }

  const getStatusLabel = (): string => {
    if (bill.isPaused) return t('recurring.paused')
    if (bill.isOverdue) return t('recurring.overdue')
    if (bill.isDueToday) return t('recurring.dueToday')
    if (bill.isDueSoon) return t('recurring.dueSoon', { days: bill.daysUntilDue })
    return t('recurring.dueIn', { days: bill.daysUntilDue })
  }

  return (
    <motion.div
      layout
      {...animationProps}
      className={cn(
        'overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-dark-800',
        bill.isPaused
          ? 'border-dark-200 opacity-60 dark:border-dark-600'
          : bill.isOverdue
            ? 'border-red-300 dark:border-red-800'
            : 'border-dark-200 dark:border-dark-600'
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
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
              <h3 className="font-semibold text-dark-900 dark:text-white">{bill.name}</h3>
              <div className="flex items-center gap-2 text-dark-500 text-sm dark:text-dark-400">
                <span>{t(`recurring.categories.${bill.category}` as const, bill.category)}</span>
                <span>•</span>
                <span>{getFrequencyLabel(bill.frequency)}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-dark-900 text-lg dark:text-white">
              {bill.amount.toLocaleString('sr-RS')} {t('common.currency', 'RSD')}
            </div>
            <div
              className="flex items-center justify-end gap-1 text-sm"
              style={{ color: bill.isPaused ? '#6B7280' : bill.statusColor }}
            >
              {bill.isOverdue && !bill.isPaused && <AlertTriangle className="h-3.5 w-3.5" />}
              {bill.isDueToday && !bill.isPaused && <Clock className="h-3.5 w-3.5" />}
              {getStatusLabel()}
            </div>
          </div>
        </div>

        {/* Due Date */}
        <div className="mb-3 flex items-center gap-2 text-dark-500 text-sm dark:text-dark-400">
          <Calendar className="h-4 w-4" />
          <span>
            {t('recurring.nextDue')}: {format(new Date(bill.nextDueDate), 'd MMM yyyy', { locale })}
          </span>
          {bill.lastPaidDate && (
            <>
              <span>•</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>
                {t('recurring.lastPaid')}:{' '}
                {format(new Date(bill.lastPaidDate), 'd MMM', { locale })}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!bill.isPaused && (
            <button
              type="button"
              onClick={onMarkPaid}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 font-medium text-green-700 text-sm transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
            >
              <Check className="h-4 w-4" />
              {t('recurring.markPaid')}
            </button>
          )}
          <button
            type="button"
            onClick={onTogglePause}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-medium text-sm transition-colors',
              bill.isPaused
                ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50'
                : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600'
            )}
            aria-label={bill.isPaused ? t('recurring.resume') : t('recurring.pause')}
          >
            {bill.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-dark-100 p-2 text-dark-600 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600"
            aria-label={t('common.edit', 'Uredi')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-dark-100 p-2 text-dark-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            aria-label={t('common.delete', 'Obriši')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
})

// Bill Form Component
interface BillFormProps {
  formData: {
    name: string
    amount: string
    category: string
    frequency: RecurringFrequency
    nextDueDate: string
    reminderDays: string
    notes: string
  }
  onChange: (data: BillFormProps['formData']) => void
  onSubmit: () => void
  onCancel: () => void
  isEditing: boolean
}

const BillForm = memo(function BillForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
}: BillFormProps) {
  const { t } = useTranslation()
  const nameId = useId()
  const amountId = useId()
  const categoryId = useId()
  const frequencyId = useId()
  const dueDateId = useId()
  const reminderDaysId = useId()
  const notesId = useId()

  const getFrequencyLabel = (freq: RecurringFrequency): string => {
    switch (freq) {
      case 'weekly':
        return t('recurring.weekly')
      case 'monthly':
        return t('recurring.monthly')
      case 'quarterly':
        return t('recurring.quarterly')
      case 'yearly':
        return t('recurring.yearly')
      default:
        return t('recurring.monthly')
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
          {t('recurring.billName')}
        </label>
        <input
          id={nameId}
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          placeholder={t('recurring.namePlaceholder')}
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:placeholder:text-dark-500"
        />
      </div>

      {/* Amount & Frequency Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={amountId}
            className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('recurring.amount')} ({t('common.currency', 'RSD')})
          </label>
          <input
            id={amountId}
            type="number"
            min="0"
            step="100"
            value={formData.amount}
            onChange={(e) => onChange({ ...formData, amount: e.target.value })}
            placeholder="2500"
            className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:placeholder:text-dark-500"
          />
        </div>
        <div>
          <label
            htmlFor={frequencyId}
            className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('recurring.frequency')}
          </label>
          <select
            id={frequencyId}
            value={formData.frequency}
            onChange={(e) =>
              onChange({ ...formData, frequency: e.target.value as RecurringFrequency })
            }
            className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {getFrequencyLabel(f)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor={categoryId}
          className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('recurring.category')}
        </label>
        <select
          id={categoryId}
          value={formData.category}
          onChange={(e) => onChange({ ...formData, category: e.target.value })}
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
        >
          {BILL_CATEGORIES.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {t(`recurring.categories.${cat.key}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Due Date & Reminder Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={dueDateId}
            className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('recurring.nextDueDate')}
          </label>
          <input
            id={dueDateId}
            type="date"
            value={formData.nextDueDate}
            onChange={(e) => onChange({ ...formData, nextDueDate: e.target.value })}
            className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor={reminderDaysId}
            className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('recurring.reminderDays')}
          </label>
          <input
            id={reminderDaysId}
            type="number"
            min="0"
            max="30"
            value={formData.reminderDays}
            onChange={(e) => onChange({ ...formData, reminderDays: e.target.value })}
            className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor={notesId}
          className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('recurring.notes')}
        </label>
        <textarea
          id={notesId}
          value={formData.notes}
          onChange={(e) => onChange({ ...formData, notes: e.target.value })}
          placeholder={t('recurring.notesPlaceholder')}
          rows={2}
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:placeholder:text-dark-500"
        />
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
          {isEditing ? t('common.save', 'Sačuvaj') : t('recurring.addBill')}
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
