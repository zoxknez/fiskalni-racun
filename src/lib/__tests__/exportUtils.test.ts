import type { HouseholdBill, Receipt } from '@lib/db'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPORT_FILENAME,
  ensureFileExtension,
  exportHouseholdBillsToCSV,
  exportReceiptsToCSV,
  formatHouseholdBillForExport,
  formatReceiptForExport,
  type PlainRecord,
  recordsToCsv,
  sanitizeRecords,
} from '@/lib/exportUtils'

type SanitizedTestRecord = PlainRecord & {
  createdAt: string
  updatedAt: string | null
  items: Array<PlainRecord & { purchasedAt?: string }>
  meta: { notes: string; count: number }
  attachments: string[]
  file: string
}

// Helper: uzmi header nezavisno od \n ili \r\n
const getHeader = (csv: string) => csv.match(/^[^\r\n]*/)?.[0] ?? ''

// Helper: kreiraj File ako postoji u okruženju; fallback na “file-like” objekat
const makeTestFile = (name = 'document.pdf') => {
  try {
    if (typeof File !== 'undefined') {
      return new File(['dummy'], name, { type: 'application/pdf' })
    }
  } catch {
    /* ignore */
  }
  return { name } as unknown as File
}

describe('sanitizeRecords', () => {
  it('converts dates, undefined values and nested structures', () => {
    const input = [
      {
        id: 1,
        createdAt: new Date('2024-01-02T03:04:05.000Z'),
        updatedAt: undefined,
        items: [
          {
            name: 'Laptop',
            purchasedAt: new Date('2023-12-24T10:00:00.000Z'),
          },
        ],
        meta: new Map<string, unknown>([
          ['notes', 'Test'],
          ['count', 5],
        ]),
        attachments: new Set(['manual.pdf', 'receipt.jpg']),
        file: makeTestFile('document.pdf'),
      },
    ]

    const sanitizedRecords = sanitizeRecords(input)

    expect(sanitizedRecords).toHaveLength(1)
    const sanitized = sanitizedRecords[0] as SanitizedTestRecord
    if (!sanitized) throw new Error('Expected sanitized record')

    expect(sanitized.createdAt).toBe('2024-01-02T03:04:05.000Z')
    expect(sanitized.updatedAt).toBeNull()

    const items = sanitized.items
    expect(Array.isArray(items)).toBe(true)

    const [item] = Array.isArray(items) ? items : []
    expect(item?.purchasedAt).toBe('2023-12-24T10:00:00.000Z')

    expect(sanitized.meta).toStrictEqual({ notes: 'Test', count: 5 })
    expect(sanitized.attachments).toStrictEqual(['manual.pdf', 'receipt.jpg'])
    expect(sanitized.file).toBe('document.pdf')
  })
})

describe('recordsToCsv', () => {
  it('produces CSV with all fields and sanitized values', () => {
    const records: PlainRecord[] = [
      {
        id: 1,
        name: 'Printer',
        status: 'active',
        tags: ['office', 'electronics'],
      },
      {
        id: 2,
        name: 'Scanner',
        status: 'maintenance',
        tags: ['maintenance'],
      },
    ]

    const csv = recordsToCsv(records)

    // Header nezavisan od tipa novog reda
    expect(getHeader(csv)).toBe('id,name,status,tags')

    const escapeForCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

    const firstTags = JSON.stringify(['office', 'electronics'])
    const secondTags = JSON.stringify(['maintenance'])

    expect(csv).toContain(`1,Printer,active,${escapeForCsv(firstTags)}`)
    expect(csv).toContain(`2,Scanner,maintenance,${escapeForCsv(secondTags)}`)
  })
})

describe('ensureFileExtension', () => {
  it('appends missing extension and preserves existing', () => {
    expect(ensureFileExtension('data', '.json')).toBe('data.json')
    expect(ensureFileExtension('report.csv', 'csv')).toBe('report.csv')
    expect(ensureFileExtension('  export  ', 'zip')).toBe('export.zip')
    expect(ensureFileExtension('', 'json')).toBe(`${DEFAULT_EXPORT_FILENAME}.json`)
  })

  it('normalizes leading dot and casing of extension', () => {
    expect(ensureFileExtension('invoice', 'PDF')).toBe('invoice.pdf')
    expect(ensureFileExtension('archive', '.ZIP')).toBe('archive.zip')
    expect(ensureFileExtension('photo.jpeg', '.jpeg')).toBe('photo.jpeg')
  })
})

describe('formatReceiptForExport', () => {
  it('formats receipt with all fields', () => {
    const receipt: Receipt = {
      id: 1,
      merchantName: 'Maxi',
      pib: '123456789',
      date: new Date('2024-01-15T10:30:00.000Z'),
      time: '10:30',
      totalAmount: 1234.56,
      category: 'groceries',
      notes: 'Weekly shopping',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced',
    }

    const result = formatReceiptForExport(receipt)

    expect(result.merchant_name).toBe('Maxi')
    expect(result.pib).toBe('123456789')
    expect(result.date).toBe('2024-01-15')
    expect(result.time).toBe('10:30')
    expect(result.amount).toBe('1234.56')
    expect(result.category).toBe('groceries')
    expect(result.notes).toBe('Weekly shopping')
  })

  it('handles missing optional fields', () => {
    const receipt: Receipt = {
      merchantName: 'Shop',
      pib: '',
      date: new Date('2024-01-01'),
      time: '',
      totalAmount: 100,
      category: 'other',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced',
    }

    const result = formatReceiptForExport(receipt)

    expect(result.pib).toBe('')
    expect(result.time).toBe('')
    expect(result.notes).toBe('')
  })
})

describe('formatHouseholdBillForExport', () => {
  it('formats household bill with all fields', () => {
    const bill: HouseholdBill = {
      id: 1,
      provider: 'EPS',
      billType: 'electricity',
      accountNumber: '123-456',
      amount: 5432.1,
      billingPeriodStart: new Date('2024-01-01'),
      billingPeriodEnd: new Date('2024-01-31'),
      dueDate: new Date('2024-02-15'),
      paymentDate: new Date('2024-02-10'),
      status: 'paid',
      consumption: {
        value: 350,
        unit: 'kWh',
      },
      notes: 'Winter bill',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced',
    }

    const result = formatHouseholdBillForExport(bill)

    expect(result.provider).toBe('EPS')
    expect(result.bill_type).toBe('electricity')
    expect(result.account_number).toBe('123-456')
    expect(result.amount).toBe('5432.10')
    expect(result.billing_period_start).toBe('2024-01-01')
    expect(result.billing_period_end).toBe('2024-01-31')
    expect(result.due_date).toBe('2024-02-15')
    expect(result.payment_date).toBe('2024-02-10')
    expect(result.status).toBe('paid')
    expect(result.consumption_value).toBe('350')
    expect(result.consumption_unit).toBe('kWh')
    expect(result.notes).toBe('Winter bill')
  })

  it('handles missing optional fields', () => {
    const bill: HouseholdBill = {
      provider: 'Provider',
      billType: 'internet',
      amount: 1000,
      billingPeriodStart: new Date('2024-01-01'),
      billingPeriodEnd: new Date('2024-01-31'),
      dueDate: new Date('2024-02-15'),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced',
    }

    const result = formatHouseholdBillForExport(bill)

    expect(result.account_number).toBe('')
    expect(result.payment_date).toBe('')
    expect(result.consumption_value).toBe('')
    expect(result.consumption_unit).toBe('')
    expect(result.notes).toBe('')
  })
})

describe('exportReceiptsToCSV', () => {
  it('exports multiple receipts to CSV format', () => {
    const receipts: Receipt[] = [
      {
        id: 1,
        merchantName: 'Maxi',
        pib: '123456789',
        date: new Date('2024-01-15'),
        time: '10:30',
        totalAmount: 1500.5,
        category: 'groceries',
        notes: 'Shopping',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced',
      },
      {
        id: 2,
        merchantName: 'Idea',
        pib: '987654321',
        date: new Date('2024-01-16'),
        time: '15:45',
        totalAmount: 850.25,
        category: 'groceries',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced',
      },
    ]

    const csv = exportReceiptsToCSV(receipts)

    expect(csv).toContain('merchant_name')
    expect(csv).toContain('pib')
    expect(csv).toContain('Maxi')
    expect(csv).toContain('123456789')
    expect(csv).toContain('1500.50')
    expect(csv).toContain('Idea')
    expect(csv).toContain('850.25')
  })

  it('returns empty string for empty receipts array', () => {
    const csv = exportReceiptsToCSV([])
    expect(csv).toBe('')
  })
})

describe('exportHouseholdBillsToCSV', () => {
  it('exports multiple household bills to CSV format', () => {
    const bills: HouseholdBill[] = [
      {
        id: 1,
        provider: 'EPS',
        billType: 'electricity',
        amount: 3500,
        billingPeriodStart: new Date('2024-01-01'),
        billingPeriodEnd: new Date('2024-01-31'),
        dueDate: new Date('2024-02-15'),
        status: 'paid',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced',
      },
      {
        id: 2,
        provider: 'MTS',
        billType: 'internet',
        amount: 2000,
        billingPeriodStart: new Date('2024-01-01'),
        billingPeriodEnd: new Date('2024-01-31'),
        dueDate: new Date('2024-02-10'),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced',
      },
    ]

    const csv = exportHouseholdBillsToCSV(bills)

    expect(csv).toContain('provider')
    expect(csv).toContain('bill_type')
    expect(csv).toContain('EPS')
    expect(csv).toContain('electricity')
    expect(csv).toContain('3500.00')
    expect(csv).toContain('MTS')
    expect(csv).toContain('internet')
  })

  it('returns empty string for empty bills array', () => {
    const csv = exportHouseholdBillsToCSV([])
    expect(csv).toBe('')
  })
})
