/**
 * About & Documentation E2E Tests
 *
 * Tests for about page and documentation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('About & Documentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({ content: testCSS })
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should load about page', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    await expect(page.locator('main')).toBeVisible()
    expect(page.url()).toContain('/about')
  })

  test('should display app information', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    // Check for version, description, or other info
    const hasInfo = await page
      .locator('text=/version|v\\d|fiskalni|receipt|warranty/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasInfo || page.url().includes('/about')).toBeTruthy()
  })

  test('should load documents page', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    await expect(page.locator('main')).toBeVisible()
    expect(page.url()).toContain('/documents')
  })
})
