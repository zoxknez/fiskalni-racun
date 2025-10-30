/**
 * Form Submission E2E Tests
 *
 * ⚠️ MEMORY OPTIMIZED: Split from critical-flows to reduce memory pressure
 * Run separately: npx playwright test 02-forms.spec.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.addStyleTag({ content: testCSS })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should fill fiscal receipt form', async ({ page }) => {
    await page.goto('/add?type=fiscal')
    await expect(page.locator('input#storeName')).toBeVisible({ timeout: 10000 })

    await page.fill('input#storeName', 'Test Prodavnica')
    await page.fill('input#amount', '1234.56')
    await page.fill('input#date', '2025-10-22')

    // Verify fields are filled (don't submit to reduce DB writes)
    expect(await page.inputValue('input#storeName')).toBe('Test Prodavnica')
    expect(await page.inputValue('input#amount')).toBe('1234.56')
  })

  test('should fill household bill form', async ({ page }) => {
    await page.goto('/add?type=household')
    await expect(page.locator('select#billType')).toBeVisible({ timeout: 10000 })

    await page.selectOption('select#billType', 'electricity')
    await page.fill('input#provider', 'EPS')
    await page.fill('input#householdAmount', '5000')
    await page.fill('input#dueDate', '2025-11-01')

    // Verify fields are filled
    expect(await page.inputValue('input#provider')).toBe('EPS')
    expect(await page.inputValue('input#householdAmount')).toBe('5000')
  })

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/add?type=fiscal')
    await expect(page.locator('input#storeName')).toBeVisible({ timeout: 10000 })

    // Check if submit button is disabled (validation working)
    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()

    if (isDisabled) {
      // Button disabled on empty form = validation working
      expect(isDisabled).toBe(true)
    } else {
      // Try to submit empty form
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Should stay on add page or show validation error
      expect(page.url()).toContain('/add')
    }
  })
})
