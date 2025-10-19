import type { HouseholdBill } from '@lib/db'
import type { CategoryKey } from './types'

// Chart color palette
export const CHART_COLORS = {
  primary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  slate: '#94a3b8',
} as const

// Category colors mapping
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  groceries: CHART_COLORS.success,
  electronics: CHART_COLORS.warning,
  clothing: CHART_COLORS.pink,
  health: CHART_COLORS.danger,
  home: CHART_COLORS.purple,
  automotive: CHART_COLORS.primary,
  entertainment: '#22c55e',
  education: '#06b6d4',
  sports: '#e11d48',
  other: CHART_COLORS.slate,
}

// Category i18n label keys
export const CATEGORY_LABEL_KEYS: Record<CategoryKey, `categories.${CategoryKey}`> = {
  groceries: 'categories.groceries',
  electronics: 'categories.electronics',
  clothing: 'categories.clothing',
  health: 'categories.health',
  home: 'categories.home',
  automotive: 'categories.automotive',
  entertainment: 'categories.entertainment',
  education: 'categories.education',
  sports: 'categories.sports',
  other: 'categories.other',
}

// Household bill type colors
export const HOUSEHOLD_TYPE_COLORS: Record<HouseholdBill['billType'], string> = {
  electricity: '#f97316',
  water: '#0ea5e9',
  gas: '#facc15',
  heating: '#ef4444',
  internet: '#6366f1',
  phone: '#06b6d4',
  tv: '#ec4899',
  rent: '#8b5cf6',
  maintenance: '#22c55e',
  garbage: '#94a3b8',
  other: '#64748b',
}

// Household bill status colors
export const HOUSEHOLD_STATUS_COLORS = {
  pending: '#fbbf24',
  paid: '#10b981',
  overdue: '#ef4444',
} as const

// Household bill status i18n keys
export const HOUSEHOLD_STATUS_LABEL_KEYS: Record<
  HouseholdBill['status'],
  | 'analytics.household.statusLabels.pending'
  | 'analytics.household.statusLabels.paid'
  | 'analytics.household.statusLabels.overdue'
> = {
  pending: 'analytics.household.statusLabels.pending',
  paid: 'analytics.household.statusLabels.paid',
  overdue: 'analytics.household.statusLabels.overdue',
}

// Consumption unit i18n keys
export const CONSUMPTION_UNIT_LABEL_KEYS = {
  kWh: 'analytics.household.consumptionUnits.kwh',
  'm³': 'analytics.household.consumptionUnits.m3',
  L: 'analytics.household.consumptionUnits.l',
  GB: 'analytics.household.consumptionUnits.gb',
  other: 'analytics.household.consumptionUnits.other',
} as const

// Constants
export const UPCOMING_WINDOW_DAYS = 30
