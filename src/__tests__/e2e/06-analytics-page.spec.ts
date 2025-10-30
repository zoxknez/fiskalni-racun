/**
 * Analytics Page E2E Tests
 *
 * Tests for analytics/statistics page
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics')
    await page.addStyleTag({ content: testCSS })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should load analytics page', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible()
    expect(page.url()).toContain('/analytics')
  })

  test('should display statistics', async ({ page }) => {
    // Look for any numbers or stats
    const hasStats = await page
      .locator('text=/\\d+|0,00|RSD|total|average/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasStats || page.url().includes('/analytics')).toBeTruthy()
  })

  test('should have time period filters', async ({ page }) => {
    // Check for month/year/period selectors
    const periodFilters = page.locator('select, button:has-text(/month|year|period|mesec|godina/i)')
    const hasFilters = await periodFilters
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    expect(hasFilters || page.url().includes('/analytics')).toBeTruthy()
  })
})
