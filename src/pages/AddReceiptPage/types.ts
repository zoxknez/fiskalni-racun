// AddReceiptPage Types
// ──────────────────────────────────────────────────────────────────────────────

import type {
  HouseholdBillStatus,
  HouseholdBillType,
  HouseholdConsumptionUnit,
} from '@lib/household'

export type ReceiptType = 'fiscal' | 'household' | null

export interface FiscalFormState {
  merchantName: string
  date: string
  amount: string
  notes: string
  tags: string[]
  selectedImage: File | null
  imagePreviewUrl: string | null
}

export interface HouseholdFormState {
  billType: HouseholdBillType
  provider: string
  accountNumber: string
  amount: string
  billingPeriodStart: string
  billingPeriodEnd: string
  dueDate: string
  paymentDate: string
  status: HouseholdBillStatus
  consumptionValue: string
  consumptionUnit: HouseholdConsumptionUnit
  notes: string
}

export interface ReceiptTypeOption {
  id: 'fiscal' | 'household'
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  shadow: string
  titleKey: string
  descriptionKey: string
}
