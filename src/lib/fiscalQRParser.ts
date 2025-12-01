/**
 * Parser za srpske fiskalne QR kodove
 *
 * Format fiskalnog QR koda:
 * https://suf.purs.gov.rs/v/?vl=<data>
 *
 * Data format (URL encoded):
 * Ime=<merchant>&PIB=<pib>&Datum=<ddMMyyyyHHmm>&Ukupno=<amount>&BrojRacuna=<invoice>&ESIR=<esir>
 *
 * PIB validacija: 9 cifara, Luhn algoritam
 * Datum format: ddMMyyyyHHmm (12 cifara)
 */

import { logger } from '@/lib/logger'

export interface FiscalReceiptData {
  merchantName: string
  pib: string
  date: Date
  time: string
  totalAmount: number
  invoiceNumber?: string
  esir?: string
  qrLink?: string
  pdv?: number // PDV amount if parseable
}

export interface ParseError {
  code: 'INVALID_URL' | 'MISSING_PARAMS' | 'INVALID_PIB' | 'INVALID_DATE' | 'INVALID_AMOUNT'
  message: string
  field?: string
}

export type ParseResult =
  | { success: true; data: FiscalReceiptData }
  | { success: false; error: ParseError }

// ────────────────────────────────────────────────────────────────────────────────
// PIB Validation (Serbian Tax ID)
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Validates Serbian PIB (Poreski Identifikacioni Broj)
 * PIB is 9 digits with the last digit being a Luhn-like checksum
 */
export function validatePIB(pib: string): boolean {
  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(pib)) {
    return false
  }

  // Serbian PIB uses a modified Mod 11 algorithm
  const digits = pib.split('').map(Number)
  let sum = 10

  for (let i = 0; i < 8; i++) {
    const digit = digits[i]
    if (digit === undefined) return false
    sum = (sum + digit) % 10
    if (sum === 0) sum = 10
    sum = (sum * 2) % 11
  }

  const checkDigit = (11 - sum) % 10
  return checkDigit === digits[8]
}

// ────────────────────────────────────────────────────────────────────────────────
// Date Parsing & Validation
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Parses fiscal date string (format: ddMMyyyyHHmm)
 * Returns null if invalid
 */
export function parseFiscalDate(dateStr: string): { date: Date; time: string } | null {
  // Must be exactly 12 digits
  if (!/^\d{12}$/.test(dateStr)) {
    return null
  }

  const day = Number.parseInt(dateStr.substring(0, 2), 10)
  const month = Number.parseInt(dateStr.substring(2, 4), 10)
  const year = Number.parseInt(dateStr.substring(4, 8), 10)
  const hour = Number.parseInt(dateStr.substring(8, 10), 10)
  const minute = Number.parseInt(dateStr.substring(10, 12), 10)

  // Basic range validation
  if (day < 1 || day > 31) return null
  if (month < 1 || month > 12) return null
  if (year < 2000 || year > 2100) return null
  if (hour < 0 || hour > 23) return null
  if (minute < 0 || minute > 59) return null

  const date = new Date(year, month - 1, day, hour, minute)

  // Verify date is valid (handles cases like Feb 30)
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null
  }

  // Don't accept future dates (with 1 hour tolerance for clock differences)
  const maxDate = new Date()
  maxDate.setHours(maxDate.getHours() + 1)
  if (date > maxDate) {
    return null
  }

  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  return { date, time }
}

// ────────────────────────────────────────────────────────────────────────────────
// Amount Parsing
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Parses amount string with comma or dot as decimal separator
 * Returns null if invalid
 */
export function parseAmount(amountStr: string): number | null {
  // Normalize: replace comma with dot, remove spaces
  const normalized = amountStr.replace(/\s/g, '').replace(',', '.')

  // Must be a valid number format
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    // Allow more than 2 decimal places but round to 2
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      return null
    }
  }

  const amount = Number.parseFloat(normalized)

  if (Number.isNaN(amount)) return null

  // Reasonable amount range (0 to 100 million RSD)
  if (amount < 0 || amount > 100_000_000) return null

  // Round to 2 decimal places
  return Math.round(amount * 100) / 100
}

export function parseFiscalQR(qrData: string): FiscalReceiptData | null {
  const result = parseFiscalQRWithValidation(qrData)
  return result.success ? result.data : null
}

/**
 * Main parser with detailed validation and error reporting
 */
export function parseFiscalQRWithValidation(qrData: string): ParseResult {
  try {
    // Check if it's a Serbian fiscal QR code
    if (!qrData.includes('suf.purs.gov.rs') && !qrData.includes('vl=')) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'QR kod nije srpski fiskalni račun',
        },
      }
    }

    // Extract data from URL
    let url: URL
    try {
      url = new URL(qrData)
    } catch {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Neispravan URL format',
        },
      }
    }

    const vlParam = url.searchParams.get('vl')
    if (!vlParam) {
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Nedostaje vl parametar',
        },
      }
    }

    // Parse URL-encoded parameters
    const params = new URLSearchParams(vlParam)

    const merchantName = params.get('Ime') || params.get('ime') || ''
    const pib = params.get('PIB') || params.get('pib') || ''
    const dateStr = params.get('Datum') || params.get('datum') || ''
    const amountStr = params.get('Ukupno') || params.get('ukupno') || ''
    const invoiceNumber = params.get('BrojRacuna') || params.get('brojRacuna') || undefined
    const esir = params.get('ESIR') || params.get('esir') || undefined
    const pdvStr = params.get('PDV') || params.get('pdv') || undefined

    // Validate required fields
    if (!merchantName) {
      return {
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Nedostaje naziv prodavnice', field: 'Ime' },
      }
    }

    if (!pib) {
      return {
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Nedostaje PIB', field: 'PIB' },
      }
    }

    if (!dateStr) {
      return {
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Nedostaje datum', field: 'Datum' },
      }
    }

    if (!amountStr) {
      return {
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Nedostaje iznos', field: 'Ukupno' },
      }
    }

    // Validate PIB
    if (!validatePIB(pib)) {
      logger.warn('Invalid PIB in QR code:', pib)
      // Log but don't fail - some old receipts may have invalid PIBs
    }

    // Parse and validate date
    const parsedDate = parseFiscalDate(dateStr)
    if (!parsedDate) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: `Neispravan format datuma: ${dateStr}. Očekivan format: ddMMyyyyHHmm`,
          field: 'Datum',
        },
      }
    }

    // Parse and validate amount
    const totalAmount = parseAmount(amountStr)
    if (totalAmount === null) {
      return {
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: `Neispravan iznos: ${amountStr}`,
          field: 'Ukupno',
        },
      }
    }

    // Parse PDV if present
    let pdv: number | undefined
    if (pdvStr) {
      pdv = parseAmount(pdvStr) ?? undefined
    }

    const receipt: FiscalReceiptData = {
      merchantName: decodeURIComponent(merchantName),
      pib,
      date: parsedDate.date,
      time: parsedDate.time,
      totalAmount,
      qrLink: qrData,
    }

    if (invoiceNumber) {
      receipt.invoiceNumber = invoiceNumber
    }

    if (esir) {
      receipt.esir = esir
    }

    if (pdv !== undefined) {
      receipt.pdv = pdv
    }

    return { success: true, data: receipt }
  } catch (error) {
    logger.error('Failed to parse fiscal QR code:', error)
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Greška pri parsiranju QR koda',
      },
    }
  }
}

/**
 * Alternative parser for different fiscal QR formats
 * Some receipts may use different URL structures
 */
export function parseAlternativeFiscalQR(qrData: string): FiscalReceiptData | null {
  try {
    // Check for alternative patterns
    // Pattern 1: Direct parameters in URL
    if (qrData.includes('PIB=') || qrData.includes('pib=')) {
      const params = new URLSearchParams(qrData.split('?')[1] || qrData)

      const merchantName = params.get('Ime') || params.get('ime') || params.get('Merchant') || ''
      const pib = params.get('PIB') || params.get('pib') || ''
      const dateStr = params.get('Datum') || params.get('datum') || params.get('Date') || ''
      const amountStr =
        params.get('Ukupno') ||
        params.get('ukupno') ||
        params.get('Amount') ||
        params.get('Total') ||
        ''

      if (merchantName && pib && dateStr && amountStr) {
        // Try to parse the date (support multiple formats)
        let date = new Date()
        let time = '00:00'

        // Format: ddMMyyyyHHmm
        if (dateStr.length === 12) {
          const day = Number.parseInt(dateStr.substring(0, 2), 10)
          const month = Number.parseInt(dateStr.substring(2, 4), 10) - 1
          const year = Number.parseInt(dateStr.substring(4, 8), 10)
          const hour = Number.parseInt(dateStr.substring(8, 10), 10)
          const minute = Number.parseInt(dateStr.substring(10, 12), 10)
          date = new Date(year, month, day, hour, minute)
          time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        }
        // Format: yyyy-MM-dd or dd.MM.yyyy
        else {
          date = new Date(dateStr)
          if (Number.isNaN(date.getTime())) {
            date = new Date()
          }
        }

        const totalAmount = Number.parseFloat(amountStr.replace(',', '.'))

        if (!Number.isNaN(totalAmount)) {
          const result: FiscalReceiptData = {
            merchantName: decodeURIComponent(merchantName),
            pib,
            date,
            time,
            totalAmount,
            qrLink: qrData,
          }

          const alternativeInvoiceNumber = params.get('BrojRacuna') || undefined
          if (alternativeInvoiceNumber) {
            result.invoiceNumber = alternativeInvoiceNumber
          }

          return result
        }
      }
    }

    return null
  } catch (error) {
    logger.error('Alternative parser failed:', error)
    return null
  }
}

/**
 * Main entry point - tries all parsers
 */
export function parseQRCode(qrData: string): FiscalReceiptData | null {
  // Try standard fiscal QR parser
  let result = parseFiscalQR(qrData)

  // If that fails, try alternative parser
  if (!result) {
    result = parseAlternativeFiscalQR(qrData)
  }

  return result
}
