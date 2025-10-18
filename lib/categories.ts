/**
 * Canonical receipt/device categories with localized labels and normalizers.
 */

export type ReceiptCategory = 'groceries' | 'electronics' | 'clothing' | 'home' | 'health' | 'other'

export type DeviceCategory = 'electronics' | 'home-appliances' | 'automobile' | 'sport' | 'other'

export type Locale = 'sr' | 'sr-latn' | 'en' | string

export type CategoryValue = ReceiptCategory
export type Category = ReceiptCategory

export const ALL_CATEGORY_VALUE = 'all' as const

export const receiptCategoryValues: readonly ReceiptCategory[] = [
  'groceries',
  'electronics',
  'clothing',
  'home',
  'health',
  'other',
] as const

export const deviceCategoryValues: readonly DeviceCategory[] = [
  'electronics',
  'home-appliances',
  'automobile',
  'sport',
  'other',
] as const

const RECEIPT_LABELS_SR: Record<ReceiptCategory, string> = {
  groceries: 'Namirnice',
  electronics: 'Elektronika',
  clothing: 'Odeća',
  home: 'Dom',
  health: 'Zdravlje',
  other: 'Ostalo',
}

const RECEIPT_LABELS_EN: Record<ReceiptCategory, string> = {
  groceries: 'Groceries',
  electronics: 'Electronics',
  clothing: 'Clothing',
  home: 'Home',
  health: 'Health',
  other: 'Other',
}

const RECEIPT_COLORS: Record<ReceiptCategory, string> = {
  groceries: '#10B981',
  electronics: '#3B82F6',
  clothing: '#8B5CF6',
  home: '#14B8A6',
  health: '#F97316',
  other: '#6B7280',
}

const DEVICE_LABELS_SR: Record<DeviceCategory, string> = {
  electronics: 'Elektronika',
  'home-appliances': 'Kućni aparati',
  automobile: 'Automobil',
  sport: 'Sport',
  other: 'Ostalo',
}

const DEVICE_LABELS_EN: Record<DeviceCategory, string> = {
  electronics: 'Electronics',
  'home-appliances': 'Home appliances',
  automobile: 'Automobile',
  sport: 'Sport',
  other: 'Other',
}

const ALL_LABELS = {
  sr: 'Sve kategorije',
  en: 'All categories',
}

const ALL_CATEGORY_COLOR = '#64748B'

const pickLang = (lng?: Locale) =>
  String(lng ?? '')
    .toLowerCase()
    .startsWith('sr')
    ? 'sr'
    : 'en'

const coerceReceiptCategory = (value: string | undefined): ReceiptCategory => {
  const normalized = normalizeReceiptCategory(value)
  return normalized ?? 'other'
}

const coerceDeviceCategory = (value: string | undefined): DeviceCategory => {
  const normalized = normalizeDeviceCategory(value)
  return normalized ?? 'other'
}

export const receiptCategoryLabel = (value: string, lng?: Locale) => {
  const lang = pickLang(lng)
  const key = coerceReceiptCategory(value)
  return lang === 'sr' ? RECEIPT_LABELS_SR[key] : RECEIPT_LABELS_EN[key]
}

export const deviceCategoryLabel = (value: string, lng?: Locale) => {
  const lang = pickLang(lng)
  const key = coerceDeviceCategory(value)
  return lang === 'sr' ? DEVICE_LABELS_SR[key] : DEVICE_LABELS_EN[key]
}

export interface CategoryOption {
  value: ReceiptCategory | typeof ALL_CATEGORY_VALUE
  label: string
  color: string
}

export const receiptCategoryOptions = (lng?: Locale): CategoryOption[] => {
  return receiptCategoryValues.map((value) => ({
    value,
    label: receiptCategoryLabel(value, lng),
    color: RECEIPT_COLORS[value],
  }))
}

export interface DeviceCategoryOption {
  value: DeviceCategory | ''
  label: string
}

export const deviceCategoryOptions = (lng?: Locale): DeviceCategoryOption[] => {
  const lang = pickLang(lng)
  return deviceCategoryValues.map((value) => ({
    value,
    label: lang === 'sr' ? DEVICE_LABELS_SR[value] : DEVICE_LABELS_EN[value],
  }))
}

export const categoryOptions = (
  lng?: Locale,
  options?: { includeAll?: boolean }
): CategoryOption[] => {
  const base = receiptCategoryOptions(lng)
  if (!options?.includeAll) {
    return base
  }

  const lang = pickLang(lng)
  return [
    {
      value: ALL_CATEGORY_VALUE,
      label: lang === 'sr' ? ALL_LABELS.sr : ALL_LABELS.en,
      color: ALL_CATEGORY_COLOR,
    },
    ...base,
  ]
}

export const getCategoryLabel = (value?: string, lng?: Locale) =>
  receiptCategoryLabel(value ?? 'other', lng)

export function classifyCategory(input: {
  merchantName?: string
  itemsText?: string
}): ReceiptCategory {
  const hay = `${input.merchantName ?? ''} ${input.itemsText ?? ''}`.toLowerCase()

  if (/(maxi|idea|tempo|roda|lidl|dm|jysk|ikea|market|super|grocery|food)/i.test(hay)) {
    return 'groceries'
  }
  if (/(tehnomanija|gigatron|computer|laptop|phone|tv|monitor|electronics)/i.test(hay)) {
    return 'electronics'
  }
  if (/(zara|h&m|deichmann|shoe|pant|shirt|dress|clothing)/i.test(hay)) return 'clothing'
  if (/(home|house|interior|sofa|bed|matress|jysk|ikea)/i.test(hay)) return 'home'
  if (/(pharmacy|apoteka|health|drug|medicine)/i.test(hay)) return 'health'
  return 'other'
}

export function normalizeReceiptCategory(v?: unknown): ReceiptCategory {
  const raw = String(v ?? '')
    .trim()
    .toLowerCase()
  if (receiptCategoryValues.includes(raw as ReceiptCategory)) {
    return raw as ReceiptCategory
  }

  if (
    ['namirnice', 'prehrana', 'prehrambeni', 'hrana', 'food', 'grocer'].some(
      (alias) => raw === alias
    )
  ) {
    return 'groceries'
  }
  if (['elektronika', 'tehnika', 'electronics'].includes(raw)) {
    return 'electronics'
  }
  if (['odeca', 'odeća', 'garments', 'clothes', 'clothing'].includes(raw)) {
    return 'clothing'
  }
  if (['dom', 'kuća', 'kuca', 'homegoods', 'home-goods', 'home'].includes(raw)) {
    return 'home'
  }
  if (['zdravlje', 'apoteka', 'health', 'pharmacy'].includes(raw)) {
    return 'health'
  }
  return 'other'
}

export function normalizeDeviceCategory(v?: unknown): DeviceCategory {
  const raw = String(v ?? '')
    .trim()
    .toLowerCase()
  if (deviceCategoryValues.includes(raw as DeviceCategory)) {
    return raw as DeviceCategory
  }

  if (['elektronika', 'tehnika', 'electronics'].includes(raw)) {
    return 'electronics'
  }
  if (
    [
      'kucni-aparati',
      'kućni aparati',
      'kucni aparati',
      'appliances',
      'homeappliances',
      'home-appliance',
    ].includes(raw)
  ) {
    return 'home-appliances'
  }
  if (['auto', 'vozilo', 'automobil', 'car'].includes(raw)) {
    return 'automobile'
  }
  if (['sport', 'sports'].includes(raw)) {
    return 'sport'
  }
  return 'other'
}
