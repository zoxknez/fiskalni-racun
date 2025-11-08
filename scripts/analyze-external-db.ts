// scripts/analyze-external-db.ts
// Skripta za analizu eksterne SQLite baze i generisanje izveštaja

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'

// Učitaj putanju iz environment varijable
const DB_PATH = process.env.EXTERNAL_DB_PATH || './data/MojRacun.db'
const OUTPUT_PATH = join(process.cwd(), 'izvestaji', 'ANALIZA-EKSTERNE-BAZE.md')

if (!process.env.EXTERNAL_DB_PATH) {
  console.warn(
    '⚠️  EXTERNAL_DB_PATH nije postavljena u environment varijablama.\n' +
      `   Koristi se fallback putanja: ${DB_PATH}\n` +
      '   Postavi EXTERNAL_DB_PATH u .env fajlu.\n'
  )
}

interface TableInfo {
  name: string
  sql: string
  rowCount: number
  columns: Array<{
    cid: number
    name: string
    type: string
    notnull: number
    dflt_value: string | null
    pk: number
  }>
  indexes: Array<{
    seq: number
    name: string
    unique: number
    origin: string
    partial: number
  }>
  sampleData: Record<string, unknown>[]
}

function analyzeDatabase(dbPath: string): TableInfo[] {
  const db = new Database(dbPath, { readonly: true })
  const tables: TableInfo[] = []

  try {
    // Dobavi sve tabele
    const tableRows = db
      .prepare(
        `
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
      )
      .all() as Array<{ name: string; sql: string }>

    console.log(`📊 Pronađeno ${tableRows.length} tabela\n`)

    for (const table of tableRows) {
      console.log(`Analiziram tabelu: ${table.name}`)

      // Informacije o kolonama
      const columns = db.pragma(`table_info(${table.name})`) as Array<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>

      // Informacije o indeksima
      const indexes = db.pragma(`index_list(${table.name})`) as Array<{
        seq: number
        name: string
        unique: number
        origin: string
        partial: number
      }>

      // Broj redova
      const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as {
        count: number
      }
      const rowCount = countResult.count

      // Uzmi prvih 5 redova kao uzorak
      let sampleData: Record<string, unknown>[] = []
      if (rowCount > 0) {
        sampleData = db.prepare(`SELECT * FROM ${table.name} LIMIT 5`).all() as Record<
          string,
          unknown
        >[]
      }

      tables.push({
        name: table.name,
        sql: table.sql,
        rowCount,
        columns,
        indexes,
        sampleData,
      })
    }

    console.log('\n✅ Analiza završena!')
    return tables
  } finally {
    db.close()
  }
}

function generateMarkdownReport(tables: TableInfo[]): string {
  const lines: string[] = []

  lines.push('# Analiza Eksterne SQLite Baze (MojRacun.db)')
  lines.push('')
  lines.push(`**Datum analize:** ${new Date().toLocaleString('sr-RS')}`)
  lines.push(`**Lokacija baze:** \`${DB_PATH}\``)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Pregled tabela
  lines.push('## 📋 Pregled Tabela')
  lines.push('')
  lines.push('| Tabela | Broj redova | Broj kolona | Indeksi |')
  lines.push('|--------|-------------|-------------|---------|')

  for (const table of tables) {
    lines.push(
      `| \`${table.name}\` | ${table.rowCount} | ${table.columns.length} | ${table.indexes.length} |`
    )
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Detaljne informacije za svaku tabelu
  for (const table of tables) {
    lines.push(`## 🗂️ Tabela: \`${table.name}\``)
    lines.push('')
    lines.push(`**Broj redova:** ${table.rowCount}`)
    lines.push('')

    // CREATE TABLE statement
    lines.push('### SQL Definicija')
    lines.push('')
    lines.push('```sql')
    lines.push(table.sql)
    lines.push('```')
    lines.push('')

    // Kolone
    lines.push('### Kolone')
    lines.push('')
    lines.push('| # | Naziv | Tip | NOT NULL | Default | Primary Key |')
    lines.push('|---|-------|-----|----------|---------|-------------|')

    for (const col of table.columns) {
      lines.push(
        `| ${col.cid} | \`${col.name}\` | ${col.type || 'TEXT'} | ${col.notnull ? '✅' : ''} | ${col.dflt_value || ''} | ${col.pk ? '🔑' : ''} |`
      )
    }
    lines.push('')

    // Indeksi
    if (table.indexes.length > 0) {
      lines.push('### Indeksi')
      lines.push('')
      lines.push('| Naziv | Unique | Origin |')
      lines.push('|-------|--------|--------|')

      for (const idx of table.indexes) {
        lines.push(
          `| \`${idx.name}\` | ${idx.unique ? '✅' : ''} | ${idx.origin === 'c' ? 'CREATE INDEX' : idx.origin === 'u' ? 'UNIQUE' : 'AUTO'} |`
        )
      }
      lines.push('')
    }

    // Uzorak podataka
    if (table.sampleData.length > 0) {
      lines.push('### Uzorak Podataka (prvih 5 redova)')
      lines.push('')
      lines.push('```json')
      lines.push(JSON.stringify(table.sampleData, null, 2))
      lines.push('```')
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  // Mapiranje na našu strukturu
  lines.push('## 🔄 Mapiranje na Fiskalni-Račun Strukturu')
  lines.push('')
  lines.push('### Preporuke za Migraciju')
  lines.push('')
  lines.push('Na osnovu analize, potrebno je:')
  lines.push('')
  lines.push('1. **Identifikovati odgovarajuće tabele:**')
  lines.push('   - Pronađi tabele sa računima/fiskalnim računima')
  lines.push('   - Pronađi tabele sa artiklima/stavkama')
  lines.push('   - Pronađi tabele sa kategorijama')
  lines.push('')
  lines.push('2. **Mapirati kolone:**')
  lines.push(
    '   - `Receipt` interfejs: merchantName, pib, date, time, totalAmount, items, category'
  )
  lines.push('   - `ReceiptItem` interfejs: name, quantity, price, total')
  lines.push('')
  lines.push('3. **Kreirati import skriptu:**')
  lines.push('   - Pročitaj SQLite bazu')
  lines.push('   - Transformiši podatke u Dexie format')
  lines.push('   - Import u IndexedDB')
  lines.push('')

  return lines.join('\n')
}

// Main execution
try {
  console.log('🔍 Pokrećem analizu baze...\n')
  const tables = analyzeDatabase(DB_PATH)

  console.log('\n📝 Generiram Markdown izveštaj...')
  const report = generateMarkdownReport(tables)

  writeFileSync(OUTPUT_PATH, report, 'utf-8')
  console.log(`\n✅ Izveštaj sačuvan u: ${OUTPUT_PATH}`)

  // Ispiši kratak pregled u konzolu
  console.log(`\n${'='.repeat(60)}`)
  console.log('KRATAK PREGLED:')
  console.log('='.repeat(60))

  for (const table of tables) {
    console.log(`\n📊 ${table.name}`)
    console.log(`   Broj redova: ${table.rowCount}`)
    console.log(`   Kolone: ${table.columns.map((c) => c.name).join(', ')}`)
  }

  console.log(`\n${'='.repeat(60)}`)
} catch (error) {
  console.error('❌ Greška:', error)
  process.exit(1)
}
