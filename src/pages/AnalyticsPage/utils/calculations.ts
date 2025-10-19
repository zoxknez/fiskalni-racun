import type { HouseholdBill, Receipt } from '@lib/db'
import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns'
import { CATEGORY_COLORS, CATEGORY_LABEL_KEYS, HOUSEHOLD_STATUS_COLORS } from '../constants'
import type {
  CategoryDatum,
  CategoryKey,
  DateRange,
  HouseholdMonthlyDatum,
  HouseholdStatusDatum,
  HouseholdTypeDatum,
  MerchantDatum,
  MonthlyDatum,
} from '../types'
import { mapCategoryKey } from './mappers'

/**
 * Calculate monthly spending data
 */
export function calculateMonthlyData(receipts: Receipt[], dateRange: DateRange): MonthlyDatum[] {
  const months = eachMonthOfInterval({
    start: startOfMonth(dateRange.start),
    end: endOfMonth(dateRange.end),
  })

  return months.map((month) => {
    const mStart = startOfMonth(month)
    const mEnd = endOfMonth(month)

    const monthReceipts = receipts.filter((r) => {
      const d = new Date(r.date)
      return d >= mStart && d <= mEnd
    })

    const total = monthReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0)

    return {
      month: format(month, 'MMM'),
      amount: total,
      count: monthReceipts.length,
    }
  })
}

/**
 * Calculate category spending data
 */
export function calculateCategoryData(
  receipts: Receipt[],
  translator: (key: string) => string
): CategoryDatum[] {
  if (!receipts.length) return []

  const acc: Partial<Record<CategoryKey, number>> = {}

  receipts.forEach((r) => {
    const key = mapCategoryKey(r.category)
    acc[key] = (acc[key] || 0) + (r.totalAmount || 0)
  })

  return (Object.entries(acc) as [CategoryKey, number][])
    .map(([key, value]) => ({
      key,
      name: translator(CATEGORY_LABEL_KEYS[key] as string),
      value,
      color: CATEGORY_COLORS[key],
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Calculate top merchants
 */
export function calculateTopMerchants(receipts: Receipt[], limit = 5): MerchantDatum[] {
  if (!receipts.length) return []

  const map: Record<string, { total: number; count: number }> = {}

  receipts.forEach((r) => {
    const name = r.merchantName?.trim() || '—'
    if (!map[name]) map[name] = { total: 0, count: 0 }
    map[name].total += r.totalAmount || 0
    map[name].count += 1
  })

  return Object.entries(map)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/**
 * Calculate household monthly data
 */
export function calculateHouseholdMonthlyData(
  bills: HouseholdBill[],
  dateRange: DateRange
): HouseholdMonthlyDatum[] {
  const months = eachMonthOfInterval({
    start: startOfMonth(dateRange.start),
    end: endOfMonth(dateRange.end),
  })

  return months.map((month) => {
    const mStart = startOfMonth(month)
    const mEnd = endOfMonth(month)

    const monthBills = bills.filter((bill) => {
      const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
      return dueDate >= mStart && dueDate <= mEnd
    })

    const total = monthBills.reduce((sum, bill) => sum + (bill.amount || 0), 0)
    const paid = monthBills
      .filter((bill) => bill.status === 'paid')
      .reduce((sum, bill) => sum + (bill.amount || 0), 0)
    const outstanding = Math.max(total - paid, 0)

    return {
      month: format(month, 'MMM'),
      total,
      paid,
      outstanding,
    }
  })
}

/**
 * Calculate household type breakdown
 */
export function calculateHouseholdTypeData(
  bills: HouseholdBill[],
  translator: (key: string) => string,
  typeColors: Record<string, string>
): HouseholdTypeDatum[] {
  if (!bills.length) return []

  const totals = new Map<HouseholdBill['billType'], number>()

  bills.forEach((bill) => {
    const key = bill.billType
    totals.set(key, (totals.get(key) || 0) + (bill.amount || 0))
  })

  return Array.from(totals.entries())
    .map(([key, value]) => ({
      key,
      label: translator(`household.${key}` as string),
      value,
      // biome-ignore lint/complexity/useLiteralKeys: Fallback for undefined keys
      color: typeColors[key] ?? typeColors['other'] ?? '#64748b',
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Calculate household status breakdown
 */
export function calculateHouseholdStatusData(
  bills: HouseholdBill[],
  translator: (key: string) => string,
  statusLabelKeys: Record<string, string>
): HouseholdStatusDatum[] {
  if (!bills.length) return []

  const counts: Record<HouseholdBill['status'], number> = {
    pending: 0,
    paid: 0,
    overdue: 0,
  }

  bills.forEach((bill) => {
    counts[bill.status] += 1
  })

  return (Object.keys(counts) as HouseholdBill['status'][])
    .map((key) => ({
      key,
      label: translator(
        (statusLabelKeys[key] ?? `analytics.household.statusLabels.${key}`) as string
      ),
      value: counts[key],
      color: HOUSEHOLD_STATUS_COLORS[key],
    }))
    .filter((item) => item.value > 0)
}

/**
 * Get upcoming bills within window
 */
export function getUpcomingBills(bills: HouseholdBill[], windowDays = 30, limit = 4) {
  if (!bills.length) return []

  const now = new Date()

  return bills
    .filter((bill) => {
      if (bill.status === 'paid') return false
      const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
      const diff = differenceInCalendarDays(dueDate, now)
      return diff >= 0 && diff <= windowDays
    })
    .sort((a, b) => {
      const dueA = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)
      const dueB = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate)
      return dueA.getTime() - dueB.getTime()
    })
    .slice(0, limit)
}

/**
 * Calculate household stats
 */
export function calculateHouseholdStats(
  bills: HouseholdBill[],
  upcomingBillsCount: number
): {
  totalPaid: number
  outstanding: number
  averageBill: number
  onTimeRate: number | null
  upcomingCount: number
} {
  if (!bills.length) {
    return {
      totalPaid: 0,
      outstanding: 0,
      averageBill: 0,
      onTimeRate: null,
      upcomingCount: upcomingBillsCount,
    }
  }

  const paidBills = bills.filter((bill) => bill.status === 'paid')
  const totalPaid = paidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0)

  const outstanding = bills
    .filter((bill) => bill.status !== 'paid')
    .reduce((sum, bill) => sum + (bill.amount || 0), 0)

  const averageBill = paidBills.length ? totalPaid / paidBills.length : 0

  const onTimePayments = paidBills.filter((bill) => {
    if (!bill.paymentDate) return false
    const paymentDate =
      bill.paymentDate instanceof Date ? bill.paymentDate : new Date(bill.paymentDate)
    const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
    return paymentDate.getTime() <= dueDate.getTime()
  }).length

  const onTimeRate = paidBills.length ? (onTimePayments / paidBills.length) * 100 : null

  return {
    totalPaid,
    outstanding,
    averageBill,
    onTimeRate,
    upcomingCount: upcomingBillsCount,
  }
}
