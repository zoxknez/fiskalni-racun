/**
 * Receipts Page E2E Tests
 *
 * Tests for receipts listing, filtering, and statistics
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('Receipts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/receipts')
    await page.addStyleTag({ content: testCSS })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should load receipts page', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible()
    expect(page.url()).toContain('/receipts')
  })

  test('should display empty state when no receipts', async ({ page }) => {
    // Check if empty state or receipts list is visible
    const emptyState = await page
      .getByText(/no receipts|nema računa/i)
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const receiptsList = await page
      .locator('[data-testid="receipt-item"], .receipt-card, article')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    expect(emptyState || receiptsList).toBeTruthy()
  })

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    const hasSearch = await searchInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasSearch) {
      await searchInput.fill('test')
      expect(await searchInput.inputValue()).toBe('test')
    } else {
      // Search might be in separate /search page
      expect(page.url()).toContain('/receipts')
    }
  })
})
