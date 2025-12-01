/**
 * Translation Helper Script
 *
 * Utility to help with manual translation of Croatian and Slovenian
 *
 * Usage:
 * 1. Open src/i18n/translations.ts (Serbian - baseline)
 * 2. Copy each section to translations-hr.ts or translations-sl.ts
 * 3. Translate values (keep keys the same!)
 * 4. Run this script to validate structure matches
 */

import { translations } from '../src/i18n/translations'
import { translationsHr } from '../src/i18n/translations-hr'
import { translationsSl } from '../src/i18n/translations-sl'

// ═══════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys.sort()
}

function compareKeys(
  lang1Keys: string[],
  lang2Keys: string[],
  lang1Name: string,
  lang2Name: string
) {
  const missing = lang1Keys.filter((k) => !lang2Keys.includes(k))
  const extra = lang2Keys.filter((k) => !lang1Keys.includes(k))

  console.log(`\n📊 Comparing ${lang1Name} vs ${lang2Name}:`)
  console.log(`  ${lang1Name}: ${lang1Keys.length} keys`)
  console.log(`  ${lang2Name}: ${lang2Keys.length} keys`)

  if (missing.length > 0) {
    console.log(`\n  ⚠️  Missing in ${lang2Name}: ${missing.length} keys`)
    if (missing.length <= 20) {
      for (const k of missing) {
        console.log(`    - ${k}`)
      }
    } else {
      for (const k of missing.slice(0, 10)) {
        console.log(`    - ${k}`)
      }
      console.log(`    ... and ${missing.length - 10} more`)
    }
  }

  if (extra.length > 0) {
    console.log(`\n  ⚠️  Extra in ${lang2Name}: ${extra.length} keys`)
    if (extra.length <= 20) {
      for (const k of extra) {
        console.log(`    - ${k}`)
      }
    }
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log('  ✅ Perfect match!')
  }

  return { missing, extra }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

console.log('🌍 Translation Validation Tool\n')
console.log('='.repeat(60))

// Get all keys from each language
const srKeys = getAllKeys(translations.sr.translation)
const enKeys = getAllKeys(translations.en.translation)
const hrKeys = getAllKeys(translationsHr.hr.translation)
const slKeys = getAllKeys(translationsSl.sl.translation)

// Compare Serbian (baseline) with others
console.log('\n\n1️⃣  SERBIAN (Baseline)')
console.log('='.repeat(60))
console.log(`Total keys: ${srKeys.length}`)

console.log('\n\n2️⃣  ENGLISH')
console.log('='.repeat(60))
const enComparison = compareKeys(srKeys, enKeys, 'Serbian', 'English')

console.log('\n\n3️⃣  CROATIAN')
console.log('='.repeat(60))
const hrComparison = compareKeys(srKeys, hrKeys, 'Serbian', 'Croatian')

console.log('\n\n4️⃣  SLOVENIAN')
console.log('='.repeat(60))
const slComparison = compareKeys(srKeys, slKeys, 'Serbian', 'Slovenian')

// Summary
console.log('\n\n📋 SUMMARY')
console.log('='.repeat(60))
console.log('\n✅ Complete:')
if (enComparison.missing.length === 0) console.log('  - English')
if (hrComparison.missing.length === 0) console.log('  - Croatian')
if (slComparison.missing.length === 0) console.log('  - Slovenian')

console.log('\n⏳ Incomplete (needs translation):')
if (hrComparison.missing.length > 0) {
  const percent = (((srKeys.length - hrComparison.missing.length) / srKeys.length) * 100).toFixed(1)
  console.log(`  - Croatian: ${percent}% complete (${hrComparison.missing.length} keys missing)`)
}
if (slComparison.missing.length > 0) {
  const percent = (((srKeys.length - slComparison.missing.length) / srKeys.length) * 100).toFixed(1)
  console.log(`  - Slovenian: ${percent}% complete (${slComparison.missing.length} keys missing)`)
}

console.log('\n\n💡 Next Steps:')
console.log('='.repeat(60))
console.log('1. Open src/i18n/translations-hr.ts')
console.log('2. Copy sections from translations.ts (sr)')
console.log('3. Translate values to Croatian (keep keys same!)')
console.log('4. Repeat for translations-sl.ts (Slovenian)')
console.log('5. Run this script again to validate')
console.log('\n📖 Priority sections to translate first:')
console.log('   - nav.* (Navigation)')
console.log('   - common.* (Common UI)')
console.log('   - errors.* (Error messages)')
console.log('   - auth.* (Authentication)')
console.log('')

// Export missing keys for easier translation
export function getMissingKeys(lang: 'hr' | 'sl') {
  const comparison = lang === 'hr' ? hrComparison : slComparison
  return comparison.missing
}

export function exportMissingToFile(lang: 'hr' | 'sl', outputPath: string) {
  const missing = getMissingKeys(lang)
  const content = `# Missing ${lang.toUpperCase()} Translations\n\nTotal: ${missing.length} keys\n\n${missing.map((k) => `- [ ] ${k}`).join('\n')}`

  // In Node.js environment, write to file
  if (typeof require !== 'undefined') {
    const fs = require('fs')
    fs.writeFileSync(outputPath, content)
    console.log(`\n✅ Exported missing keys to: ${outputPath}`)
  }
}
