// lib/categories.ts
// Jače tipizovane kategorije + i18n + heuristika za auto-kategorizaciju.

export type Locale = 'sr-Latn' | 'en'

// Minimalan skup Lucide imena kao string – možeš mapirati na stvarne ikone onde gde ih renderuješ.
type IconName =
  | 'Cpu'
  | 'Utensils'
  | 'Shirt'
  | 'Plug'
  | 'Car'
  | 'HeartPulse'
  | 'Home'
  | 'Dumbbell'
  | 'BookOpen'
  | 'Wrench'
  | 'Gamepad2'
  | 'Ellipsis'

export interface CategoryDef<T extends string = string> {
  value: T
  labels: Record<Locale, string>
  color: string // HEX za glavni akcent
  icon: IconName
  // sinonimi/ključevi za heuristiku
  aliases: string[]
  order: number
}

export const RECEIPT_CATEGORIES = [
  {
    value: 'elektronika',
    labels: { 'sr-Latn': 'Elektronika', en: 'Electronics' },
    color: '#3B82F6',
    icon: 'Cpu',
    aliases: ['elektronika', 'tehnika', 'računar', 'laptop', 'telefon', 'tv', 'monitor', 'gigatron', 'winwin', 'tehnomanija', 'tehnomedia', 'emmezeta'],
    order: 10,
  },
  {
    value: 'hrana',
    labels: { 'sr-Latn': 'Hrana i piće', en: 'Groceries & Food' },
    color: '#10B981',
    icon: 'Utensils',
    aliases: ['hrana', 'piće', 'prehrana', 'supermarket', 'market', 'lidl', 'idea', 'maxi', 'tempo', 'univerexport', 'roda'],
    order: 20,
  },
  {
    value: 'odeca',
    labels: { 'sr-Latn': 'Odeća i obuća', en: 'Clothing & Shoes' },
    color: '#8B5CF6',
    icon: 'Shirt',
    aliases: ['odeća', 'obuca', 'obuća', 'moda', 'fashion', 'zara', 'hm', 'bershka', 'nike', 'adidas'],
    order: 30,
  },
  {
    value: 'kucni-aparati',
    labels: { 'sr-Latn': 'Kućni aparati', en: 'Home Appliances' },
    color: '#F59E0B',
    icon: 'Plug',
    aliases: ['aparati', 'usisivač', 'frižider', 'veš', 'šporet', 'mikrotalasna', 'klima', 'bela tehnika'],
    order: 40,
  },
  {
    value: 'automobil',
    labels: { 'sr-Latn': 'Automobil', en: 'Auto' },
    color: '#EF4444',
    icon: 'Car',
    aliases: ['gorivo', 'servis', 'gume', 'ulje', 'omv', 'nis', 'gazprom', 'mol', 'euro petrol'],
    order: 50,
  },
  {
    value: 'zdravlje',
    labels: { 'sr-Latn': 'Zdravlje i lepota', en: 'Health & Beauty' },
    color: '#EC4899',
    icon: 'HeartPulse',
    aliases: ['apoteka', 'lek', 'kozmetika', 'dm', 'lilly', 'dermatolog', 'stomatolog'],
    order: 60,
  },
  {
    value: 'dom',
    labels: { 'sr-Latn': 'Dom i bašta', en: 'Home & Garden' },
    color: '#14B8A6',
    icon: 'Home',
    aliases: ['bašta', 'ikea', 'uradi sam', 'rasveta', 'nameštaj', 'boje', 'alati za dom'],
    order: 70,
  },
  {
    value: 'sport',
    labels: { 'sr-Latn': 'Sport i rekreacija', en: 'Sport & Fitness' },
    color: '#F97316',
    icon: 'Dumbbell',
    aliases: ['teretana', 'oprema', 'sport vision', 'n sport', 'planeta sport', 'decathlon'],
    order: 80,
  },
  {
    value: 'knjige',
    labels: { 'sr-Latn': 'Knjige i mediji', en: 'Books & Media' },
    color: '#6366F1',
    icon: 'BookOpen',
    aliases: ['knjiga', 'vulkan', 'delfi', 'časopis', 'strip', 'udžbenik'],
    order: 90,
  },
  {
    value: 'usluge',
    labels: { 'sr-Latn': 'Usluge', en: 'Services' },
    color: '#84CC16',
    icon: 'Wrench',
    aliases: ['servis', 'majstor', 'popravka', 'članarina', 'održavanje'],
    order: 100,
  },
  {
    value: 'zabava',
    labels: { 'sr-Latn': 'Zabava', en: 'Entertainment' },
    color: '#A855F7',
    icon: 'Gamepad2',
    aliases: ['bioskop', 'streaming', 'igra', 'game', 'konzola', 'koncert', 'pozorište'],
    order: 110,
  },
  {
    value: 'ostalo',
    labels: { 'sr-Latn': 'Ostalo', en: 'Other' },
    color: '#6B7280',
    icon: 'Ellipsis',
    aliases: ['ostalo', 'misc', 'razno'],
    order: 999,
  },
] as const satisfies readonly CategoryDef[]

export type CategoryValue = (typeof RECEIPT_CATEGORIES)[number]['value']

// O(1) mape
const CAT_BY_VALUE: Record<CategoryValue, CategoryDef> = RECEIPT_CATEGORIES.reduce(
  (acc, c) => ((acc[c.value] = c), acc),
  {} as Record<CategoryValue, CategoryDef>
)

const ALL_VALUES = RECEIPT_CATEGORIES.map((c) => c.value) as CategoryValue[]

// Brza mapa aliasa → vrednost kategorije
const ALIAS_TO_VALUE = (() => {
  const map = new Map<string, CategoryValue>()
  for (const c of RECEIPT_CATEGORIES) {
    for (const a of c.aliases) map.set(normalize(a), c.value)
  }
  return map
})()

// Merchant „hintovi“ (možeš proširivati u runtime-u)
const MERCHANT_HINTS: Record<string, CategoryValue> = {
  lidl: 'hrana',
  idea: 'hrana',
  maxi: 'hrana',
  tempo: 'hrana',
  univerexport: 'hrana',
  gigatron: 'elektronika',
  winwin: 'elektronika',
  tehnomanija: 'elektronika',
  tehnomedia: 'elektronika',
  emmezeta: 'elektronika',
  ikea: 'dom',
  'sport vision': 'sport',
  'n sport': 'sport',
  'planeta sport': 'sport',
  vulkan: 'knjige',
  delfi: 'knjige',
  dm: 'zdravlje',
  lilly: 'zdravlje',
  omv: 'automobil',
  'nis': 'automobil',
  gazprom: 'automobil',
  mol: 'automobil',
}

export function getCategoryDef(value: string | undefined): CategoryDef {
  return CAT_BY_VALUE[normalizeToValue(value) ?? 'ostalo']
}

export function getCategoryLabel(value: string | undefined, locale: Locale = 'sr-Latn'): string {
  return getCategoryDef(value).labels[locale]
}

export function getCategoryColor(value: string | undefined): string {
  return getCategoryDef(value).color
}

export function getCategoryIcon(value: string | undefined): IconName {
  return getCategoryDef(value).icon
}

export function isCategoryValue(v: string | undefined): v is CategoryValue {
  return v != null && (ALL_VALUES as readonly string[]).includes(v)
}

export function normalizeToValue(v: string | undefined): CategoryValue | undefined {
  if (!v) return undefined
  return isCategoryValue(v) ? (v as CategoryValue) : undefined
}

export function categoryOptions(locale: Locale = 'sr-Latn') {
  return [...RECEIPT_CATEGORIES].sort((a, b) => a.order - b.order).map((c) => ({
    value: c.value,
    label: c.labels[locale],
    color: c.color,
    icon: c.icon,
  }))
}

// ── Heuristika klasifikacije ───────────────────────────────────────────────────

/**
 * Pokušaj da odredi kategoriju iz naziva prodavca i/ili naziva stavke.
 * 1) Merchant hint (tačni i „contains“ pogoci)
 * 2) Alias/ključna reč u item/merchant stringu
 * 3) Fallback: 'ostalo'
 */
export function classifyCategory(
  input: { merchantName?: string; itemName?: string } | string
): CategoryValue {
  const text =
    typeof input === 'string'
      ? normalize(input)
      : `${normalize(input.merchantName ?? '')} ${normalize(input.itemName ?? '')}`.trim()

  // 1) Merchant hints – tražimo najduži „hint“ koji je podstring
  let best: { key: string; value: CategoryValue } | undefined
  for (const key of Object.keys(MERCHANT_HINTS)) {
    if (text.includes(normalize(key))) {
      if (!best || key.length > best.key.length) {
        best = { key, value: MERCHANT_HINTS[key] }
      }
    }
  }
  if (best) return best.value

  // 2) Alias pogoci – skupljamo bodove po dužini reči
  const score: Record<CategoryValue, number> = Object.create(null)
  for (const [alias, val] of ALIAS_TO_VALUE.entries()) {
    if (alias && text.includes(alias)) {
      score[val] = (score[val] ?? 0) + Math.min(alias.length, 12)
    }
  }
  const bestAlias = Object.entries(score).sort((a, b) => b[1] - a[1])[0]
  if (bestAlias) return bestAlias[0] as CategoryValue

  // 3) Fallback
  return 'ostalo'
}

// ── UI utili (kontrastno bezbedne boje čipa/badge-a) ──────────────────────────

export function getCategoryBadgeStyle(value: string | undefined) {
  const base = getCategoryColor(value)
  return {
    backgroundColor: hexWithAlpha(base, 0.15),
    color: bestTextColor(base),
    borderColor: hexWithAlpha(base, 0.3),
  } as React.CSSProperties
}

// ── interne pomoćne ────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

function hexWithAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

function bestTextColor(hex: string) {
  const L = luminance(hexToRgb(hex))
  // prag ~0.5 – vraća tamni tekst za svetle pozadine i obrnuto
  return L > 0.5 ? '#111827' /* slate-900 */ : '#FFFFFF'
}
