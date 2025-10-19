import type { HouseholdBill, Receipt } from '@lib/db'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HOUSEHOLD_STATUS_LABEL_KEYS, HOUSEHOLD_TYPE_COLORS } from '../constants'
import type { DateRange } from '../types'
import {
  calculateCategoryData,
  calculateHouseholdMonthlyData,
  calculateHouseholdStats,
  calculateHouseholdStatusData,
  calculateHouseholdTypeData,
  calculateMonthlyData,
  calculateTopMerchants,
  getUpcomingBills,
} from '../utils/calculations'

/**
 * Hook for analytics calculations
 */
export function useAnalyticsStats(
  receipts: Receipt[],
  householdBills: HouseholdBill[],
  dateRange: DateRange
) {
  const { t } = useTranslation()

  // Create type-safe translator wrapper
  const translator = useCallback((key: string) => t(key as never), [t])

  // Monthly spending data
  const monthlyData = useMemo(
    () => calculateMonthlyData(receipts, dateRange),
    [receipts, dateRange]
  )

  // Category breakdown
  const categoryData = useMemo(
    () => calculateCategoryData(receipts, translator),
    [receipts, translator]
  )

  // Top merchants
  const topMerchants = useMemo(() => calculateTopMerchants(receipts, 5), [receipts])

  // Household monthly data
  const householdMonthlyData = useMemo(
    () => calculateHouseholdMonthlyData(householdBills, dateRange),
    [householdBills, dateRange]
  )

  // Household type breakdown
  const householdTypeData = useMemo(
    () => calculateHouseholdTypeData(householdBills, translator, HOUSEHOLD_TYPE_COLORS),
    [householdBills, translator]
  )

  // Household status breakdown
  const householdStatusData = useMemo(
    () => calculateHouseholdStatusData(householdBills, translator, HOUSEHOLD_STATUS_LABEL_KEYS),
    [householdBills, translator]
  )

  // Upcoming bills
  const upcomingBills = useMemo(() => getUpcomingBills(householdBills, 30, 4), [householdBills])

  // Household stats
  const householdStats = useMemo(
    () => calculateHouseholdStats(householdBills, upcomingBills.length),
    [householdBills, upcomingBills.length]
  )

  return {
    monthlyData,
    categoryData,
    topMerchants,
    householdMonthlyData,
    householdTypeData,
    householdStatusData,
    upcomingBills,
    householdStats,
  }
}
