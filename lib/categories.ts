// lib/categories.ts
// Jače tipizovane kategorije + i18n + heuristika za auto-kategorizaciju (word-boundary scoring + runtime hintovi).

import type React from 'react'

export type Locale = 'sr-Latn' | 'en'

export const ALL_CATEGORY_VALUE = 'all' as const

// Minimalan skup Lucide imena kao string – mapiraš na stvarne ikone tamo gde ih renderuješ.
export type IconName =
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
  color: string // HEX
  icon: IconName
  aliases: string[]
  order: number
}

export const ALL_CATEGORY_OPTION = {
  value: ALL_CATEGORY_VALUE,
  labels: { 'sr-Latn': 'Sve kategorije', en: 'All categories' },
  color: '#64748B',
  icon: 'Ellipsis' as const,
  order: 0,
}

export const RECEIPT_CATEGORIES = [
  {
    value: 'elektronika',
    labels: { 'sr-Latn': 'Elektronika', en: 'Electronics' },
    color: '#3B82F6',
    icon: 'Cpu',
    aliases: [
      'elektronika',
      'tehnika',
      'računar',
      'laptop',
      'telefon',
      'tv',
      'monitor',
      'gigatron',
      'winwin',
      'tehnomanija',
      'tehnomedia',
      'emmezeta',
    ],
    order: 10,
  },
  {
    value: 'hrana',
    labels: { 'sr-Latn': 'Hrana i piće', en: 'Groceries & Food' },
    color: '#10B981',
    icon: 'Utensils',
    aliases: [
      'hrana',
      'piće',
      'prehrana',
      'supermarket',
      'market',
      'lidl',
      'idea',
      'maxi',
      'tempo',
      'univerexport',
      'roda',
    ],
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
export type CategoryFilterValue = CategoryValue | typeof ALL_CATEGORY_VALUE

// ── Indeх mape ────────────────────────────────────────────────────────────────

const CAT_BY_VALUE: Record<CategoryValue, CategoryDef> = RECEIPT_CATEGORIES.reduce(
  (acc, c) => ((acc[c.value] = c), acc),
  {} as Record<CategoryValue, CategoryDef>
)

const ALL_VALUES = RECEIPT_CATEGORIES.map((c) => c.value) as CategoryValue[]

// Normalizacija: lower, strip diacritics
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Tokenizacija za word-boundary matcheve
function tokensOf(s: string) {
  return normalize(s).split(/[^a-z0-9]+/i).filter(Boolean)
}

// ── Merchant hintovi (runtime-proširivo) ──────────────────────────────────────

const MERCHANT_HINT_PRESETS = [
  ['lidl', 'hrana'],
  ['idea', 'hrana'],
  ['maxi', 'hrana'],
  ['tempo', 'hrana'],
  ['univerexport', 'hrana'],
  ['gigatron', 'elektronika'],
  ['winwin', 'elektronika'],
  ['tehnomanija', 'elektronika'],
  ['tehnomedia', 'elektronika'],
  ['emmezeta', 'elektronika'],
  ['ikea', 'dom'],
  ['sport vision', 'sport'],
  ['n sport', 'sport'],
  ['planeta sport', 'sport'],
  ['vulkan', 'knjige'],
  ['delfi', 'knjige'],
  ['dm', 'zdravlje'],
  ['lilly', 'zdravlje'],
  ['omv', 'automobil'],
  ['nis', 'automobil'],
  ['gazprom', 'automobil'],
  ['mol', 'automobil'],
] as const

const MERCHANT_HINTS = (() => {
  const map = new Map<string, CategoryValue>()
  for (const [rawName, value] of MERCHANT_HINT_PRESETS) {
    map.set(normalize(rawName), value)
  }
  return map
})()

export function registerMerchantHint(merchantName: string, value: CategoryValue) {
  MERCHANT_HINTS.set(normalize(merchantName), value)
}
export function clearMerchantHints() {
  MERCHANT_HINTS.clear()
}
export function getMerchantHintsSnapshot(): Record<string, CategoryValue> {
  const o: Record<string, CategoryValue> = {}
  for (const [k, v] of MERCHANT_HINTS.entries()) o[k] = v
  return o
}

// ── Alias → value (precomputed) ───────────────────────────────────────────────

type AliasIndex = { alias: string; value: CategoryValue; weight: number }
const ALIAS_INDEX: AliasIndex[] = (() => {
  const rows: AliasIndex[] = []
  for (const c of RECEIPT_CATEGORIES) {
    for (const a of c.aliases) {
      const norm = normalize(a)
      // teži dužim terminima; plafon 12
      const w = Math.min(norm.length, 12)
      rows.push({ alias: norm, value: c.value, weight: w })
    }
  }
  // duži aliasi pre kraćih, radi determinističnog bodovanja
  rows.sort((a, b) => b.alias.length - a.alias.length)
  return rows
})()

// ── API: dohvat meta i opcije ────────────────────────────────────────────────

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
  return isCategoryValue(v) ? v : undefined
}
export function categoryOptions(locale: Locale = 'sr-Latn', options?: { includeAll?: boolean }) {
  const mapped = [...RECEIPT_CATEGORIES]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ value: c.value, label: c.labels[locale], color: c.color, icon: c.icon }))

  if (options?.includeAll) {
    const allOption = {
      value: ALL_CATEGORY_OPTION.value,
      label: ALL_CATEGORY_OPTION.labels[locale],
      color: ALL_CATEGORY_OPTION.color,
      icon: ALL_CATEGORY_OPTION.icon,
    }
    return [allOption, ...mapped]
  }

  return mapped
}

// ── Heuristika klasifikacije ─────────────────────────────────────────────────

export interface ClassifyOptions {
  /** bonus bodovi ako se pogodak desi u nazivu prodavca */
  merchantBonus?: number
  /** minimalan zbir bodova da bi pogodak prošao (default 6) */
  minScore?: number
}

/**
 * Pokušaj da odredi kategoriju iz naziva prodavca i/ili naziva stavke.
 * 1) Najduži merchant hint koji je podstring (tokens/substring)
 * 2) Word-boundary scoring na aliasima (tokeni i fraze), sa bonusom za merchant deo
 * 3) Fallback: 'ostalo'
 */
export function classifyCategory(
  input: { merchantName?: string; itemName?: string } | string,
  opts: ClassifyOptions = {}
): CategoryValue {
  const merchant = typeof input === 'string' ? '' : input.merchantName ?? ''
  const item = typeof input === 'string' ? input : input.itemName ?? ''
  const merchantNorm = normalize(merchant)
  const itemNorm = normalize(item)
  const merchantTokens = new Set(tokensOf(merchant))
  const itemTokens = new Set(tokensOf(item))
  const text = `${merchantNorm} ${itemNorm}`.trim()

  const merchantBonus = opts.merchantBonus ?? 2
  const minScore = opts.minScore ?? 6

  // 1) Merchant hints – najduži „hint“
  let bestHint: { key: string; value: CategoryValue } | undefined
  for (const [key, value] of MERCHANT_HINTS.entries()) {
    if (key && text.includes(key)) {
      if (!bestHint || key.length > bestHint.key.length) bestHint = { key, value }
    }
  }
  if (bestHint) return bestHint.value

  // 2) Alias scoring (word-boundary/puna reč preferenca + fraze fallback)
  const scores: Record<CategoryValue, number> = Object.create(null)
  for (const { alias, value, weight } of ALIAS_INDEX) {
    // token match (rečna granica)
    if (merchantTokens.has(alias) || itemTokens.has(alias)) {
      const bonus = merchantTokens.has(alias) ? merchantBonus : 0
      scores[value] = (scores[value] ?? 0) + weight + bonus
      continue
    }
    // fraze/substring fallback
    if (alias && text.includes(alias)) {
      scores[value] = (scores[value] ?? 0) + Math.ceil(weight / 2)
    }
  }

  // najbolji rezultat iznad praga
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  if (best && best[1] >= minScore) return best[0] as CategoryValue

  return 'ostalo'
}

// ── UI utili (WCAG kontrast za boju teksta) ──────────────────────────────────

export function getCategoryBadgeStyle(value: string | undefined) {
  const base = getCategoryColor(value)
  const text = bestTextColorWCAG(base)
  return {
    backgroundColor: hexWithAlpha(base, 0.14),
    color: text,
    borderColor: hexWithAlpha(base, 0.3),
  } as React.CSSProperties
}

// ── interne pomoćne ───────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.replace(/(.)/g, '$1$1')
  const int = Number.parseInt(h, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return { r, g, b }
}

function hexWithAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function relLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const t = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * t(r) + 0.7152 * t(g) + 0.0722 * t(b)
}

function contrastRatio(fgHex: string, bgHex: string) {
  const L1 = relLuminance(hexToRgb(fgHex))
  const L2 = relLuminance(hexToRgb(bgHex))
  const light = Math.max(L1, L2)
  const dark = Math.min(L1, L2)
  return (light + 0.05) / (dark + 0.05)
}

/** Biramo tekst #ffffff ili #111827 na osnovu većeg WCAG kontrasta u odnosu na BG. */
function bestTextColorWCAG(bgHex: string) {
  const white = '#FFFFFF'
  const dark = '#111827' // slate-900
  const cW = contrastRatio(white, bgHex)
  const cD = contrastRatio(dark, bgHex)
  return cW >= cD ? white : dark
}
