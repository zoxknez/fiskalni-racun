/**
 * Database Seeding Script
 *
 * Generates test data for development
 *
 * @module scripts/seed-database
 */

import { db } from '../lib/db'

interface SeedOptions {
  receipts?: number
  devices?: number
  clear?: boolean
}

/**
 * Generate random date within range
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

/**
 * Generate random store name
 */
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
  return stores[Math.floor(Math.random() * stores.length)]!
}

/**
 * Generate random category
 */
function randomCategory(): string {
  const categories = ['groceries', 'electronics', 'clothing', 'home', 'health', 'other']
  return categories[Math.floor(Math.random() * categories.length)]!
}

/**
 * Generate random items
 */
function randomItems(): string[] {
  const allItems = [
    'Hleb',
    'Mleko',
    'Jaja',
    'Piletina',
    'Jabuke',
    'Banane',
    'Paradajz',
    'Krastavac',
    'Laptop',
    'Telefon',
    'Slušalice',
    'Miš',
    'Tastatura',
    'Monitor',
    'Majica',
    'Pantalone',
    'Cipele',
    'Jakna',
  ]

  const count = Math.floor(Math.random() * 5) + 1
  const items: string[] = []

  for (let i = 0; i < count; i++) {
    const item = allItems[Math.floor(Math.random() * allItems.length)]!
    if (!items.includes(item)) {
      items.push(item)
    }
  }

  return items
}

/**
 * Seed receipts
 */
async function seedReceipts(count: number, userId: string) {
  console.log(`  📝 Generating ${count} receipts...`)

  const receipts = []
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const category = randomCategory()
    const hasWarranty = category === 'electronics' && Math.random() > 0.5

    receipts.push({
      userId,
      store: randomStore(),
      date: randomDate(sixMonthsAgo, now),
      amount: Math.floor(Math.random() * 50000) + 500, // 500 - 50,500 RSD
      category,
      items: randomItems(),
      warranty: hasWarranty ? Math.floor(Math.random() * 24) + 12 : null, // 12-36 months
      syncStatus: 'synced' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await db.receipts.bulkAdd(receipts)
  console.log(`  ✅ Created ${count} receipts`)

  return receipts
}

/**
 * Seed devices
 */
async function seedDevices(count: number, receipts: any[], userId: string) {
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

  const devices = []

  for (let i = 0; i < count; i++) {
    const receipt = receipts[Math.floor(Math.random() * receipts.length)]!
    const warrantyMonths = Math.floor(Math.random() * 24) + 12
    const purchaseDate = receipt.date
    const warrantyUntil = new Date(
      purchaseDate.getTime() + warrantyMonths * 30 * 24 * 60 * 60 * 1000
    )

    devices.push({
      userId,
      receiptId: receipt.id,
      name: `${brands[Math.floor(Math.random() * brands.length)]} ${deviceTypes[Math.floor(Math.random() * deviceTypes.length)]}`,
      brand: brands[Math.floor(Math.random() * brands.length)]!,
      category: 'electronics',
      purchaseDate,
      warrantyMonths,
      warrantyUntil,
      status: warrantyUntil > new Date() ? ('active' as const) : ('expired' as const),
      notes: Math.random() > 0.7 ? 'Važna napomena o garanciji' : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await db.devices.bulkAdd(devices)
  console.log(`  ✅ Created ${count} devices`)
}

/**
 * Main seed function
 */
export async function seedDatabase(options: SeedOptions = {}) {
  const { receipts: receiptCount = 50, devices: deviceCount = 20, clear = false } = options

  console.log('🌱 Seeding database...\n')

  try {
    // Mock user ID (in real app, this would come from auth)
    const userId = 'test-user-123'

    // Clear existing data if requested
    if (clear) {
      console.log('  🧹 Clearing existing data...')
      await db.receipts.clear()
      await db.devices.clear()
      await db.syncQueue.clear()
      console.log('  ✅ Cleared\n')
    }

    // Seed receipts
    const receipts = await seedReceipts(receiptCount, userId)

    // Seed devices (only for electronic receipts)
    const electronicReceipts = receipts.filter((r) => r.category === 'electronics')
    if (electronicReceipts.length > 0) {
      await seedDevices(
        Math.min(deviceCount, electronicReceipts.length),
        electronicReceipts,
        userId
      )
    }

    console.log('\n✅ Database seeding complete!')
    console.log('\n📊 Summary:')
    console.log(`  - Receipts: ${receiptCount}`)
    console.log(`  - Devices: ${Math.min(deviceCount, electronicReceipts.length)}`)
    console.log('\n💡 Open the app to see the test data')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase({
    receipts: 50,
    devices: 20,
    clear: process.argv.includes('--clear'),
  })
}
