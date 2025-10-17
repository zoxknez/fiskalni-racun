/**
 * E2E Tests for API Error Handling
 *
 * Tests that the app handles various API errors gracefully:
 * - Network errors
 * - Authentication errors (401)
 * - Authorization errors (403)
 * - Not found errors (404)
 * - Server errors (500)
 */

import { expect, test } from '@playwright/test'

test.describe('API Error Handling', () => {
  test('should handle network timeout gracefully', async ({ page }) => {
    // Mock a slow API response
    await page.route('**/supabase.co/**', async (route) => {
      await page.waitForTimeout(30000) // Simulate timeout
      await route.abort('timedout')
    })

    await page.goto('/')

    // Should show error message
    await expect(page.locator('text=/greška|error|timeout|problem/i')).toBeVisible({
      timeout: 35000,
    })
  })

  test('should redirect to login on 401 unauthorized', async ({ page }) => {
    // Mock 401 response
    await page.route('**/supabase.co/rest/v1/receipts**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid token',
        }),
      })
    })

    await page.goto('/receipts')

    // Should redirect to login or show auth error
    await expect(page).toHaveURL(/\/(login|auth)/, { timeout: 10000 })
  })

  test('should show permission error on 403 forbidden', async ({ page }) => {
    await page.route('**/supabase.co/rest/v1/receipts**', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        }),
      })
    })

    await page.goto('/receipts')

    await expect(
      page.locator('text=/zabranjen|forbidden|nema dozvolu|no permission/i')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should show not found message on 404', async ({ page }) => {
    // Mock 404 for specific receipt
    await page.route('**/supabase.co/rest/v1/receipts?id=eq.non-existent-id**', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Not Found',
          message: 'Receipt not found',
        }),
      })
    })

    await page.goto('/receipts/non-existent-id')

    await expect(page.locator('text=/nije pronađen|not found|ne postoji/i')).toBeVisible({
      timeout: 10000,
    })
  })

  test('should show server error on 500', async ({ page }) => {
    await page.route('**/supabase.co/rest/v1/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Something went wrong',
        }),
      })
    })

    await page.goto('/receipts')

    await expect(
      page.locator('text=/greška na serveru|server error|pokušajte ponovo/i')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should retry failed requests', async ({ page }) => {
    let attemptCount = 0

    await page.route('**/supabase.co/rest/v1/receipts**', (route) => {
      attemptCount++

      if (attemptCount < 3) {
        // Fail first 2 attempts
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' }),
        })
      } else {
        // Succeed on 3rd attempt
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              vendor: 'Test Vendor',
              total_amount: 100,
              date: '2024-01-01',
            },
          ]),
        })
      }
    })

    await page.goto('/receipts')

    // Should eventually succeed after retries
    await expect(page.locator('text=/Test Vendor/i')).toBeVisible({ timeout: 15000 })

    // Should have retried at least 3 times
    expect(attemptCount).toBeGreaterThanOrEqual(3)
  })

  test('should handle malformed JSON response', async ({ page }) => {
    await page.route('**/supabase.co/rest/v1/receipts**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'This is not valid JSON {{{',
      })
    })

    await page.goto('/receipts')

    // Should show error about invalid response
    await expect(page.locator('text=/greška|error|nevažeć|invalid/i')).toBeVisible({
      timeout: 10000,
    })
  })

  test('should handle rate limiting (429)', async ({ page }) => {
    await page.route('**/supabase.co/rest/v1/**', (route) => {
      route.fulfill({
        status: 429,
        headers: {
          'Retry-After': '5',
        },
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
        }),
      })
    })

    await page.goto('/receipts')

    // Should show rate limit message
    await expect(page.locator('text=/previše zahteva|too many requests|rate limit/i')).toBeVisible({
      timeout: 10000,
    })
  })

  test('should handle CORS errors', async ({ page }) => {
    await page.route('**/supabase.co/**', (route) => {
      route.abort('failed') // Simulate CORS failure
    })

    await page.goto('/receipts')

    // Should show connection error
    await expect(page.locator('text=/greška|error|konekcija|connection/i')).toBeVisible({
      timeout: 10000,
    })
  })

  test('should validate form data before submission', async ({ page }) => {
    await page.goto('/receipts/new')

    // Try to submit empty form
    await page.click('button:has-text("Sačuvaj"), button[type="submit"]')

    // Should show validation errors
    await expect(page.locator('text=/obavezno|required|popunite/i')).toBeVisible({ timeout: 5000 })

    // Should not make API call
    let apiCallMade = false
    page.on('request', (request) => {
      if (request.url().includes('supabase.co') && request.method() === 'POST') {
        apiCallMade = true
      }
    })

    await page.waitForTimeout(2000)
    expect(apiCallMade).toBe(false)
  })
})
