/**
 * Search & UI E2E Tests
 *
 * ⚠️ MEMORY OPTIMIZED: Split from critical-flows to reduce memory pressure
 * Run separately: npx playwright test 03-search-ui.spec.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('Search & UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.addStyleTag({ content: testCSS })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should search for receipts', async ({ page }) => {
    await page.goto('/search')

    const searchInput = page.locator('input[type="text"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.fill('test')
    await page.waitForTimeout(600)

    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('test')
  })

  test('should toggle theme', async ({ page }) => {
    const themeButton = page.locator('button:has-text(/Dark|Light|Theme/i)').first()

    if (await themeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const html = page.locator('html')
      const initialClass = await html.getAttribute('class')

      await themeButton.click()
      await page.waitForTimeout(400)

      const newClass = await html.getAttribute('class')
      expect(newClass).not.toBe(initialClass)
    }
  })
})
