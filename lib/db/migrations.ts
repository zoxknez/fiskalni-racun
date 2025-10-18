/**
 * Database Migrations System (refined)
 *
 * @module lib/db/migrations
 */

import Dexie, { type Table, type Transaction } from 'dexie'
import { logger } from '@/lib/logger'
import type { Device, Receipt } from '../db'
import { db } from '../db'

const MIGRATIONS_TABLE = '_migrations'

type MigrationHistoryRow = {
  id?: number
  version?: number
  name?: string
  description?: string
  appliedAt?: Date | string
}

const migrationsTable = () => db.table(MIGRATIONS_TABLE) as Table<MigrationHistoryRow, number>

export interface Migration {
  version: number
  name: string
  description: string
  up: (transaction: Transaction) => Promise<void>
  down?: (transaction: Transaction) => Promise<void>
}

/** Guard protiv paralelnog pokretanja */
let migrationsRunning = false

/**
 * Registry
 */
export const migrations: Migration[] = [
  {
    version: 3,
    name: 'add-receipt-tags',
    description: 'Add tags field to receipts table',
    up: async (transaction) => {
      type ReceiptWithTags = Receipt & { id?: number; tags?: unknown }
      const receiptsTable = transaction.table('receipts') as Table<ReceiptWithTags, number>
      const receipts = await receiptsTable.toArray()

      for (const receipt of receipts) {
        const id = receipt.id
        if (typeof id !== 'number') {
          logger.warn('Skipping receipt without id during migration v3')
          continue
        }
        const tags = Array.isArray(receipt.tags) ? (receipt.tags as string[]) : []
        await receiptsTable.update(id, { tags })
      }

      logger.info('Migration v3: Added tags field to receipts')
    },
    down: async (transaction) => {
      type ReceiptWithTags = Receipt & { id?: number; tags?: unknown }
      const receiptsTable = transaction.table('receipts') as Table<ReceiptWithTags, number>
      const receipts = await receiptsTable.toArray()

      for (const receipt of receipts) {
        const { tags: _unused, ...rest } = receipt
        if (typeof rest.id === 'number') {
          await receiptsTable.put(rest)
        }
      }

      logger.info('Migration v3: Removed tags field from receipts')
    },
  },

  {
    version: 4,
    name: 'add-device-attachments',
    description: 'Add attachments array to devices',
    up: async (transaction) => {
      const devicesTable = transaction.table('devices') as Table<Device, number>
      const devices = await devicesTable.toArray()

      for (const device of devices) {
        const id = device.id
        if (typeof id !== 'number') {
          logger.warn('Skipping device without id during migration v4')
          continue
        }
        const attachments = Array.isArray(device.attachments) ? device.attachments : []
        await devicesTable.update(id, { attachments })
      }

      logger.info('Migration v4: Added attachments to devices')
    },
  },

  // Template:
  // {
  //   version: 5,
  //   name: 'your-migration-name',
  //   description: 'What this migration does',
  //   up: async (tx) => { /* ... */ },
  //   down: async (tx) => { /* ... */ },
  // },
]

/**
 * Da li postoji tabela za istoriju migracija?
 */
function hasMigrationsTable(): boolean {
  return db.tables.some((t) => t.name === MIGRATIONS_TABLE)
}

/**
 * Vrati trenutnu verziju (max iz istorije), fallback 0.
 */
export async function getCurrentVersion(): Promise<number> {
  try {
    if (!hasMigrationsTable()) return 0
    const rows = await migrationsTable().toArray()
    if (!rows.length) return 0
    return rows.reduce((max, row) => {
      const version = typeof row.version === 'number' ? row.version : Number(row.version ?? 0)
      return version > max ? version : max
    }, 0)
  } catch {
    return 0
  }
}

/**
 * Pokreni sve preostale migracije
 */
export async function runMigrations(): Promise<void> {
  if (migrationsRunning) {
    logger.warn('Migrations already running – skipping')
    return
  }
  migrationsRunning = true

  const startedAt = performance.now()
  try {
    const appliedSet = new Set<number>()
    if (hasMigrationsTable()) {
      try {
        const history = await migrationsTable().toArray()
        for (const entry of history) {
          if (typeof entry.version === 'number') {
            appliedSet.add(entry.version)
          }
        }
      } catch {
        // ignoriši – tretiraj kao da nema istorije
      }
    }

    const pending = migrations
      .filter((m) => !appliedSet.has(m.version))
      .sort((a, b) => a.version - b.version)

    if (pending.length === 0) {
      logger.info('No pending migrations')
      return
    }

    logger.info(`Running ${pending.length} migration(s)…`)

    // Tabele koje sigurno dodirujemo u migracijama
    const tablesToLock = db.tables.filter((t) =>
      ['receipts', 'devices', MIGRATIONS_TABLE].includes(t.name)
    )

    for (const migration of pending) {
      await db.transaction('rw', tablesToLock, async () => {
        const tx = Dexie.currentTransaction as Transaction | null
        if (!tx) throw new Error('No Dexie transaction context')

        logger.info(`Running migration ${migration.version}: ${migration.name}`)
        await migration.up(tx)

        if (!hasMigrationsTable()) {
          // Ako nema istorije, ne možemo upisati – samo loguj (schema će je dodati u sledećem bump-u)
          logger.warn(
            `Migrations history table "${MIGRATIONS_TABLE}" not found; cannot record version ${migration.version}`
          )
        } else {
          await db.table(MIGRATIONS_TABLE).add({
            version: migration.version,
            name: migration.name,
            description: migration.description,
            appliedAt: new Date(),
          })
        }

        logger.info(`✅ Migration ${migration.version} completed`)
      })
    }

    const dur = Math.round(performance.now() - startedAt)
    logger.info(`All migrations completed successfully in ${dur}ms`)
  } catch (error) {
    logger.error('Migration failed:', error)
    throw error
  } finally {
    migrationsRunning = false
  }
}

/**
 * Rollback jedne migracije
 */
export async function rollbackMigration(version: number): Promise<void> {
  const migration = migrations.find((m) => m.version === version)
  if (!migration) throw new Error(`Migration ${version} not found`)
  if (!migration.down) throw new Error(`Migration ${version} has no rollback function`)
  const migrationDown = migration.down

  const tablesToLock = db.tables.filter((t) =>
    ['receipts', 'devices', MIGRATIONS_TABLE].includes(t.name)
  )

  try {
    await db.transaction('rw', tablesToLock, async () => {
      const tx = Dexie.currentTransaction as Transaction | null
      if (!tx) throw new Error('No Dexie transaction context')

      logger.info(`Rolling back migration ${version}: ${migration.name}`)
      await migrationDown(tx)

      if (hasMigrationsTable()) {
        await migrationsTable().where('version').equals(version).delete()
      }
      logger.info(`✅ Migration ${version} rolled back`)
    })
  } catch (error) {
    logger.error('Rollback failed:', error)
    throw error
  }
}

/**
 * Istorija migracija
 */
export async function getMigrationHistory(): Promise<
  Array<{ version: number; name: string; description: string; appliedAt: Date }>
> {
  try {
    if (!hasMigrationsTable()) return []
    const rows = await migrationsTable().toArray()
    // tipizuj datum
    return rows.map(({ version, name, description, appliedAt }) => ({
      version: Number(version ?? 0),
      name: String(name ?? ''),
      description: String(description ?? ''),
      appliedAt:
        appliedAt instanceof Date ? appliedAt : appliedAt ? new Date(appliedAt) : new Date(),
    }))
  } catch {
    return []
  }
}
