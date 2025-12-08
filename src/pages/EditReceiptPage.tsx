import { zodResolver } from '@hookform/resolvers/zod'
import { categoryOptions } from '@lib/categories'
import { formatCurrency } from '@lib/utils'
import { ArrowLeft, Calendar, Loader2, Save, Store } from 'lucide-react'
import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { updateReceipt, useReceipt } from '@/hooks/useDatabase'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { logger } from '@/lib/logger'

// ──────────────────────────────────────────────────────────────────────────────
// Validation Schema Factory (will be created inside component with i18n)
// ──────────────────────────────────────────────────────────────────────────────

type EditReceiptFormValues = {
  merchantName: string
  totalAmount: number
  date: Date
  category?: string
  notes?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
function EditReceiptPage() {
  const { t, i18n } = useTranslation()
  const navigate = useSmoothNavigate()
  const { id } = useParams()

  // Load existing receipt data
  const receipt = useReceipt(id)
  const loading = !receipt && id !== undefined
  const [saving, setSaving] = useState(false)

  // Create schema with i18n messages
  const editReceiptSchema = useMemo(
    () =>
      z.object({
        merchantName: z
          .string()
          .min(
            1,
            t('validation.merchantNameRequired', { defaultValue: 'Naziv prodavnice je obavezan' })
          )
          .max(
            200,
            t('validation.merchantNameMaxLength', {
              defaultValue: 'Naziv prodavnice ne može biti duži od 200 karaktera',
            })
          ),
        totalAmount: z
          .number()
          .positive(t('validation.amountPositive', { defaultValue: 'Iznos mora biti pozitivan' })),
        date: z.date({
          required_error: t('validation.dateRequired', { defaultValue: 'Datum je obavezan' }),
        }),
        category: z.string().optional(),
        notes: z
          .string()
          .max(
            500,
            t('validation.notesMaxLength', {
              defaultValue: 'Napomene ne mogu biti duže od 500 karaktera',
            })
          )
          .optional(),
      }),
    [t]
  )

  // RHF + Zod validation
  const resolver = zodResolver(editReceiptSchema) as Resolver<EditReceiptFormValues>
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
  } = useForm<EditReceiptFormValues>({ resolver })

  const idPrefix = useId()
  const fieldIds = useMemo(
    () => ({
      form: `${idPrefix}-edit-receipt-form`,
      merchantName: `${idPrefix}-merchant-name`,
      totalAmount: `${idPrefix}-total-amount`,
      date: `${idPrefix}-date`,
      category: `${idPrefix}-category`,
      notes: `${idPrefix}-notes`,
    }),
    [idPrefix]
  )

  // Category options
  const CATEGORY_OPTIONS = useMemo(
    () => [
      { value: '', label: t('editReceipt.noCategory', { defaultValue: 'Bez kategorije' }) },
      ...categoryOptions(i18n.language),
    ],
    [i18n.language, t]
  )

  // Helpers
  const toDateInput = useCallback((d: Date | string | undefined) => {
    if (!d) return ''
    const date = typeof d === 'string' ? new Date(d) : d
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const fromDateInput = useCallback((value: string | Date): Date => {
    if (value instanceof Date) return value
    if (typeof value !== 'string' || !value) return new Date()
    const parts = value.split('-')
    const year = Number.parseInt(parts[0] ?? '2024', 10)
    const month = Number.parseInt(parts[1] ?? '1', 10)
    const day = Number.parseInt(parts[2] ?? '1', 10)
    return new Date(year, month - 1, day)
  }, [])

  // Populate form when receipt loads
  useEffect(() => {
    if (!receipt) return

    reset({
      merchantName: receipt.merchantName,
      totalAmount: receipt.totalAmount,
      date: new Date(receipt.date),
      category: receipt.category ?? '',
      notes: receipt.notes ?? '',
    })
  }, [receipt, reset])

  // Submit
  const onSubmit: SubmitHandler<EditReceiptFormValues> = useCallback(
    async (data) => {
      if (!receipt || !receipt.id) return

      setSaving(true)
      try {
        // Build update object, only including defined values
        const updates: Parameters<typeof updateReceipt>[1] = {
          merchantName: data.merchantName,
          totalAmount: data.totalAmount,
          date: data.date,
        }
        if (data.category) {
          updates.category = data.category
        }
        if (data.notes) {
          updates.notes = data.notes
        }

        await updateReceipt(receipt.id, updates)

        toast.success(t('editReceipt.success', { defaultValue: 'Račun je uspešno ažuriran' }))
        navigate(`/receipts/${receipt.id}`)
      } catch (error) {
        logger.error('Update receipt error:', error)
        toast.error(t('common.error', { defaultValue: 'Greška pri čuvanju' }))
      } finally {
        setSaving(false)
      }
    },
    [receipt, navigate, t]
  )

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  // Not found
  if (!receipt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-dark-900">
        <Store className="mb-4 h-16 w-16 text-gray-400" />
        <h2 className="font-semibold text-gray-900 text-xl dark:text-white">
          {t('editReceipt.notFound', { defaultValue: 'Račun nije pronađen' })}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/receipts')}
          className="mt-4 text-primary-500 hover:underline"
        >
          {t('common.backToList', { defaultValue: 'Nazad na listu' })}
        </button>
      </div>
    )
  }

  const watchedAmount = watch('totalAmount')

  return (
    <div className="min-h-screen bg-gray-50 pb-safe dark:bg-dark-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-gray-200 border-b bg-white/80 backdrop-blur-md dark:border-dark-700 dark:bg-dark-800/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </button>

          <h1 className="font-semibold text-gray-900 text-lg dark:text-white">
            {t('editReceipt.title', { defaultValue: 'Izmeni račun' })}
          </h1>

          <button
            type="submit"
            form={fieldIds.form}
            disabled={isSubmitting || saving || !isDirty}
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {t('common.save', { defaultValue: 'Sačuvaj' })}
            </span>
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <form id={fieldIds.form} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Merchant Name */}
          <div>
            <label
              htmlFor={fieldIds.merchantName}
              className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300"
            >
              {t('addReceipt.storeName', { defaultValue: 'Naziv prodavnice' })} *
            </label>
            <input
              id={fieldIds.merchantName}
              type="text"
              {...register('merchantName')}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-white"
              placeholder={t('addReceipt.storeNamePlaceholder', {
                defaultValue: 'npr. Maxi, Idea, LIDL...',
              })}
            />
            {errors.merchantName && (
              <p className="mt-1 text-red-500 text-sm">{errors.merchantName.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor={fieldIds.totalAmount}
              className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300"
            >
              {t('addReceipt.amount', { defaultValue: 'Iznos' })} *
            </label>
            <div className="relative">
              <input
                id={fieldIds.totalAmount}
                type="number"
                step="0.01"
                min="0"
                {...register('totalAmount', { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-16 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-white"
                placeholder="0.00"
              />
              <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-4 text-gray-500">
                RSD
              </span>
            </div>
            {errors.totalAmount && (
              <p className="mt-1 text-red-500 text-sm">{errors.totalAmount.message}</p>
            )}
            {watchedAmount > 0 && (
              <p className="mt-1 text-gray-500 text-sm">{formatCurrency(watchedAmount)}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor={fieldIds.date}
              className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300"
            >
              {t('addReceipt.date', { defaultValue: 'Datum' })} *
            </label>
            <div className="relative">
              <input
                id={fieldIds.date}
                type="date"
                {...register('date', {
                  setValueAs: (v) => (v ? fromDateInput(v) : undefined),
                })}
                defaultValue={receipt?.date ? toDateInput(receipt.date) : ''}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-white"
              />
              <Calendar className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-4 h-5 w-5 text-gray-400" />
            </div>
            {errors.date && <p className="mt-1 text-red-500 text-sm">{errors.date.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor={fieldIds.category}
              className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300"
            >
              {t('addReceipt.category', { defaultValue: 'Kategorija' })}
            </label>
            <select
              id={fieldIds.category}
              {...register('category')}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-white"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor={fieldIds.notes}
              className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300"
            >
              {t('addReceipt.notes', { defaultValue: 'Napomene' })}
            </label>
            <textarea
              id={fieldIds.notes}
              {...register('notes')}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-white"
              placeholder={t('addReceipt.notesPlaceholder', {
                defaultValue: 'Dodatne napomene...',
              })}
            />
            {errors.notes && <p className="mt-1 text-red-500 text-sm">{errors.notes.message}</p>}
          </div>

          {/* Info about fiscal data */}
          {receipt.qrLink && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-blue-800 text-sm dark:text-blue-200">
                ℹ️{' '}
                {t('editReceipt.fiscalDataNote', {
                  defaultValue:
                    'Fiskalni podaci (QR kod, PIB, broj računa) se ne mogu menjati jer su deo originalnog fiskalnog računa.',
                })}
              </p>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}

export default memo(EditReceiptPage)
