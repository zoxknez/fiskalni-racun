// scripts/seed-database.ts

import {
  type DeviceCategory,
  deviceCategoryValues,
  type ReceiptCategory,
  receiptCategoryValues,
} from '../lib/categories'
import type { Device, Receipt, ReceiptItem } from '../lib/db'
import { db } from '../lib/db'

interface SeedOptions {
  receipts?: number
  devices?: number
  clear?: boolean
}

const rand = <T>(arr: readonly T[]): T => {
  if (arr.length === 0) {
    throw new Error('Cannot pick a random value from an empty array')
  }

  const index = Math.floor(Math.random() * arr.length)
  return arr[index]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomStore(): string {
  const stores = [
    'Maxi',
    'Tempo',
    'Idea',
    'Roda',
    'DM',
    'Tehnomanija',
    'Gigatron',
    'Jysk',
    'IKEA',
    'Zara',
    'H&M',
    'Deichmann',
  ]
  return rand(stores)
}

function randomReceiptCategory(): ReceiptCategory {
  return rand(receiptCategoryValues)
}

function randomItems(): ReceiptItem[] {
  const catalog: ReadonlyArray<{ name: string; price: number }> = [
    { name: 'Hleb', price: 120 },
    { name: 'Mleko', price: 180 },
    { name: 'Jaja', price: 250 },
    { name: 'Piletina', price: 820 },
    { name: 'Jabuke', price: 220 },
    { name: 'Banane', price: 210 },
    { name: 'Paradajz', price: 300 },
    { name: 'Krastavac', price: 160 },
    { name: 'Laptop', price: 85000 },
    { name: 'Telefon', price: 65000 },
    { name: 'Slušalice', price: 8500 },
    { name: 'Miš', price: 3200 },
    { name: 'Tastatura', price: 5400 },
    { name: 'Monitor', price: 42000 },
    { name: 'Majica', price: 2600 },
    { name: 'Pantalone', price: 5200 },
    { name: 'Cipele', price: 8900 },
    { name: 'Jakna', price: 12500 },
  ]

  const count = Math.max(1, Math.floor(Math.random() * 4) + 1)
  type CatalogItem = (typeof catalog)[number]
  const chosen = new Set<CatalogItem>()
  while (chosen.size < count) {
    chosen.add(rand(catalog))
  }

  return Array.from(chosen, ({ name, price }) => {
    const quantity = Math.max(1, Math.floor(Math.random() * 3) + 1)
    const total = price * quantity
    return { name, price, quantity, total }
  })
}

function randomPib(): string {
  return String(Math.floor(100000000 + Math.random() * 899999999))
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8)
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

async function seedReceipts(count: number): Promise<Receipt[]> {
  console.log(`  📝 Generating ${count} receipts...`)
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)

  const stored: Receipt[] = []
  for (let i = 0; i < count; i++) {
    const category = randomReceiptCategory()
    const date = randomDate(sixMonthsAgo, now)
    const items = randomItems()
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0)
    const receipt: Receipt = {
      merchantName: randomStore(),
      pib: randomPib(),
      date,
      time: formatTime(date),
      totalAmount,
      vatAmount: Number((totalAmount * 0.2).toFixed(2)),
      items,
      category,
      notes: Math.random() > 0.85 ? 'Automatski generisana beleška' : undefined,
      qrLink: undefined,
      imageUrl: undefined,
      pdfUrl: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced',
    }

    const id = await db.receipts.add(receipt)
    stored.push({ ...receipt, id })
  }

  console.log(`  ✅ Created ${stored.length} receipts`)
  return stored
}

async function seedDevices(count: number, receipts: Receipt[]): Promise<void> {
  console.log(`  🖥️  Generating ${count} devices...`)
  const brands = ['Samsung', 'Apple', 'LG', 'Sony', 'HP', 'Dell', 'Lenovo', 'Asus']
  const deviceTypes = [
    'Laptop',
    'Smartphone',
    'Tablet',
    'TV',
    'Monitor',
    'Slušalice',
    'Miš',
    'Tastatura',
  ]

  let created = 0
  for (let i = 0; i < count; i++) {
    const receipt = rand(receipts)
    if (!receipt.id) continue

    const warrantyDuration = Math.floor(Math.random() * 24) + 12
    const purchaseDate = receipt.date
    const warrantyExpiry = addMonths(purchaseDate, warrantyDuration)
    const category: DeviceCategory = rand(deviceCategoryValues)
    const brand = rand(brands)
    const model = rand(deviceTypes)
    const status = warrantyExpiry > new Date() ? 'active' : 'expired'

    const device: Device = {
      receiptId: receipt.id,
      brand,
      model,
      category,
      serialNumber: `SN-${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
      imageUrl: undefined,
      purchaseDate,
      warrantyDuration,
      warrantyExpiry,
      warrantyTerms: Math.random() > 0.7 ? 'Proširena garancija 36 meseci' : undefined,
      status,
      serviceCenterName: Math.random() > 0.5 ? `${brand} servis` : undefined,
      serviceCenterAddress: Math.random() > 0.5 ? 'Bulevar kralja Aleksandra 73' : undefined,
      serviceCenterPhone: Math.random() > 0.5 ? '+381 11 123 456' : undefined,
      serviceCenterHours: Math.random() > 0.5 ? '09:00–17:00 (pon–pet)' : undefined,
      attachments: [],
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced',
    }

    await db.devices.add(device)
    created += 1
  }

  console.log(`  ✅ Created ${created} devices`)
}

export async function seedDatabase(options: SeedOptions = {}) {
  const { receipts: receiptCount = 50, devices: deviceCount = 20, clear = false } = options
  console.log('🌱 Seeding database...\n')
  try {
    if (clear) {
      console.log('  🧹 Clearing existing data...')
      await db.receipts.clear()
      await db.devices.clear()
      await db.syncQueue.clear()
      console.log('  ✅ Cleared\n')
    }
    const receipts = await seedReceipts(receiptCount)
    const electronicReceipts = receipts.filter((r) => r.category === 'electronics')
    if (electronicReceipts.length > 0) {
      await seedDevices(Math.min(deviceCount, electronicReceipts.length), electronicReceipts)
    }
    console.log('\n✅ Database seeding complete!')
    console.log('\n📊 Summary:')
    console.log(`  - Receipts: ${receiptCount}`)
    console.log(`  - Devices: ${Math.min(deviceCount, electronicReceipts.length)}`)
    console.log('\n💡 Open the app to see the test data')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    if (typeof process !== 'undefined' && typeof process.exit === 'function') {
      process.exit(1)
    }
  }
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  import.meta.url === `file://${process.argv[1]}`

if (isDirectExecution) {
  seedDatabase({
    receipts: 50,
    devices: 20,
    clear: process.argv.includes('--clear'),
  })
}
