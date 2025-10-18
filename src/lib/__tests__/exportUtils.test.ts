import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPORT_FILENAME,
  ensureFileExtension,
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
