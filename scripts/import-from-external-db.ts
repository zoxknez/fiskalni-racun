// scripts/import-from-external-db.ts
// Skripta za import podataka iz eksterne SQLite baze u Dexie aplikaciju

import Database from 'better-sqlite3'
import type { Device, Receipt } from '../lib/db'
import { db } from '../lib/db'

// ⚠️ Po potrebi izmeni putanju (Windows-escaped)
const DB_PATH = 'D:\\ProjektiApp\\stambena\\baza\\MojRacun.db'

interface ExternalRacun {
  idRacun: number
  iznos: string // Format: sr-RS "3.290,00" ili "3290,00"
  datum: number // Unix timestamp (ms)
  pfr_broj: string | null
  status: number
  racun_data: string | null // sirovi tekst fiskalnog računa
  racun_img: string | null // Base64 slika (trenutno se ne koristi)
  idProd: number | null
  idProdavac: Buffer | null
  pibProd: string | null
  nazivProd: string | null
  adresaProd: string | null
  gradProd: string | null
  racunIdProd: number | null
}

interface ExternalProdavac {
  idProd: number
  idProdavac: Buffer | null
  pibProd: string | null
  nazivProd: string | null
  adresaProd: string | null
  gradProd: string | null
  racunIdProd: number | null
}

interface ExternalKategorija {
  idKategorija: number
  idKat: Buffer | null
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

// --------------
// Kategorije: koristimo Map da izbegnemo bracket-notation
// --------------
const KATEGORIJA_MAP = new Map<string, string>([
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

function mapKategorijaToApp(nazivKat: string | null): string {
  if (!nazivKat) return 'Ostalo'
  const trimmed = nazivKat.trim()
  return KATEGORIJA_MAP.get(trimmed) ?? 'Ostalo'
}

// --------------
// Cena: sr-RS -> number (ukloni tačke, zameni zarez)
// --------------
function parseCenaFormat(iznos: string): number {
  const normalized = iznos.replace(/\./g, '').replace(',', '.').replace(/\s+/g, '')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

interface ReceiptItem {
  name: string
  price: number
  quantity: number
  total: number
}

function parseRacunData(racunData: string | null): { items?: ReceiptItem[] } {
  if (!racunData) return {}
  // (ostavljeno minimalno; format varira po fiskalnim uređajima)
  const lines = racunData.split('\n')
  const items: ReceiptItem[] = []

  let inItemsSection = false
  for (const line of lines) {
    if (line.includes('Назив') && line.includes('Цена')) {
      inItemsSection = true
      continue
    }
    if (line.includes('----------------------------------------')) {
      inItemsSection = false
    }
    if (inItemsSection && line.trim()) {
      // TODO: ovde se može dodati heuristika za parsiranje jedne stavke
      // za sada ne pokušavamo automatsko parsiranje
    }
  }

  return items.length > 0 ? { items } : {}
}

async function importFromExternalDB() {
  console.log('🔄 Pokrećem import iz eksterne baze...\n')

  const externalDb = new Database(DB_PATH, { readonly: true })

  try {
    // 1) Učitavanje iz SQLite
    console.log('📖 Čitam podatke iz SQLite baze...')

    const racuniStmt = externalDb.prepare('SELECT * FROM racuni')
    const prodavciStmt = externalDb.prepare('SELECT * FROM prodavci')
    const kategorijeStmt = externalDb.prepare('SELECT * FROM kategorije')
    const garancijeStmt = externalDb.prepare('SELECT * FROM garancije')

    const racuni = racuniStmt.all() as ExternalRacun[]
    const prodavci = prodavciStmt.all() as ExternalProdavac[]
    const kategorije = kategorijeStmt.all() as ExternalKategorija[]
    const garancije = garancijeStmt.all() as ExternalGarancija[]

    console.log(`✅ Učitano ${racuni.length} računa`)
    console.log(`✅ Učitano ${prodavci.length} prodavaca`)
    console.log(`✅ Učitano ${kategorije.length} kategorija`)
    console.log(`✅ Učitano ${garancije.length} garancija\n`)

    // 2) Mapa prodavaca (PIB → prodavac)
    const prodavciMap = new Map<string, ExternalProdavac>()
    for (const p of prodavci) {
      if (p.pibProd) prodavciMap.set(p.pibProd, p)
    }

    // 3) Mapa kategorija (idRacun → naziv kategorije)
    const kategorijeMap = new Map<number, string>()
    for (const k of kategorije) {
      if (k.racunIdKat !== null && k.racunIdKat !== undefined) {
        kategorijeMap.set(k.racunIdKat, mapKategorijaToApp(k.nazivKat))
      }
    }

    // 4) Transformacija računa u Dexie Receipt
    console.log('🔄 Transformišem račune u Dexie format...')
    const receiptsToImport: Omit<Receipt, 'id'>[] = []

    for (const r of racuni) {
      const prodavac = r.pibProd ? (prodavciMap.get(r.pibProd) ?? null) : null
      const when = new Date(r.datum)

      const receipt: Omit<Receipt, 'id'> = {
        merchantName: r.nazivProd ?? prodavac?.nazivProd ?? 'Nepoznato',
        pib: r.pibProd ?? '',
        date: when,
        time: when.toLocaleTimeString('sr-RS'),
        totalAmount: parseCenaFormat(r.iznos),
        vatAmount: undefined,
        category: kategorijeMap.get(r.idRacun) ?? 'Ostalo',
        notes: r.racun_data ? `PIB: ${r.pibProd ?? ''}\nPFR: ${r.pfr_broj ?? ''}` : undefined,
        qrLink: r.pfr_broj ?? undefined,
        imageUrl: undefined, // Base64 slike se ne upisuju direktno
        pdfUrl: undefined,
        createdAt: when,
        updatedAt: new Date(),
        syncStatus: 'pending',
        ...parseRacunData(r.racun_data),
      }

      receiptsToImport.push(receipt)
    }

    // 5) Garancije — pripremi listu "pending" sa spoljnim id-jem računa
    console.log('🔄 Transformišem garancije u Device format...')
    const pendingDevices: Array<{
      externalRacunId: number
      device: Omit<Device, 'id'>
    }> = []

    for (const g of garancije) {
      if (g.pocetakGar === null || g.krajGar === null) continue
      if (g.racunIdGar === null || g.racunIdGar === undefined) continue

      // Proveri da postoji odgovarajući račun
      const rFound = racuni.find((rr) => rr.idRacun === g.racunIdGar)
      if (!rFound) continue

      const start = new Date(g.pocetakGar)
      const end = new Date(g.krajGar)
      const months = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
      )

      const device: Omit<Device, 'id'> = {
        receiptId: undefined, // postavićemo posle kada znamo interni id računa
        brand: 'Nepoznato',
        model: g.nazivGar ?? 'Nepoznat uređaj',
        category: 'Ostalo',
        serialNumber: undefined,
        imageUrl: undefined,
        purchaseDate: start,
        warrantyDuration: months,
        warrantyExpiry: end,
        warrantyTerms: undefined,
        status: end > new Date() ? 'active' : 'expired',
        attachments: [],
        reminders: [],
        createdAt: start,
        updatedAt: new Date(),
        syncStatus: 'pending',
      }

      pendingDevices.push({ externalRacunId: g.racunIdGar, device })
    }

    // 6) Import u Dexie (transakcija)
    console.log('\n💾 Importujem podatke u aplikaciju...')

    await db.transaction('rw', db.receipts, db.devices, async () => {
      // a) Računi
      console.log(`📝 Importujem ${receiptsToImport.length} računa...`)
      const receiptIdMap = new Map<number, number>() // external idRacun -> interni Dexie id

      for (let i = 0; i < receiptsToImport.length; i += 1) {
        const receipt = receiptsToImport[i]
        const externalId = racuni[i]?.idRacun
        const addedId = await db.receipts.add(receipt as Receipt)
        if (typeof externalId === 'number') {
          receiptIdMap.set(externalId, addedId)
        }
      }

      console.log(`✅ Uspešno importovano ${receiptIdMap.size} računa`)

      // b) Uređaji sa garancijom (poveži receiptId)
      if (pendingDevices.length > 0) {
        console.log(`📱 Importujem ${pendingDevices.length} uređaja sa garancijom...`)
        let importedDevices = 0

        for (const item of pendingDevices) {
          const linkedReceiptId = receiptIdMap.get(item.externalRacunId)
          // ako nema link – preskoči (ili možeš fallback da kreiraš "unattached" device)
          if (!linkedReceiptId) continue
          item.device.receiptId = linkedReceiptId
          await db.devices.add(item.device as Device)
          importedDevices += 1
        }

        console.log(`✅ Uspešno importovano ${importedDevices} uređaja`)
      }
    })

    // 7) Statistike (Map umesto Record – bez bracket notacije)
    console.log('\n✅ Import uspešno završen!')
    console.log('\n📊 Statistika importa:')
    console.log(`   - Računi: ${receiptsToImport.length}`)
    console.log(`   - Uređaji sa garancijom: ${pendingDevices.length}`)
    const uniqueCats = new Set(receiptsToImport.map((r) => r.category))
    console.log(`   - Kategorije: ${uniqueCats.size}`)
    const uniqueMerchants = new Set(receiptsToImport.map((r) => r.merchantName))
    console.log(`   - Prodavci: ${uniqueMerchants.size}`)

    console.log('\n📂 Po kategorijama:')
    const byCategory = new Map<string, number>()
    for (const r of receiptsToImport) {
      const current = byCategory.get(r.category) ?? 0
      byCategory.set(r.category, current + 1)
    }
    for (const [category, count] of byCategory) {
      console.log(`   - ${category}: ${count}`)
    }

    const totalValue = receiptsToImport.reduce((sum, r) => sum + r.totalAmount, 0)
    console.log(`\n💰 Ukupna vrednost računa: ${totalValue.toFixed(2)} RSD`)
  } catch (error) {
    console.error('❌ Greška prilikom importa:', error)
    throw error
  } finally {
    externalDb.close()
  }
}

// Pokreni import
importFromExternalDB()
  .then(() => {
    console.log('\n🎉 Proces završen!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatalna greška:', error)
    process.exit(1)
  })
