/**
 * Basic Navigation E2E Tests
 *
 * ⚠️ MEMORY OPTIMIZED: Split from critical-flows to reduce memory pressure
 * Run separately: npx playwright test 01-basic-navigation.spec.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load test-specific CSS to disable animations
const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('Basic Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.addStyleTag({ content: testCSS })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should load homepage successfully', async ({ page }) => {
    // Verify main content loaded
    await expect(page.locator('main')).toBeVisible()

    // Verify quick actions section
    await expect(page.getByRole('heading', { name: /quick actions/i })).toBeVisible()

    // Verify at least one add link exists in main content
    await expect(page.locator('main a[href*="/add"]').first()).toBeVisible()
  })

  test('should navigate to add receipt page', async ({ page }) => {
    // Click visible Add receipt button in main content
    await page.locator('main a[href*="/add"]').first().click()
    await expect(page).toHaveURL(/\/add/)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Verify we're on add page (form container or type selector visible)
    const formVisible = await page
      .locator('input#storeName, input#provider, select#billType')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const typeSelectorVisible = await page
      .getByRole('button', { name: /fiscal|household/i })
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    expect(formVisible || typeSelectorVisible).toBeTruthy()
  })

  test('should navigate between pages using menu', async ({ page }) => {
    // Navigate to receipts page via sidebar/menu
    const receiptsLink = page.getByRole('link', { name: /receipts/i }).first()
    await receiptsLink.click()

    // Wait for URL change with flexible timeout
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/receipts')

    // Navigate back to home
    const homeLink = page.getByRole('link', { name: /home/i }).first()
    await homeLink.click()

    // Wait for URL change
    await page.waitForTimeout(1000)
    const currentUrl = new URL(page.url())
    expect(currentUrl.pathname).toBe('/')
  })
})
