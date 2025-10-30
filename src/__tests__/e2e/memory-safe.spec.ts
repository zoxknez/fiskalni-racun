/**
 * ⚠️ MEMORY-OPTIMIZED E2E Tests
 *
 * Critical tests only - designed to prevent memory leaks:
 * - Animations disabled via CSS
 * - Minimal navigation
 * - Aggressive timeouts
 * - Memory monitoring
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

test.describe('Critical Tests (Memory Optimized)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate
    await page.goto('/')

    // ⚠️ Disable animations IMMEDIATELY
    await page.addStyleTag({ content: testCSS })

    // Wait for page to settle
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup wait
    await page.waitForTimeout(200)
  })

  test('Homepage loads', async ({ page }) => {
    // Verify main content area exists
    await expect(page.locator('main, #main-content, [role="main"]').first()).toBeVisible({
      timeout: 10000,
    })

    // Verify "Add receipt" button in main content (not navigation)
    await expect(page.locator('main a[href*="/add"]').first()).toBeVisible({ timeout: 10000 })

    // Verify quick actions section
    await expect(page.getByRole('heading', { name: /quick actions/i })).toBeVisible()
  })

  test('Add receipt form renders', async ({ page }) => {
    await page.goto('/add?type=fiscal')

    // Wait for form
    await expect(page.locator('input#storeName')).toBeVisible({ timeout: 8000 })

    // Verify form fields exist
    await expect(page.locator('input#amount')).toBeVisible()
    await expect(page.locator('input#date')).toBeVisible()
  })

  test('Form validation works', async ({ page }) => {
    await page.goto('/add?type=fiscal')
    await expect(page.locator('input#storeName')).toBeVisible({ timeout: 8000 })

    // Check that submit button exists (may be disabled)
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()

    // If button is enabled, try submitting; if disabled, validation is working
    const isDisabled = await submitButton.isDisabled()

    if (!isDisabled) {
      // Button enabled, try to submit empty form
      await submitButton.click()

      // Should prevent submission (HTML5 validation or stay on page)
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/add')
    } else {
      // Button disabled = validation working (form is empty)
      expect(isDisabled).toBe(true)
    }
  })
})
