/**
 * Database Migrations System
 *
 * Handles schema changes and data migrations for Dexie
 *
 * @module lib/db/migrations
 */

import type { Transaction } from 'dexie'
import { logger } from '@/lib/logger'
import { db } from '../db'

export interface Migration {
  version: number
  name: string
  description: string
  up: (transaction: Transaction) => Promise<void>
  down?: (transaction: Transaction) => Promise<void>
}

/**
 * Migration registry
 * Add new migrations here
 */
export const migrations: Migration[] = [
  {
    version: 3,
    name: 'add-receipt-tags',
    description: 'Add tags field to receipts table',
    up: async (transaction) => {
      // Get all receipts
      const receipts = await transaction.table('receipts').toArray()

      // Add tags field to each
      for (const receipt of receipts) {
        await transaction.table('receipts').update(receipt.id!, {
          tags: receipt.tags || [],
        })
      }

      logger.info('Migration v3: Added tags field to receipts')
    },
    down: async (transaction) => {
      const receipts = await transaction.table('receipts').toArray()

      for (const receipt of receipts) {
        const { tags, ...rest } = receipt as any
        await transaction.table('receipts').put(rest)
      }

      logger.info('Migration v3: Removed tags field from receipts')
    },
  },

  {
    version: 4,
    name: 'add-device-attachments',
    description: 'Add attachments array to devices',
    up: async (transaction) => {
      const devices = await transaction.table('devices').toArray()

      for (const device of devices) {
        await transaction.table('devices').update(device.id!, {
          attachments: device.attachments || [],
        })
      }

      logger.info('Migration v4: Added attachments to devices')
    },
  },

  // ⭐ Template for new migrations
  // {
  //   version: 5,
  //   name: 'your-migration-name',
  //   description: 'What this migration does',
  //   up: async (transaction) => {
  //     // Migration logic
  //   },
  //   down: async (transaction) => {
  //     // Rollback logic (optional)
  //   },
  // },
]

/**
 * Get current database version
 */
export async function getCurrentVersion(): Promise<number> {
  try {
    const versionInfo = await db.table('_migrations').toArray()

    if (versionInfo.length === 0) {
      // No migrations table yet, return schema version
      return db.verno
    }

    const versions = versionInfo.map((m: any) => m.version)
    return Math.max(...versions)
  } catch {
    // _migrations table doesn't exist, return schema version
    return db.verno
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    const currentVersion = await getCurrentVersion()
    const pendingMigrations = migrations.filter((m) => m.version > currentVersion)

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations')
      return
    }

    logger.info(`Running ${pendingMigrations.length} migrations...`)

    // Sort by version
    pendingMigrations.sort((a, b) => a.version - b.version)

    // Run each migration in transaction
    for (const migration of pendingMigrations) {
      await db.transaction('rw', db.tables, async (transaction) => {
        logger.info(`Running migration ${migration.version}: ${migration.name}`)

        await migration.up(transaction)

        // Record migration
        await transaction.table('_migrations').add({
          version: migration.version,
          name: migration.name,
          description: migration.description,
          appliedAt: new Date(),
        })

        logger.info(`✅ Migration ${migration.version} completed`)
      })
    }

    logger.info('All migrations completed successfully')
  } catch (error) {
    logger.error('Migration failed:', error)
    throw error
  }
}

/**
 * Rollback migration
 */
export async function rollbackMigration(version: number): Promise<void> {
  const migration = migrations.find((m) => m.version === version)

  if (!migration) {
    throw new Error(`Migration ${version} not found`)
  }

  if (!migration.down) {
    throw new Error(`Migration ${version} has no rollback function`)
  }

  try {
    await db.transaction('rw', db.tables, async (transaction) => {
      logger.info(`Rolling back migration ${version}: ${migration.name}`)

      await migration.down?.(transaction)

      // Remove migration record
      await transaction.table('_migrations').where('version').equals(version).delete()

      logger.info(`✅ Migration ${version} rolled back`)
    })
  } catch (error) {
    logger.error('Rollback failed:', error)
    throw error
  }
}

/**
 * Get migration history
 */
export async function getMigrationHistory(): Promise<
  Array<{
    version: number
    name: string
    description: string
    appliedAt: Date
  }>
> {
  try {
    return await db.table('_migrations').toArray()
  } catch {
    return []
  }
}
