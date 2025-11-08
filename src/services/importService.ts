// src/services/importService.ts
// Servis za import podataka iz drugih aplikacija (browser, sql.js)

import type { Device, Receipt } from '@lib/db'
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
// Import iz “Moj Račun” SQLite baze (SQL.js u browseru)
// ───────────────────────────────────────────────────────────────────────────────

export async function importFromMojRacun(file: File): Promise<ImportStats> {
  const stats: ImportStats = {
    receiptsImported: 0,
    devicesImported: 0,
    categoriesFound: new Set<string>(),
    merchantsFound: new Set<string>(),
    totalValue: 0,
    errors: [],
  }

  // 1) Učitavanje SQL.js (WASM sa CDN-a) - dynamic import
  // ⭐ FIXED: Type definitions added in types/sql.js.d.ts
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs({
    locateFile: (fname: string) => `https://sql.js.org/dist/${fname}`,
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

        const receipt: Omit<Receipt, 'id'> = {
          merchantName: r.nazivProd ?? prodavac?.nazivProd ?? 'Nepoznato',
          pib: r.pibProd ?? '',
          date: when,
          time: when.toLocaleTimeString('sr-RS'),
          totalAmount,
          category,
          ...(r.pfr_broj ? { notes: `PFR: ${r.pfr_broj}` } : {}),
          ...(r.pfr_broj ? { qrLink: r.pfr_broj } : {}),
          createdAt: when,
          updatedAt: new Date(),
          syncStatus: 'pending',
        }

        pendingReceipts.push({ extId: r.idRacun, data: receipt })
        stats.categoriesFound.add(category)
        stats.merchantsFound.add(receipt.merchantName)
        stats.totalValue += totalAmount
      } catch (e) {
        // Bez Record['field'] u poruci – samo prikaz ID-a
        stats.errors.push(`Račun (idRacun=${r.idRacun}) nije obrađen: ${String(e)}`)
      }
    }

    // 9) Garancije – priprema i kasnije povezivanje sa receiptId
    const pendingDevices: Array<{
      extRacunId: number
      device: Omit<Device, 'id' | 'receiptId'> & { receiptId: number }
    }> = []

    for (const g of garancije) {
      if (g.pocetakGar == null || g.krajGar == null || g.racunIdGar == null) continue
      const start = new Date(g.pocetakGar)
      const end = new Date(g.krajGar)
      const months = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
      )

      const device: Omit<Device, 'id' | 'receiptId'> & { receiptId: number } = {
        receiptId: 0, // temporary, popunićemo posle
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
    await db.transaction('rw', db.receipts, db.devices, async () => {
      const receiptIdMap = new Map<number, number>() // extId -> Dexie id

      for (const pr of pendingReceipts) {
        const id = await db.receipts.add(pr.data as Receipt)
        receiptIdMap.set(pr.extId, id)
        stats.receiptsImported += 1
      }

      for (const pd of pendingDevices) {
        const rid = receiptIdMap.get(pd.extRacunId)
        if (!rid) continue // nema odgovarajućeg računa
        pd.device.receiptId = rid
        await db.devices.add(pd.device as Device)
        stats.devicesImported += 1
      }
    })

    // 11) Gotovo
    sqliteDb.close()
    return stats
  } catch (error) {
    try {
      sqliteDb.close()
    } catch {}
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
