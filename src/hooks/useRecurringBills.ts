import {
  addRecurringBill,
  deleteRecurringBill,
  getAllRecurringBills,
  markBillAsPaid,
  type RecurringBill,
  updateRecurringBill,
} from '@lib/db'
import { differenceInDays, isBefore, isToday } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'

// Bill category options with icons/colors
export const BILL_CATEGORIES = [
  { key: 'electricity', color: '#F59E0B', icon: 'Zap' },
  { key: 'water', color: '#3B82F6', icon: 'Droplets' },
  { key: 'gas', color: '#EF4444', icon: 'Flame' },
  { key: 'internet', color: '#8B5CF6', icon: 'Wifi' },
  { key: 'phone', color: '#10B981', icon: 'Phone' },
  { key: 'subscription', color: '#EC4899', icon: 'CreditCard' },
  { key: 'rent', color: '#6366F1', icon: 'Home' },
  { key: 'insurance', color: '#14B8A6', icon: 'Shield' },
  { key: 'other', color: '#6B7280', icon: 'MoreHorizontal' },
] as const

export type BillCategory = (typeof BILL_CATEGORIES)[number]['key']

export interface RecurringBillWithStatus extends RecurringBill {
  daysUntilDue: number
  isOverdue: boolean
  isDueSoon: boolean // within reminder days
  isDueToday: boolean
  statusColor: string
}

export interface UseRecurringBillsResult {
  bills: RecurringBill[]
  billsWithStatus: RecurringBillWithStatus[]
  upcomingBills: RecurringBillWithStatus[]
  overdueBills: RecurringBillWithStatus[]
  isLoading: boolean
  createBill: (bill: Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateBill: (
    id: string,
    updates: Partial<Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>
  deleteBill: (id: string) => Promise<void>
  markAsPaid: (id: string) => Promise<void>
  togglePause: (id: string, isPaused: boolean) => Promise<void>
  getMonthlyTotal: () => number
  getCategoryInfo: (category: string) => (typeof BILL_CATEGORIES)[number] | undefined
}

function getStatusColor(bill: RecurringBillWithStatus): string {
  if (bill.isOverdue) return '#EF4444' // red
  if (bill.isDueToday) return '#F59E0B' // amber
  if (bill.isDueSoon) return '#3B82F6' // blue
  return '#10B981' // green
}

export function useRecurringBills(): UseRecurringBillsResult {
  const bills = useLiveQuery(() => getAllRecurringBills(), [], [])
  const isLoading = bills === undefined

  // Add status information to each bill
  const billsWithStatus = useMemo((): RecurringBillWithStatus[] => {
    if (!bills) return []

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return bills.map((bill) => {
      const dueDate = new Date(bill.nextDueDate)
      dueDate.setHours(0, 0, 0, 0)

      const daysUntilDue = differenceInDays(dueDate, now)
      const isOverdue = isBefore(dueDate, now) && !isToday(dueDate)
      const isDueToday = isToday(dueDate)
      const isDueSoon = !isOverdue && !isDueToday && daysUntilDue <= bill.reminderDays

      const statusBill: RecurringBillWithStatus = {
        ...bill,
        daysUntilDue,
        isOverdue,
        isDueSoon,
        isDueToday,
        statusColor: '#10B981',
      }
      statusBill.statusColor = getStatusColor(statusBill)

      return statusBill
    })
  }, [bills])

  // Filter upcoming bills (due within 7 days, not paused)
  const upcomingBills = useMemo(() => {
    return billsWithStatus
      .filter((b) => !b.isPaused && (b.isDueSoon || b.isDueToday || b.isOverdue))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }, [billsWithStatus])

  // Filter overdue bills
  const overdueBills = useMemo(() => {
    return billsWithStatus.filter((b) => !b.isPaused && b.isOverdue)
  }, [billsWithStatus])

  const createBill = useCallback(
    async (bill: Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt'>) => {
      return addRecurringBill(bill)
    },
    []
  )

  const updateBill = useCallback(
    async (id: string, updates: Partial<Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt'>>) => {
      await updateRecurringBill(id, updates)
    },
    []
  )

  const deleteBillFn = useCallback(async (id: string) => {
    await deleteRecurringBill(id)
  }, [])

  const markAsPaid = useCallback(async (id: string) => {
    await markBillAsPaid(id)
  }, [])

  const togglePause = useCallback(async (id: string, isPaused: boolean) => {
    await updateRecurringBill(id, { isPaused })
  }, [])

  // Calculate monthly total (normalized from different frequencies)
  const getMonthlyTotal = useCallback(() => {
    if (!bills) return 0

    return bills
      .filter((b) => !b.isPaused)
      .reduce((total, bill) => {
        let monthlyAmount = bill.amount
        switch (bill.frequency) {
          case 'weekly':
            monthlyAmount = bill.amount * 4.33 // avg weeks per month
            break
          case 'quarterly':
            monthlyAmount = bill.amount / 3
            break
          case 'yearly':
            monthlyAmount = bill.amount / 12
            break
          // monthly stays as is
        }
        return total + monthlyAmount
      }, 0)
  }, [bills])

  const getCategoryInfo = useCallback((category: string) => {
    return BILL_CATEGORIES.find((c) => c.key === category)
  }, [])

  return useMemo(
    () => ({
      bills: bills ?? [],
      billsWithStatus,
      upcomingBills,
      overdueBills,
      isLoading,
      createBill,
      updateBill,
      deleteBill: deleteBillFn,
      markAsPaid,
      togglePause,
      getMonthlyTotal,
      getCategoryInfo,
    }),
    [
      bills,
      billsWithStatus,
      upcomingBills,
      overdueBills,
      isLoading,
      createBill,
      updateBill,
      deleteBillFn,
      markAsPaid,
      togglePause,
      getMonthlyTotal,
      getCategoryInfo,
    ]
  )
}
