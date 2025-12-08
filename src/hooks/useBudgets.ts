import {
  addBudget,
  type Budget,
  type BudgetPeriod,
  db,
  deleteBudget,
  getAllBudgets,
  updateBudget,
} from '@lib/db'
import { endOfMonth, endOfWeek, endOfYear, startOfMonth, startOfWeek, startOfYear } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'

// Budget colors palette
export const BUDGET_COLORS: string[] = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

export interface BudgetWithSpending extends Budget {
  spent: number
  remaining: number
  percentage: number
  isOverBudget: boolean
  periodStart: Date
  periodEnd: Date
}

export interface UseBudgetsResult {
  budgets: Budget[]
  budgetsWithSpending: BudgetWithSpending[]
  isLoading: boolean
  createBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateBudget: (
    id: string,
    updates: Partial<Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  getNextColor: () => string
  getTotalBudget: () => number
  getTotalSpent: () => number
}

function getPeriodDates(period: BudgetPeriod, now: Date = new Date()): { start: Date; end: Date } {
  switch (period) {
    case 'weekly':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }
    case 'monthly':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'yearly':
      return { start: startOfYear(now), end: endOfYear(now) }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

export function useBudgets(): UseBudgetsResult {
  const budgets = useLiveQuery(() => getAllBudgets(), [], [])
  const isLoading = budgets === undefined

  // Get receipts for spending calculation
  const receipts = useLiveQuery(() => db.receipts.toArray(), [], [])

  // Calculate spending for each budget
  const budgetsWithSpending = useMemo((): BudgetWithSpending[] => {
    if (!budgets || !receipts) return []

    return budgets
      .filter((b) => b.isActive)
      .map((budget) => {
        const { start, end } = getPeriodDates(budget.period)

        // Filter receipts within budget period
        const periodReceipts = receipts.filter((r) => {
          const receiptDate = new Date(r.date)
          return receiptDate >= start && receiptDate <= end
        })

        // Filter by category if specified
        const relevantReceipts = budget.category
          ? periodReceipts.filter((r) => r.category === budget.category)
          : periodReceipts

        const spent = relevantReceipts.reduce((sum, r) => sum + r.totalAmount, 0)
        const remaining = Math.max(0, budget.amount - spent)
        const percentage = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0
        const isOverBudget = spent > budget.amount

        return {
          ...budget,
          spent,
          remaining,
          percentage,
          isOverBudget,
          periodStart: start,
          periodEnd: end,
        }
      })
  }, [budgets, receipts])

  const getNextColor = useCallback((): string => {
    const usedColors = new Set(budgets?.map((b) => b.color) ?? [])
    const availableColor = BUDGET_COLORS.find((c) => !usedColors.has(c))
    return availableColor ?? BUDGET_COLORS[0] ?? '#3B82F6'
  }, [budgets])

  const createBudgetFn = useCallback(
    async (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
      return addBudget(budget)
    },
    []
  )

  const updateBudgetFn = useCallback(
    async (id: string, updates: Partial<Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>>) => {
      await updateBudget(id, updates)
    },
    []
  )

  const deleteBudgetFn = useCallback(async (id: string) => {
    await deleteBudget(id)
  }, [])

  const getTotalBudget = useCallback(() => {
    return budgetsWithSpending.reduce((sum, b) => sum + b.amount, 0)
  }, [budgetsWithSpending])

  const getTotalSpent = useCallback(() => {
    return budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0)
  }, [budgetsWithSpending])

  return useMemo(
    () => ({
      budgets: budgets ?? [],
      budgetsWithSpending,
      isLoading,
      createBudget: createBudgetFn,
      updateBudget: updateBudgetFn,
      deleteBudget: deleteBudgetFn,
      getNextColor,
      getTotalBudget,
      getTotalSpent,
    }),
    [
      budgets,
      budgetsWithSpending,
      isLoading,
      createBudgetFn,
      updateBudgetFn,
      deleteBudgetFn,
      getNextColor,
      getTotalBudget,
      getTotalSpent,
    ]
  )
}
