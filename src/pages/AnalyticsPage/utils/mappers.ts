import type { CategoryKey } from '../types'

/**
 * Map stored category string (sr/slug) to normalized CategoryKey
 */
export function mapCategoryKey(raw: string | undefined): CategoryKey {
  const k = (raw || '').toLowerCase().trim()

  const dict: Record<string, CategoryKey> = {
    // Serbian values
    hrana: 'groceries',
    'hrana i piće': 'groceries',
    elektronika: 'electronics',
    tehnologija: 'electronics',
    odeca: 'clothing',
    odeća: 'clothing',
    zdravlje: 'health',
    dom: 'home',
    'kucni-aparati': 'home',
    'kućni aparati': 'home',
    automobil: 'automotive',
    auto: 'automotive',
    zabava: 'entertainment',
    edukacija: 'education',
    sport: 'sports',
    transport: 'other',
    ostalo: 'other',
  }

  return dict[k] ?? 'other'
}

/**
 * Normalize consumption unit to standard key
 */
export type ConsumptionUnitKey = 'kWh' | 'm³' | 'L' | 'GB' | 'other'

export function normalizeConsumptionUnit(unit?: string): ConsumptionUnitKey {
  if (!unit) return 'other'

  const trimmed = unit.trim()

  if (trimmed === 'kWh' || trimmed.toLowerCase() === 'kwh') return 'kWh'
  if (trimmed === 'm³' || trimmed.toLowerCase() === 'm3') return 'm³'
  if (trimmed === 'L' || trimmed.toLowerCase() === 'l' || trimmed.toLowerCase() === 'litre')
    return 'L'
  if (trimmed.toUpperCase() === 'GB') return 'GB'

  return 'other'
}
