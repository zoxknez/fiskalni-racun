/**
 * Receipt CRUD Integration Tests
 */

import { db } from '@lib/db'
import { beforeEach, describe, expect, it } from 'vitest'

describe('Receipt CRUD Operations', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.receipts.clear()
    await db.syncQueue.clear()
  })

  it('should add receipt to database', async () => {
    const receipt = {
      merchantName: 'Test Store',
      pib: '123456789',
      date: new Date(),
      time: '12:00:00',
      totalAmount: 100,
      category: 'groceries',
    }

    const id = await db.receipts.add({
      ...receipt,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
    })

    expect(typeof id).toBe('string')
    expect(id).toBeTruthy()

    const saved = await db.receipts.get(id)
    expect(saved?.id).toBe(id)
    expect(saved?.merchantName).toBe('Test Store')
    expect(saved?.totalAmount).toBe(100)
  })

  it('should update receipt', async () => {
    const id = await db.receipts.add({
      merchantName: 'Original Name',
      pib: '123456789',
      date: new Date(),
      time: '12:00:00',
      totalAmount: 100,
      category: 'groceries',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
    })

    await db.receipts.update(id, {
      merchantName: 'Updated Name',
      totalAmount: 200,
    })

    const updated = await db.receipts.get(id)
    expect(updated?.merchantName).toBe('Updated Name')
    expect(updated?.totalAmount).toBe(200)
  })

  it('should delete receipt', async () => {
    const id = await db.receipts.add({
      merchantName: 'To Delete',
      pib: '123456789',
      date: new Date(),
      time: '12:00:00',
      totalAmount: 100,
      category: 'groceries',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
    })

    await db.receipts.delete(id)

    const deleted = await db.receipts.get(id)
    expect(deleted).toBeUndefined()
  })

  it('should query receipts by category', async () => {
    await db.receipts.bulkAdd([
      {
        merchantName: 'Store 1',
        pib: '111',
        date: new Date(),
        time: '10:00:00',
        totalAmount: 100,
        category: 'groceries',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      },
      {
        merchantName: 'Store 2',
        pib: '222',
        date: new Date(),
        time: '11:00:00',
        totalAmount: 200,
        category: 'electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      },
      {
        merchantName: 'Store 3',
        pib: '333',
        date: new Date(),
        time: '12:00:00',
        totalAmount: 150,
        category: 'groceries',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      },
    ])

    const groceries = await db.receipts.where('category').equals('groceries').toArray()

    expect(groceries).toHaveLength(2)
    expect(groceries.every((r) => r.category === 'groceries')).toBe(true)
  })

  it('should order receipts by date', async () => {
    const date1 = new Date('2024-01-01')
    const date2 = new Date('2024-01-15')
    const date3 = new Date('2024-02-01')

    await db.receipts.bulkAdd([
      {
        merchantName: 'Store 2',
        pib: '222',
        date: date2,
        time: '10:00:00',
        totalAmount: 200,
        category: 'groceries',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      },
      {
        merchantName: 'Store 1',
        pib: '111',
        date: date1,
        time: '10:00:00',
        totalAmount: 100,
        category: 'groceries',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      },
      {
        merchantName: 'Store 3',
        pib: '333',
        date: date3,
        time: '10:00:00',
        totalAmount: 300,
        category: 'groceries',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      },
    ])

    const sorted = await db.receipts.orderBy('date').reverse().toArray()

    expect(sorted[0]?.merchantName).toBe('Store 3')
    expect(sorted[1]?.merchantName).toBe('Store 2')
    expect(sorted[2]?.merchantName).toBe('Store 1')
  })
})
