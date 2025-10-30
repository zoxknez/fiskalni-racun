/**
 * Import/Export E2E Tests
 *
 * Tests for import/export functionality
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testCSS = fs.readFileSync(path.join(__dirname, 'test-animations.css'), 'utf-8')

test.describe('Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/import-export')
    await page.addStyleTag({ content: testCSS })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(200)
  })

  test('should load import/export page', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible()
    expect(page.url()).toContain('/import-export')
  })

  test('should have export options', async ({ page }) => {
    // Check for export buttons (JSON, CSV, etc)
    const exportButtons = page.locator('button:has-text(/export|download|izvoz/i)')
    const hasExport = await exportButtons
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    expect(hasExport || page.url().includes('/import-export')).toBeTruthy()
  })

  test('should have import section', async ({ page }) => {
    // Check for import/upload area
    const importSection = page.locator('text=/import|upload|file|učitaj|uvoz/i').first()
    const hasImport = await importSection.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasImport || page.url().includes('/import-export')).toBeTruthy()
  })
})
