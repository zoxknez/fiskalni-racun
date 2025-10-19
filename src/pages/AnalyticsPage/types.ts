// Types for Analytics Page
export type TimePeriod = '3m' | '6m' | '12m' | 'all'

export type CategoryKey =
  | 'groceries'
  | 'electronics'
  | 'clothing'
  | 'health'
  | 'home'
  | 'automotive'
  | 'entertainment'
  | 'education'
  | 'sports'
  | 'other'

export type CategoryDatum = {
  key: CategoryKey
  name: string
  value: number
  color: string
}

export type MonthlyDatum = {
  month: string
  amount: number
  count: number
}

export type MerchantDatum = {
  name: string
  total: number
  count: number
}

export type HouseholdMonthlyDatum = {
  month: string
  total: number
  paid: number
  outstanding: number
}

export type HouseholdTypeDatum = {
  key: string
  label: string
  value: number
  color: string
}

export type HouseholdStatusDatum = {
  key: string
  label: string
  value: number
  color: string
}

export type DateRange = {
  start: Date
  end: Date
}
