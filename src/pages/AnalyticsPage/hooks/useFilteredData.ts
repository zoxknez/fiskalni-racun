import type { HouseholdBill, Receipt } from '@lib/db'
import { subMonths } from 'date-fns'
import { useMemo } from 'react'
import type { DateRange, TimePeriod } from '../types'

/**
 * Calculate date range based on time period
 */
export function useDateRange(timePeriod: TimePeriod, receipts: Receipt[]): DateRange {
  return useMemo(() => {
    const now = new Date()

    if (timePeriod === '3m') return { start: subMonths(now, 3), end: now }
    if (timePeriod === '6m') return { start: subMonths(now, 6), end: now }
    if (timePeriod === '12m') return { start: subMonths(now, 12), end: now }

    // For 'all', use earliest receipt date if available
    const earliest = receipts?.length
      ? new Date(Math.min(...receipts.map((r) => new Date(r.date).getTime())))
      : new Date(2020, 0, 1)

    return { start: earliest, end: now }
  }, [timePeriod, receipts])
}

/**
 * Filter receipts by date range
 */
export function useFilteredReceipts(receipts: Receipt[], dateRange: DateRange): Receipt[] {
  return useMemo(() => {
    if (!receipts?.length) return []

    return receipts.filter((r) => {
      const d = new Date(r.date)
      return d >= dateRange.start && d <= dateRange.end
    })
  }, [receipts, dateRange])
}

/**
 * Filter household bills by date range
 */
export function useFilteredHouseholdBills(
  bills: HouseholdBill[],
  dateRange: DateRange
): HouseholdBill[] {
  return useMemo(() => {
    if (!bills?.length) return []

    return bills.filter((bill) => {
      const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
      return dueDate >= dateRange.start && dueDate <= dateRange.end
    })
  }, [bills, dateRange])
}
