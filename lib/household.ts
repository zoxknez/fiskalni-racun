import type { Locale } from '@lib/categories'

export type HouseholdBillType =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'heating'
  | 'internet'
  | 'phone'
  | 'tv'
  | 'rent'
  | 'maintenance'
  | 'garbage'
  | 'other'

export type HouseholdBillStatus = 'pending' | 'paid' | 'overdue'

export type HouseholdConsumptionUnit = 'kWh' | 'm³' | 'L' | 'GB' | 'other'

const pickLang = (lng?: Locale) =>
  String(lng ?? '')
    .toLowerCase()
    .startsWith('sr')
    ? 'sr'
    : 'en'

const BILL_TYPE_LABELS_SR: Record<HouseholdBillType, string> = {
  electricity: 'Struja',
  water: 'Voda',
  gas: 'Gas',
  heating: 'Grejanje',
  internet: 'Internet',
  phone: 'Telefon',
  tv: 'TV / Kabl',
  rent: 'Kirija',
  maintenance: 'Održavanje',
  garbage: 'Smeće',
  other: 'Ostalo',
}

const BILL_TYPE_LABELS_EN: Record<HouseholdBillType, string> = {
  electricity: 'Electricity',
  water: 'Water',
  gas: 'Gas',
  heating: 'Heating',
  internet: 'Internet',
  phone: 'Phone',
  tv: 'TV / Cable',
  rent: 'Rent',
  maintenance: 'Maintenance',
  garbage: 'Garbage',
  other: 'Other',
}

const BILL_STATUS_LABELS_SR: Record<HouseholdBillStatus, string> = {
  pending: 'U pripremi',
  paid: 'Plaćeno',
  overdue: 'Dospeo',
}

const BILL_STATUS_LABELS_EN: Record<HouseholdBillStatus, string> = {
  pending: 'Upcoming',
  paid: 'Paid',
  overdue: 'Overdue',
}

const CONSUMPTION_UNIT_LABELS: Record<HouseholdConsumptionUnit, { sr: string; en: string }> = {
  kWh: { sr: 'kWh', en: 'kWh' },
  'm³': { sr: 'm³', en: 'm³' },
  L: { sr: 'L', en: 'L' },
  GB: { sr: 'GB', en: 'GB' },
  other: { sr: 'Drugo', en: 'Other' },
}

export const getHouseholdBillTypeLabel = (value: HouseholdBillType, lng?: Locale) =>
  pickLang(lng) === 'sr' ? BILL_TYPE_LABELS_SR[value] : BILL_TYPE_LABELS_EN[value]

export const getHouseholdBillStatusLabel = (value: HouseholdBillStatus, lng?: Locale) =>
  pickLang(lng) === 'sr' ? BILL_STATUS_LABELS_SR[value] : BILL_STATUS_LABELS_EN[value]

export const householdBillTypeOptions = (lng?: Locale) =>
  (Object.keys(BILL_TYPE_LABELS_EN) as HouseholdBillType[]).map((value) => ({
    value,
    label: getHouseholdBillTypeLabel(value, lng),
  }))

export const householdBillStatusOptions = (lng?: Locale) =>
  (Object.keys(BILL_STATUS_LABELS_EN) as HouseholdBillStatus[]).map((value) => ({
    value,
    label: getHouseholdBillStatusLabel(value, lng),
  }))

export const householdConsumptionUnits: HouseholdConsumptionUnit[] = [
  'kWh',
  'm³',
  'L',
  'GB',
  'other',
]

export const householdConsumptionUnitOptions = (lng?: Locale) => {
  const lang = pickLang(lng)
  return householdConsumptionUnits.map((unit) => ({
    value: unit,
    label: CONSUMPTION_UNIT_LABELS[unit][lang],
  }))
}
