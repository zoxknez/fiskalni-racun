export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
export type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year'
export type ReceiptTab = 'fiscal' | 'household'

export type CategoryFilterOption = {
  value: string
  label: string
  color?: string
}
