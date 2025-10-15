/**
 * Parser za srpske fiskalne QR kodove
 *
 * Format fiskalnog QR koda:
 * https://suf.purs.gov.rs/v/?vl=<data>
 *
 * Data format (URL encoded):
 * Ime=<merchant>&PIB=<pib>&Datum=<ddMMyyyyHHmm>&Ukupno=<amount>&BrojRacuna=<invoice>&ESIR=<esir>
 */

export interface FiscalReceiptData {
  merchantName: string
  pib: string
  date: Date
  time: string
  totalAmount: number
  invoiceNumber?: string
  esir?: string
  qrLink?: string
}

export function parseFiscalQR(qrData: string): FiscalReceiptData | null {
  try {
    // Check if it's a Serbian fiscal QR code
    if (!qrData.includes('suf.purs.gov.rs') && !qrData.includes('vl=')) {
      return null
    }

    // Extract data from URL
    const url = new URL(qrData)
    const vlParam = url.searchParams.get('vl')

    if (!vlParam) {
      return null
    }

    // Parse URL-encoded parameters
    const params = new URLSearchParams(vlParam)

    const merchantName = params.get('Ime') || params.get('ime') || ''
    const pib = params.get('PIB') || params.get('pib') || ''
    const dateStr = params.get('Datum') || params.get('datum') || ''
    const amountStr = params.get('Ukupno') || params.get('ukupno') || ''
    const invoiceNumber = params.get('BrojRacuna') || params.get('brojRacuna') || undefined
    const esir = params.get('ESIR') || params.get('esir') || undefined

    // Validate required fields
    if (!merchantName || !pib || !dateStr || !amountStr) {
      console.error('Missing required fields in QR code')
      return null
    }

    // Parse date (format: ddMMyyyyHHmm)
    const day = Number.parseInt(dateStr.substring(0, 2))
    const month = Number.parseInt(dateStr.substring(2, 4)) - 1 // JS months are 0-indexed
    const year = Number.parseInt(dateStr.substring(4, 8))
    const hour = Number.parseInt(dateStr.substring(8, 10))
    const minute = Number.parseInt(dateStr.substring(10, 12))

    const date = new Date(year, month, day, hour, minute)
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

    // Parse amount (can be with comma or dot)
    const totalAmount = Number.parseFloat(amountStr.replace(',', '.'))

    if (isNaN(totalAmount)) {
      console.error('Invalid amount in QR code:', amountStr)
      return null
    }

    return {
      merchantName: decodeURIComponent(merchantName),
      pib,
      date,
      time,
      totalAmount,
      invoiceNumber,
      esir,
      qrLink: qrData,
    }
  } catch (error) {
    console.error('Failed to parse fiscal QR code:', error)
    return null
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
          const day = Number.parseInt(dateStr.substring(0, 2))
          const month = Number.parseInt(dateStr.substring(2, 4)) - 1
          const year = Number.parseInt(dateStr.substring(4, 8))
          const hour = Number.parseInt(dateStr.substring(8, 10))
          const minute = Number.parseInt(dateStr.substring(10, 12))
          date = new Date(year, month, day, hour, minute)
          time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        }
        // Format: yyyy-MM-dd or dd.MM.yyyy
        else {
          date = new Date(dateStr)
          if (isNaN(date.getTime())) {
            date = new Date()
          }
        }

        const totalAmount = Number.parseFloat(amountStr.replace(',', '.'))

        if (!isNaN(totalAmount)) {
          return {
            merchantName: decodeURIComponent(merchantName),
            pib,
            date,
            time,
            totalAmount,
            qrLink: qrData,
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Alternative parser failed:', error)
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
