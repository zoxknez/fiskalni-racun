/**
 * Dexie Live Query Hooks for Receipts
 *
 * Reactive database queries that auto-update UI
 *
 * @module hooks/queries/useLiveReceipts
 */

import { db } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'

/**
 * ⭐ Live query - All receipts
 * Automatically updates when data changes
 */
export function useLiveReceipts() {
  return useLiveQuery(() => db.receipts.orderBy('date').reverse().toArray(), [])
}

/**
 * ⭐ Live query - Single receipt
 */
export function useLiveReceipt(id: number | undefined) {
  return useLiveQuery(() => (id ? db.receipts.get(id) : undefined), [id])
}

/**
 * ⭐ Live query - Receipts by category
 */
export function useLiveReceiptsByCategory(category: string) {
  return useLiveQuery(() => db.receipts.where('category').equals(category).toArray(), [category])
}

/**
 * ⭐ Live query - Receipts in date range
 */
export function useLiveReceiptsByDateRange(startDate: Date, endDate: Date) {
  return useLiveQuery(
    () => db.receipts.where('date').between(startDate, endDate, true, true).toArray(),
    [startDate, endDate]
  )
}

/**
 * ⭐ Live query - Recent receipts
 */
export function useLiveRecentReceipts(limit = 5) {
  return useLiveQuery(
    () => db.receipts.orderBy('createdAt').reverse().limit(limit).toArray(),
    [limit]
  )
}

/**
 * ⭐ Live query - Total spending by category
 */
export function useLiveTotalByCategory() {
  return useLiveQuery(async () => {
    const receipts = await db.receipts.toArray()
    const totals: Record<string, number> = {}

    for (const receipt of receipts) {
      totals[receipt.category] = (totals[receipt.category] || 0) + receipt.totalAmount
    }

    return totals
  }, [])
}

/**
 * ⭐ Live query - Monthly spending
 */
export function useLiveMonthlySpending(year: number, month: number) {
  return useLiveQuery(async () => {
    const from = new Date(year, month, 1)
    const to = new Date(year, month + 1, 1)

    const receipts = await db.receipts.where('date').between(from, to, true, false).toArray()

    const total = receipts.reduce((sum, r) => sum + r.totalAmount, 0)

    return {
      total,
      count: receipts.length,
      average: receipts.length > 0 ? total / receipts.length : 0,
    }
  }, [year, month])
}

/**
 * ⭐ Live query - Search receipts
 */
export function useLiveSearchReceipts(query: string) {
  return useLiveQuery(() => {
    if (!query.trim()) {
      return db.receipts.orderBy('date').reverse().toArray()
    }

    const lowerQuery = query.toLowerCase()

    return db.receipts
      .filter((receipt) => {
        const matchesMerchant = receipt.merchantName.toLowerCase().includes(lowerQuery)
        const matchesPib = receipt.pib?.toLowerCase().includes(lowerQuery) ?? false
        const matchesCategory = receipt.category?.toLowerCase().includes(lowerQuery) ?? false
        const matchesNotes = receipt.notes?.toLowerCase().includes(lowerQuery) ?? false

        return matchesMerchant || matchesPib || matchesCategory || matchesNotes
      })
      .toArray()
  }, [query])
}

/**
 * ⭐ Live query - Pending sync receipts
 */
export function useLivePendingSyncReceipts() {
  return useLiveQuery(() => db.receipts.where('syncStatus').equals('pending').toArray(), [])
}
