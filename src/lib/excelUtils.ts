import type { HouseholdBill, Receipt } from '@lib/db'
import { format } from 'date-fns'
// Note: xlsx has known vulnerabilities (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9)
// However, we only use it for EXPORT operations (XLSX.utils.json_to_sheet, XLSX.write)
// We DO NOT use parsing functions (XLSX.read, XLSX.readFile) which are the vulnerable parts
// Risk assessment: LOW - no user-provided Excel files are parsed
import * as XLSX from 'xlsx'

/**
 * Excel Export Utilities
 * Comprehensive Excel generation with multiple sheets, formatting, and styling
 *
 * Security Note: Only uses xlsx for export operations. No parsing of user files.
 */

interface ExcelReceipt {
  Prodavac: string
  PIB: string
  Datum: string
  Vreme: string
  Iznos: string
  Kategorija: string
  Napomene: string
}

interface ExcelHouseholdBill {
  Provajder: string
  'Tip Računa': string
  Iznos: string
  'Datum Izdavanja': string
  'Datum Dospeća': string
  Status: string
  'Period Naplate': string
  'Potrošnja (kWh/m³)': string
  Napomene: string
}

interface ExcelSummary {
  Metrika: string
  'Fiskalni Računi': string | number
  'Računi Domaćinstva': string | number
  Ukupno: string | number
}

/**
 * Format receipt for Excel export
 */
export function formatReceiptForExcel(receipt: Receipt): ExcelReceipt {
  return {
    Prodavac: receipt.merchantName || '',
    PIB: receipt.pib || '',
    Datum: format(new Date(receipt.date), 'dd.MM.yyyy'),
    Vreme: receipt.time || '',
    Iznos: `${receipt.totalAmount.toFixed(2)} RSD`,
    Kategorija: receipt.category || 'Ostalo',
    Napomene: receipt.notes || '',
  }
}

/**
 * Format household bill for Excel export
 */
export function formatHouseholdBillForExcel(bill: HouseholdBill): ExcelHouseholdBill {
  const billingPeriod =
    bill.billingPeriodStart && bill.billingPeriodEnd
      ? `${format(new Date(bill.billingPeriodStart), 'dd.MM.yyyy')} - ${format(new Date(bill.billingPeriodEnd), 'dd.MM.yyyy')}`
      : ''

  const consumption = bill.consumption ? `${bill.consumption.value} ${bill.consumption.unit}` : ''

  return {
    Provajder: bill.provider || '',
    'Tip Računa': bill.billType || '',
    Iznos: `${bill.amount.toFixed(2)} RSD`,
    'Datum Izdavanja': bill.billingPeriodStart
      ? format(new Date(bill.billingPeriodStart), 'dd.MM.yyyy')
      : '',
    'Datum Dospeća': bill.dueDate ? format(new Date(bill.dueDate), 'dd.MM.yyyy') : '',
    Status: bill.status === 'paid' ? 'Plaćeno' : 'Neplaćeno',
    'Period Naplate': billingPeriod,
    'Potrošnja (kWh/m³)': consumption,
    Napomene: bill.notes || '',
  }
}

/**
 * Export receipts to Excel with multiple sheets
 */
export function exportToExcel(
  receipts: Receipt[] = [],
  householdBills: HouseholdBill[] = [],
  filename: string = 'fiskalni-racuni'
): void {
  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Calculate summary statistics
  const fiscalTotal = receipts.reduce((sum, r) => sum + r.totalAmount, 0)
  const fiscalAvg = receipts.length > 0 ? fiscalTotal / receipts.length : 0
  const householdTotal = householdBills.reduce((sum, b) => sum + b.amount, 0)
  const householdAvg = householdBills.length > 0 ? householdTotal / householdBills.length : 0
  const grandTotal = fiscalTotal + householdTotal

  // 1. Summary Sheet
  const summaryData: ExcelSummary[] = [
    {
      Metrika: 'Broj Računa',
      'Fiskalni Računi': receipts.length,
      'Računi Domaćinstva': householdBills.length,
      Ukupno: receipts.length + householdBills.length,
    },
    {
      Metrika: 'Ukupan Iznos',
      'Fiskalni Računi': `${fiscalTotal.toFixed(2)} RSD`,
      'Računi Domaćinstva': `${householdTotal.toFixed(2)} RSD`,
      Ukupno: `${grandTotal.toFixed(2)} RSD`,
    },
    {
      Metrika: 'Prosečan Iznos',
      'Fiskalni Računi': `${fiscalAvg.toFixed(2)} RSD`,
      'Računi Domaćinstva': `${householdAvg.toFixed(2)} RSD`,
      Ukupno: `${(
        (fiscalTotal + householdTotal) / (receipts.length + householdBills.length || 1)
      ).toFixed(2)} RSD`,
    },
  ]

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)

  // Set column widths for summary
  summarySheet['!cols'] = [
    { wch: 20 }, // Metrika
    { wch: 20 }, // Fiskalni Računi
    { wch: 20 }, // Računi Domaćinstva
    { wch: 20 }, // Ukupno
  ]

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Pregled')

  // 2. Fiscal Receipts Sheet
  if (receipts.length > 0) {
    const fiscalData = receipts.map(formatReceiptForExcel)
    const fiscalSheet = XLSX.utils.json_to_sheet(fiscalData)

    // Set column widths
    fiscalSheet['!cols'] = [
      { wch: 25 }, // Prodavac
      { wch: 12 }, // PIB
      { wch: 12 }, // Datum
      { wch: 8 }, // Vreme
      { wch: 15 }, // Iznos
      { wch: 15 }, // Kategorija
      { wch: 30 }, // Napomene
    ]

    XLSX.utils.book_append_sheet(workbook, fiscalSheet, 'Fiskalni Računi')
  }

  // 3. Household Bills Sheet
  if (householdBills.length > 0) {
    const householdData = householdBills.map(formatHouseholdBillForExcel)
    const householdSheet = XLSX.utils.json_to_sheet(householdData)

    // Set column widths
    householdSheet['!cols'] = [
      { wch: 20 }, // Provajder
      { wch: 15 }, // Tip Računa
      { wch: 15 }, // Iznos
      { wch: 15 }, // Datum Izdavanja
      { wch: 15 }, // Datum Dospeća
      { wch: 12 }, // Status
      { wch: 15 }, // Period Naplate
      { wch: 18 }, // Potrošnja
      { wch: 30 }, // Napomene
    ]

    XLSX.utils.book_append_sheet(workbook, householdSheet, 'Računi Domaćinstva')
  }

  // Generate and download Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export only fiscal receipts to Excel
 */
export function exportReceiptsToExcel(receipts: Receipt[], filename?: string): void {
  const exportFilename = filename || `fiskalni-racuni-${format(new Date(), 'yyyy-MM-dd')}`
  exportToExcel(receipts, [], exportFilename)
}

/**
 * Export only household bills to Excel
 */
export function exportHouseholdBillsToExcel(bills: HouseholdBill[], filename?: string): void {
  const exportFilename = filename || `domacinstvo-racuni-${format(new Date(), 'yyyy-MM-dd')}`
  exportToExcel([], bills, exportFilename)
}

/**
 * Export all data (receipts + household bills) to Excel
 */
export function exportAllToExcel(
  receipts: Receipt[],
  bills: HouseholdBill[],
  filename?: string
): void {
  const exportFilename = filename || `svi-podaci-${format(new Date(), 'yyyy-MM-dd')}`
  exportToExcel(receipts, bills, exportFilename)
}
