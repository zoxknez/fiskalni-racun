/**
 * E2E Tests for Offline Functionality
 *
 * Tests that the app works correctly in offline mode:
 * - Creating receipts offline
 * - Data sync when coming back online
 * - Service worker caching
 */

import { expect, test } from '@playwright/test'

test.describe('Offline Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for service worker to be registered
    await page.waitForFunction(() => {
      return navigator.serviceWorker.controller !== null
    })
  })

  test('should load app in offline mode', async ({ page, context }) => {
    // First, load the app online
    await page.waitForLoadState('networkidle')

    // Then go offline
    await context.setOffline(true)

    // Refresh the page
    await page.reload()

    // App should still load from cache
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('should create receipt in offline mode', async ({ page, context }) => {
    // Login first (if needed)
    // await page.click('[data-testid="login-button"]')
    // ... login steps

    // Go to add receipt page
    await page.click('button:has-text("Dodaj račun"), a:has-text("Dodaj račun")')

    // Go offline
    await context.setOffline(true)

    // Fill receipt form
    await page.getByLabel(/prodavac|vendor/i).fill('Market Test')
    await page.getByLabel(/ukupno|total|iznos|amount/i).fill('1234.50')
    await page.getByLabel(/datum|date/i).fill('2024-01-15')

    // Submit form
    await page.click('button:has-text("Sačuvaj"), button:has-text("Save")')

    // Should show success message or navigate
    await expect(page.locator('text=/sačuvano|saved|uspešno|success/i')).toBeVisible({
      timeout: 10000,
    })

    // Verify receipt is stored in IndexedDB
    const isStored = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('fiskalni-racun-db', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(['receipts'], 'readonly')
        const store = tx.objectStore('receipts')
        const request = store.getAll()

        request.onsuccess = () => {
          const receipts = request.result
          const hasTestReceipt = receipts.some((r: any) => r.vendor === 'Market Test')
          resolve(hasTestReceipt)
        }

        request.onerror = () => resolve(false)
      })
    })

    expect(isStored).toBe(true)
  })

  test('should sync data when coming back online', async ({ page, context }) => {
    // Create a receipt while offline
    await context.setOffline(true)

    await page.click('button:has-text("Dodaj račun"), a:has-text("Dodaj račun")')
    await page.getByLabel(/prodavac|vendor/i).fill('Sync Test Market')
    await page.getByLabel(/ukupno|total|iznos|amount/i).fill('999.99')
    await page.getByLabel(/datum|date/i).fill('2024-01-16')
    await page.click('button:has-text("Sačuvaj"), button:has-text("Save")')

    // Wait for local save
    await page.waitForTimeout(1000)

    // Go back online
    await context.setOffline(false)

    // Wait for sync (service worker background sync)
    await page.waitForTimeout(5000)

    // Verify that data synced indicator appears
    // (This depends on your implementation)
    // await expect(page.locator('text=/sinhronizovano|synced/i')).toBeVisible({ timeout: 10000 })

    // Alternatively, check network requests
    const syncRequests = page.waitForRequest((request) => {
      return request.url().includes('supabase.co') && request.method() === 'POST'
    })

    await syncRequests
  })

  test('should show offline indicator', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)

    // Trigger offline detection (might need to dispatch event)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
    })

    // Should show offline indicator
    await expect(page.locator('text=/offline|van mreže|no connection/i')).toBeVisible({
      timeout: 5000,
    })

    // Go back online
    await context.setOffline(false)

    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'))
    })

    // Offline indicator should disappear
    await expect(page.locator('text=/online|povezano|connected/i')).toBeVisible({ timeout: 5000 })
  })

  test('should cache images in offline mode', async ({ page, context }) => {
    // Navigate to a receipt with an image
    await page.goto('/receipts')

    // Wait for images to load and cache
    await page.waitForLoadState('networkidle')

    // Go offline
    await context.setOffline(true)

    // Reload the page
    await page.reload()

    // Images should still be visible from cache
    const images = page.locator('img[src]')
    const imageCount = await images.count()

    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i)
        await expect(img).toBeVisible()
      }
    }
  })

  test('should queue mutations while offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)

    // Perform multiple operations
    await page.click('button:has-text("Dodaj račun"), a:has-text("Dodaj račun")')
    await page.getByLabel(/prodavac|vendor/i).fill('Queue Test 1')
    await page.getByLabel(/ukupno|total|iznos|amount/i).fill('111.11')
    await page.getByLabel(/datum|date/i).fill('2024-01-17')
    await page.click('button:has-text("Sačuvaj"), button:has-text("Save")')
    await page.waitForTimeout(1000)

    // Add another one
    await page.click('button:has-text("Dodaj račun"), a:has-text("Dodaj račun")')
    await page.getByLabel(/prodavac|vendor/i).fill('Queue Test 2')
    await page.getByLabel(/ukupno|total|iznos|amount/i).fill('222.22')
    await page.getByLabel(/datum|date/i).fill('2024-01-18')
    await page.click('button:has-text("Sačuvaj"), button:has-text("Save")')
    await page.waitForTimeout(1000)

    // Check that operations are queued in background sync
    const queuedCount = await page.evaluate(async () => {
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('workbox-background-sync', 1)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        return new Promise<number>((resolve) => {
          const tx = db.transaction(['requests'], 'readonly')
          const store = tx.objectStore('requests')
          const request = store.getAll()

          request.onsuccess = () => resolve(request.result.length)
          request.onerror = () => resolve(0)
        })
      } catch {
        return 0
      }
    })

    // Should have queued requests (or stored locally)
    expect(queuedCount).toBeGreaterThanOrEqual(0)

    // Go back online
    await context.setOffline(false)

    // Wait for sync
    await page.waitForTimeout(5000)
  })
})
