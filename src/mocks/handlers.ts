/**
 * MSW (Mock Service Worker) Request Handlers
 *
 * Mock API responses for testing
 *
 * @module mocks/handlers
 */

import { HttpResponse, http } from 'msw'

const API_URL = 'https://test.api.local'

export const handlers = [
  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  // Sign up
  http.post(`${API_URL}/auth/signup`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: body.email,
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    })
  }),

  // Sign in
  http.post(`${API_URL}/auth/token`, async ({ request }) => {
    const params = await request.text()
    const urlParams = new URLSearchParams(params)
    const email = urlParams.get('email')

    if (email === 'error@test.com') {
      return HttpResponse.json({ error: 'Invalid login credentials' }, { status: 400 })
    }

    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email,
      },
    })
  }),

  // Get user
  http.get(`${API_URL}/auth/user`, () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    })
  }),

  // Sign out
  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true })
  }),

  // ============================================
  // RECEIPTS ENDPOINTS
  // ============================================

  // Get receipts
  http.get(`${API_URL}/receipts`, ({ request }) => {
    const url = new URL(request.url)
    const limit = url.searchParams.get('limit') || '20'
    const category = url.searchParams.get('category')

    const mockReceipts = [
      {
        id: 1,
        user_id: 'mock-user-id',
        merchant_name: 'Maxi',
        pib: '123456789',
        date: '2024-01-15T10:30:00Z',
        total_amount: 1234.56,
        vat_amount: 123.45,
        category: 'groceries',
        items: [],
        image_url: null,
        qr_data: null,
        notes: null,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
      {
        id: 2,
        user_id: 'mock-user-id',
        merchant_name: 'Tehnomanija',
        pib: '987654321',
        date: '2024-01-10T14:20:00Z',
        total_amount: 5999.0,
        vat_amount: 599.9,
        category: 'electronics',
        items: [],
        image_url: null,
        qr_data: null,
        notes: 'Laptop',
        created_at: '2024-01-10T14:20:00Z',
        updated_at: '2024-01-10T14:20:00Z',
      },
    ]

    const filtered = category ? mockReceipts.filter((r) => r.category === category) : mockReceipts

    return HttpResponse.json(filtered.slice(0, Number.parseInt(limit, 10)), {
      headers: {
        'Content-Range': `0-${filtered.length - 1}/${filtered.length}`,
      },
    })
  }),

  // Get single receipt
  http.get(`${API_URL}/receipts`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id === 'eq.999') {
      return HttpResponse.json([], { status: 200 })
    }

    return HttpResponse.json([
      {
        id: 1,
        user_id: 'mock-user-id',
        merchant_name: 'Maxi',
        total_amount: 1234.56,
        category: 'groceries',
        date: '2024-01-15T10:30:00Z',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ])
  }),

  // Create receipt
  http.post(`${API_URL}/receipts`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>

    return HttpResponse.json(
      {
        id: 3,
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  }),

  // Update receipt
  http.patch(`${API_URL}/receipts`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>

    return HttpResponse.json({
      ...body,
      updated_at: new Date().toISOString(),
    })
  }),

  // Delete receipt
  http.delete(`${API_URL}/receipts`, () => {
    return HttpResponse.json({ success: true }, { status: 204 })
  }),

  // ============================================
  // DEVICES ENDPOINTS
  // ============================================

  // Get devices
  http.get(`${API_URL}/devices`, () => {
    return HttpResponse.json([
      {
        id: 1,
        user_id: 'mock-user-id',
        brand: 'Samsung',
        model: 'Galaxy S24',
        category: 'electronics',
        purchase_date: '2024-01-01',
        warranty_months: 24,
        warranty_end_date: '2026-01-01',
        serial_number: 'SN123456',
        in_service: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  // Create device
  http.post(`${API_URL}/devices`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>

    return HttpResponse.json(
      {
        id: 2,
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  }),

  // ============================================
  // ERROR SIMULATION
  // ============================================

  // Simulate network error
  http.get(`${API_URL}/error`, () => {
    return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }),

  // Simulate slow response
  http.get(`${API_URL}/slow`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return HttpResponse.json({ data: 'slow response' })
  }),
]
