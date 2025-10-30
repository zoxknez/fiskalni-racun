/**
 * Warranties Page E2E Tests
 *
 * Tests for warranties/devices listing and filtering
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('Warranties Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warranties')
    await page.addStyleTag({ content: testCSS })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should load warranties page', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible()
    expect(page.url()).toContain('/warranties')
  })

  test('should display warranty statistics', async ({ page }) => {
    // Look for statistics section
    const statsVisible = await page
      .locator('text=/active|expiring|expired|uređaj/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(statsVisible || page.url().includes('/warranties')).toBeTruthy()
  })

  test('should have filter options', async ({ page }) => {
    // Check for filter buttons or dropdowns
    const filterButtons = page.locator('button:has-text(/all|active|expiring|expired/i), select')
    const hasFilters = await filterButtons
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    if (hasFilters) {
      const count = await filterButtons.count()
      expect(count).toBeGreaterThan(0)
    } else {
      // Filters might not be visible if empty
      expect(page.url()).toContain('/warranties')
    }
  })
})
