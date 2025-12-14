// src/services/importService.ts
// Servis za import podataka iz drugih aplikacija (browser, sql.js)

import type { Device, Receipt, ReceiptItem, SyncQueue } from '@lib/db'
import { db } from '@lib/db'
import { logger } from '@/lib/logger'

// ───────────────────────────────────────────────────────────────────────────────
// Tipovi eksterne baze (štiklirani po realnim kolonama iz MojRacun baze)
// ───────────────────────────────────────────────────────────────────────────────

interface ExternalRacun {
  idRacun: number
  iznos: string // sr-RS "3.290,00" / "3290,00"
  datum: number // Unix ms
  pfr_broj: string | null
  status: number
  racun_data: string | null
  racun_img: string | null
  idProd: number | null
  idProdavac: ArrayBuffer | null
  pibProd: string | null
  nazivProd: string | null
  adresaProd: string | null
  gradProd: string | null
  racunIdProd: number | null
}

interface ExternalProdavac {
  idProd: number
  idProdavac: ArrayBuffer | null
  pibProd: string | null
  nazivProd: string | null
  adresaProd: string | null
  gradProd: string | null
  racunIdProd: number | null
}

interface ExternalKategorija {
  idKategorija: number
  idKat: ArrayBuffer | null
  bojaKat: string | null
  nazivKat: string | null
  racunIdKat: number | null
}

interface ExternalGarancija {
  idGarancija: number
  pocetakGar: number | null
  krajGar: number | null
  nazivGar: string | null
  racunIdGar: number | null
}

// SQL.js rezultat jedne tabele
interface SQLExecResult {
  columns: string[]
  values: unknown[][]
}

export interface ImportStats {
  receiptsImported: number
  devicesImported: number
  itemsImported: number // Ukupan broj artikala
  imagesImported: number // Računi sa slikama
  categoriesFound: Set<string>
  merchantsFound: Set<string>
  totalValue: number
  errors: string[]
}

// ───────────────────────────────────────────────────────────────────────────────
// Kategorije — koristimo Map da izbegnemo bracket-notation nad Record
// ───────────────────────────────────────────────────────────────────────────────
const CATEGORY_MAP = new Map<string, string>([
  ['Deca šoping', 'Ostalo'],
  ['Namirnice', 'Hrana i piće'],
  ['Namirnice ', 'Hrana i piće'],
  ['Apoteka', 'Zdravlje'],
  ['Apoteka ', 'Zdravlje'],
  ['Odeća', 'Odeća i obuća'],
  ['Obuća', 'Odeća i obuća'],
  ['Sport', 'Sport i rekreacija'],
  ['Elektronika', 'Elektronika'],
  ['Namještaj', 'Dom i bašta'],
  ['Knjige', 'Ostalo'],
  ['Default', 'Ostalo'],
  // Dodatne kategorije koje se mogu naći
  ['Kozmetika', 'Lepota i nega'],
  ['Higijena', 'Lepota i nega'],
  ['Auto', 'Transport'],
  ['Gorivo', 'Transport'],
  ['Benzin', 'Transport'],
  ['Restoran', 'Hrana i piće'],
  ['Kafić', 'Hrana i piće'],
  ['Kafe', 'Hrana i piće'],
])

function mapCategory(nazivKat: string | null): string {
  if (!nazivKat) return 'Ostalo'
  const trimmed = nazivKat.trim()
  return CATEGORY_MAP.get(trimmed) ?? 'Ostalo'
}

// sr-RS -> number: uklanjamo tačke hiljada, zarez u tačku
function parseCenaFormat(iznos: string): number {
  const normalized = iznos.replace(/\./g, '').replace(',', '.').replace(/\s+/g, '')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

// ───────────────────────────────────────────────────────────────────────────────
// Parsiranje artikala iz racun_data (fiskalni račun tekst)
// ───────────────────────────────────────────────────────────────────────────────

interface ParsedReceiptData {
  items: ReceiptItem[]
  vatAmount: number
}

/**
 * Parsira tekst fiskalnog računa i izvlači artikle i PDV
 * Format: "Naziv artikla /kom (Ђ)\n    cena    kol    ukupno"
 */
function parseReceiptText(racunData: string | null): ParsedReceiptData {
  const result: ParsedReceiptData = {
    items: [],
    vatAmount: 0,
  }

  if (!racunData) return result

  try {
    const lines = racunData.split(/\r?\n/)

    // Tražimo sekciju artikala (između "Artikli" i "Ukupan iznos")
    let inItemsSection = false
    let currentItemName = ''
    let expectPriceLine = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Detektuj početak sekcije artikala
      if (trimmed === 'Артикли' || trimmed === 'Artikli') {
        inItemsSection = true
        continue
      }

      // Završi sekciju artikala
      if (
        trimmed.startsWith('Укупан износ:') ||
        trimmed.startsWith('Ukupan iznos:') ||
        trimmed.startsWith('----------------------------------------')
      ) {
        if (trimmed.startsWith('----------------------------------------')) {
          inItemsSection = false
        }
        continue
      }

      // Parsiraj PDV iznos
      if (
        trimmed.startsWith('Укупан износ пореза:') ||
        trimmed.startsWith('Ukupan iznos poreza:')
      ) {
        const match = trimmed.match(/([\d.,]+)\s*$/)
        if (match?.[1]) {
          result.vatAmount = parseCenaFormat(match[1])
        }
        continue
      }

      if (!inItemsSection) continue

      // Preskoči separator linije
      if (trimmed.startsWith('===') || trimmed === '') continue

      // Preskoči header liniju
      if (trimmed.startsWith('Naziv') && trimmed.includes('Цена')) continue
      if (trimmed.startsWith('Назив') && trimmed.includes('Цена')) continue

      // Detektuj liniju artikla (sadrži /kom, /kg, /PCS itd.)
      const itemMatch = trimmed.match(/^(.+?)\s*\/\s*(kom|kg|lit|pcs|KOM|KG|LIT|PCS)/i)
      if (itemMatch?.[1]) {
        // Očisti ime artikla od šifre na početku
        const itemName = itemMatch[1].trim()
        // Ukloni šifru ako postoji (npr. "0385430080003 DUKSERICA")
        const nameWithoutCode = itemName.replace(/^\d+\s+/, '')
        currentItemName = nameWithoutCode || itemName
        expectPriceLine = true
        continue
      }

      // Ako čekamo liniju sa cenom za prethodni artikal
      if (expectPriceLine && currentItemName) {
        // Format: "     cena          kol        ukupno"
        // npr: "     3.290,00          1        3.290,00"
        const priceMatch = trimmed.match(/([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/)
        if (priceMatch?.[1] && priceMatch[2] && priceMatch[3]) {
          const price = parseCenaFormat(priceMatch[1])
          const quantity = parseCenaFormat(priceMatch[2])
          const total = parseCenaFormat(priceMatch[3])

          result.items.push({
            name: currentItemName,
            quantity: quantity || 1,
            price: price,
            total: total || price * (quantity || 1),
          })

          currentItemName = ''
          expectPriceLine = false
        }
      }
    }
  } catch (error) {
    logger.warn('Greška pri parsiranju racun_data:', error)
  }

  return result
}

// ───────────────────────────────────────────────────────────────────────────────
// SQL.js helperi (bez any / bez bracket notacije nad Record)
// ───────────────────────────────────────────────────────────────────────────────

function toStringOrNull(v: unknown): string | null {
  if (v == null) return null
  return typeof v === 'string' ? v : String(v)
}
function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function toNumber(v: unknown, fallback = 0): number {
  const n = toNumberOrNull(v)
  return n == null ? fallback : n
}
function firstExec(result: SQLExecResult[] | undefined): SQLExecResult | undefined {
  return result && result.length > 0 ? result[0] : undefined
}
function colIdx(columns: string[], name: string): number {
  return columns.indexOf(name)
}

// Parsiranje poznatih tabela u _tipizovane_ objekte bez dinamičkog pristupa
function parseRacuni(res?: SQLExecResult): ExternalRacun[] {
  if (!res) return []
  const c = res.columns
  const idx = {
    idRacun: colIdx(c, 'idRacun'),
    iznos: colIdx(c, 'iznos'),
    datum: colIdx(c, 'datum'),
    pfr_broj: colIdx(c, 'pfr_broj'),
    status: colIdx(c, 'status'),
    racun_data: colIdx(c, 'racun_data'),
    racun_img: colIdx(c, 'racun_img'),
    idProd: colIdx(c, 'idProd'),
    idProdavac: colIdx(c, 'idProdavac'),
    pibProd: colIdx(c, 'pibProd'),
    nazivProd: colIdx(c, 'nazivProd'),
    adresaProd: colIdx(c, 'adresaProd'),
    gradProd: colIdx(c, 'gradProd'),
    racunIdProd: colIdx(c, 'racunIdProd'),
  }
  return res.values.map((row) => ({
    idRacun: toNumber(row[idx.idRacun]),
    iznos: toStringOrNull(row[idx.iznos]) ?? '0,00',
    datum: toNumber(row[idx.datum]),
    pfr_broj: toStringOrNull(row[idx.pfr_broj]),
    status: toNumber(row[idx.status]),
    racun_data: toStringOrNull(row[idx.racun_data]),
    racun_img: (row[idx.racun_img] as string | null) ?? null,
    idProd: toNumberOrNull(row[idx.idProd]),
    idProdavac: (row[idx.idProdavac] as ArrayBuffer | null) ?? null,
    pibProd: toStringOrNull(row[idx.pibProd]),
    nazivProd: toStringOrNull(row[idx.nazivProd]),
    adresaProd: toStringOrNull(row[idx.adresaProd]),
    gradProd: toStringOrNull(row[idx.gradProd]),
    racunIdProd: toNumberOrNull(row[idx.racunIdProd]),
  }))
}

function parseProdavci(res?: SQLExecResult): ExternalProdavac[] {
  if (!res) return []
  const c = res.columns
  const idx = {
    idProd: colIdx(c, 'idProd'),
    idProdavac: colIdx(c, 'idProdavac'),
    pibProd: colIdx(c, 'pibProd'),
    nazivProd: colIdx(c, 'nazivProd'),
    adresaProd: colIdx(c, 'adresaProd'),
    gradProd: colIdx(c, 'gradProd'),
    racunIdProd: colIdx(c, 'racunIdProd'),
  }
  return res.values.map((row) => ({
    idProd: toNumber(row[idx.idProd]),
    idProdavac: (row[idx.idProdavac] as ArrayBuffer | null) ?? null,
    pibProd: toStringOrNull(row[idx.pibProd]),
    nazivProd: toStringOrNull(row[idx.nazivProd]),
    adresaProd: toStringOrNull(row[idx.adresaProd]),
    gradProd: toStringOrNull(row[idx.gradProd]),
    racunIdProd: toNumberOrNull(row[idx.racunIdProd]),
  }))
}

function parseKategorije(res?: SQLExecResult): ExternalKategorija[] {
  if (!res) return []
  const c = res.columns
  const idx = {
    idKategorija: colIdx(c, 'idKategorija'),
    idKat: colIdx(c, 'idKat'),
    bojaKat: colIdx(c, 'bojaKat'),
    nazivKat: colIdx(c, 'nazivKat'),
    racunIdKat: colIdx(c, 'racunIdKat'),
  }
  return res.values.map((row) => ({
    idKategorija: toNumber(row[idx.idKategorija]),
    idKat: (row[idx.idKat] as ArrayBuffer | null) ?? null,
    bojaKat: toStringOrNull(row[idx.bojaKat]),
    nazivKat: toStringOrNull(row[idx.nazivKat]),
    racunIdKat: toNumberOrNull(row[idx.racunIdKat]),
  }))
}

function parseGarancije(res?: SQLExecResult): ExternalGarancija[] {
  if (!res) return []
  const c = res.columns
  const idx = {
    idGarancija: colIdx(c, 'idGarancija'),
    pocetakGar: colIdx(c, 'pocetakGar'),
    krajGar: colIdx(c, 'krajGar'),
    nazivGar: colIdx(c, 'nazivGar'),
    racunIdGar: colIdx(c, 'racunIdGar'),
  }
  return res.values.map((row) => ({
    idGarancija: toNumber(row[idx.idGarancija]),
    pocetakGar: toNumberOrNull(row[idx.pocetakGar]),
    krajGar: toNumberOrNull(row[idx.krajGar]),
    nazivGar: toStringOrNull(row[idx.nazivGar]),
    racunIdGar: toNumberOrNull(row[idx.racunIdGar]),
  }))
}

// ───────────────────────────────────────────────────────────────────────────────
// Import iz "Moj Račun" SQLite baze (SQL.js u browseru)
// ───────────────────────────────────────────────────────────────────────────────

export async function importFromMojRacun(file: File): Promise<ImportStats> {
  const stats: ImportStats = {
    receiptsImported: 0,
    devicesImported: 0,
    itemsImported: 0,
    imagesImported: 0,
    categoriesFound: new Set<string>(),
    merchantsFound: new Set<string>(),
    totalValue: 0,
    errors: [],
  }

  // 1) Učitavanje SQL.js (WASM lokalno iz public foldera)
  // ⭐ FIXED: Type definitions added in types/sql.js.d.ts
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs({
    // Lokalni WASM fajl umesto CDN (CSP compliance)
    locateFile: () => '/sql-wasm.wasm',
  })

  // 2) Čitanje fajla u Uint8Array
  const data = new Uint8Array(await file.arrayBuffer())

  // 3) Otvaranje baze
  const sqliteDb = new SQL.Database(data)

  try {
    // 4) Provera tabela
    const tables = sqliteDb.exec(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ) as SQLExecResult[]
    const tableRowset = firstExec(tables)
    const tableNames: string[] = tableRowset?.values.map((row) => String(row[0])) ?? []

    if (!tableNames.includes('racuni')) {
      throw new Error('Baza ne sadrži tabelu "racuni". Da li je izabran pravi fajl?')
    }

    // 5) Učitavanje sirovih tabela (ako ne postoje, prazne liste)
    const racuniRes = firstExec(sqliteDb.exec('SELECT * FROM racuni') as SQLExecResult[])
    const prodavciRes = tableNames.includes('prodavci')
      ? firstExec(sqliteDb.exec('SELECT * FROM prodavci') as SQLExecResult[])
      : undefined
    const kategorijeRes = tableNames.includes('kategorije')
      ? firstExec(sqliteDb.exec('SELECT * FROM kategorije') as SQLExecResult[])
      : undefined
    const garancijeRes = tableNames.includes('garancije')
      ? firstExec(sqliteDb.exec('SELECT * FROM garancije') as SQLExecResult[])
      : undefined

    // 6) Parsiranje u tipizovane objekte (bez Record-brisanja i bracket notacije)
    const racuni = parseRacuni(racuniRes)
    const prodavci = parseProdavci(prodavciRes)
    const kategorije = parseKategorije(kategorijeRes)
    const garancije = parseGarancije(garancijeRes)

    // 7) Pomoćne mape
    const prodavciMap = new Map<string, ExternalProdavac>()
    for (const p of prodavci) {
      if (p.pibProd) prodavciMap.set(p.pibProd, p)
    }

    const kategorijeMap = new Map<number, string>()
    for (const k of kategorije) {
      if (k.racunIdKat != null) {
        kategorijeMap.set(k.racunIdKat, mapCategory(k.nazivKat))
      }
    }

    // 8) Priprema računa (čuvamo i eksterni id radi linkovanja garancija)
    const pendingReceipts: Array<{ extId: number; data: Omit<Receipt, 'id'> }> = []

    for (const r of racuni) {
      try {
        const prodavac = r.pibProd ? (prodavciMap.get(r.pibProd) ?? null) : null
        const category = kategorijeMap.get(r.idRacun) ?? 'Ostalo'
        const totalAmount = parseCenaFormat(r.iznos ?? '0,00')
        const when = new Date(r.datum)

        // Parsiraj artikle i PDV iz teksta računa
        const parsedData = parseReceiptText(r.racun_data)

        // Pripremi sliku računa ako postoji (base64 data URL)
        const imageUrl = r.racun_img?.startsWith('data:image/') ? r.racun_img : undefined

        const receipt: Omit<Receipt, 'id'> = {
          merchantName: r.nazivProd ?? prodavac?.nazivProd ?? 'Nepoznato',
          pib: r.pibProd ?? '',
          date: when,
          time: when.toLocaleTimeString('sr-RS'),
          totalAmount,
          category,
          createdAt: when,
          updatedAt: new Date(),
          syncStatus: 'pending',
        }

        // Dodaj opcionalna polja samo ako imaju vrednost
        if (parsedData.vatAmount > 0) {
          receipt.vatAmount = parsedData.vatAmount
        }
        if (parsedData.items.length > 0) {
          receipt.items = parsedData.items
        }
        if (r.pfr_broj) {
          receipt.notes = `PFR: ${r.pfr_broj}`
          receipt.qrLink = r.pfr_broj
        }
        if (imageUrl) {
          receipt.imageUrl = imageUrl
        }

        pendingReceipts.push({ extId: r.idRacun, data: receipt })
        stats.categoriesFound.add(category)
        stats.merchantsFound.add(receipt.merchantName)
        stats.totalValue += totalAmount
        stats.itemsImported += parsedData.items.length
        if (imageUrl) stats.imagesImported += 1
      } catch (e) {
        // Bez Record['field'] u poruci – samo prikaz ID-a
        stats.errors.push(`Račun (idRacun=${r.idRacun}) nije obrađen: ${String(e)}`)
      }
    }

    // 9) Garancije – priprema i kasnije povezivanje sa receiptId
    const pendingDevices: Array<{
      extRacunId: number
      device: Omit<Device, 'id' | 'receiptId'> & { receiptId: string }
    }> = []

    for (const g of garancije) {
      if (g.pocetakGar == null || g.krajGar == null || g.racunIdGar == null) continue
      const start = new Date(g.pocetakGar)
      const end = new Date(g.krajGar)
      const months = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
      )

      const device: Omit<Device, 'id' | 'receiptId'> & { receiptId: string } = {
        receiptId: '', // temporary, popunićemo posle
        brand: 'Nepoznato',
        model: g.nazivGar ?? 'Nepoznat uređaj',
        category: 'Ostalo',
        serialNumber: '',
        imageUrl: '',
        purchaseDate: start,
        warrantyDuration: months,
        warrantyExpiry: end,
        warrantyTerms: '',
        status: end > new Date() ? 'active' : 'expired',
        attachments: [],
        reminders: [],
        createdAt: start,
        updatedAt: new Date(),
        syncStatus: 'pending',
      }

      pendingDevices.push({ extRacunId: g.racunIdGar, device })
    }

    // 10) Upis u Dexie (u transakciji) + povezivanje garancija
    await db.transaction('rw', db.receipts, db.devices, db.syncQueue, async () => {
      const receiptIdMap = new Map<number, string>() // extId -> Dexie id

      for (const pr of pendingReceipts) {
        const id = await db.receipts.add(pr.data as Receipt)
        receiptIdMap.set(pr.extId, id)

        // Add to sync queue
        await db.syncQueue.add({
          entityType: 'receipt',
          entityId: id,
          operation: 'create',
          data: { ...pr.data, id },
          retryCount: 0,
          createdAt: new Date(),
        } as SyncQueue)

        stats.receiptsImported += 1
      }

      for (const pd of pendingDevices) {
        const rid = receiptIdMap.get(pd.extRacunId)
        if (!rid) continue // nema odgovarajućeg računa
        pd.device.receiptId = rid
        const devId = await db.devices.add(pd.device as Device)

        // Add to sync queue
        await db.syncQueue.add({
          entityType: 'device',
          entityId: devId,
          operation: 'create',
          data: { ...pd.device, id: devId },
          retryCount: 0,
          createdAt: new Date(),
        } as SyncQueue)

        stats.devicesImported += 1
      }
    })

    // 11) Gotovo
    sqliteDb.close()
    return stats
  } catch (error) {
    try {
      sqliteDb.close()
    } catch (closeError) {
      // Ignore close error - database may already be closed or corrupted
      logger.warn('Failed to close SQLite database:', closeError)
    }
    stats.errors.push(`Kritična greška: ${String(error)}`)
    throw error
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Validacija SQLite fajla po headeru
// ───────────────────────────────────────────────────────────────────────────────

export async function validateSQLiteFile(file: File): Promise<boolean> {
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    const header = new TextDecoder().decode(data.slice(0, 16))
    return header.startsWith('SQLite format 3')
  } catch (error) {
    // samo log – false je dovoljno za UI
    // eslint-disable-next-line no-console
    logger.error('Greška pri validaciji fajla:', error)
    return false
  }
}
