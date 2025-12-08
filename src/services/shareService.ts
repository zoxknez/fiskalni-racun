/**
 * Share Service
 *
 * Handles sharing receipts and warranties as images or PDFs
 */

import { getCategoryLabel, type Locale } from '@lib/categories'
import type { Device, Receipt } from '@lib/db'
import { formatCurrency } from '@lib/utils'
import { logger } from '@/lib/logger'

// Check if Web Share API is available
export function isShareSupported(): boolean {
  return 'share' in navigator
}

// Check if can share files
export function canShareFiles(): boolean {
  return 'canShare' in navigator && navigator.canShare({ files: [new File([], 'test.txt')] })
}

/**
 * Share plain text content
 */
export async function shareText(title: string, text: string, url?: string): Promise<boolean> {
  if (!isShareSupported()) {
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  try {
    const shareData: ShareData = {
      title,
      text,
    }

    if (url) {
      shareData.url = url
    }

    await navigator.share(shareData)
    return true
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      logger.error('Share failed:', error)
    }
    return false
  }
}

/**
 * Generate receipt text for sharing
 */
export function generateReceiptText(receipt: Receipt, locale: Locale = 'sr'): string {
  const date = new Date(receipt.date).toLocaleDateString(locale === 'sr' ? 'sr-Latn-RS' : 'en-US')
  const category = getCategoryLabel(receipt.category, locale)

  const lines = [
    `📝 ${receipt.merchantName}`,
    `📅 ${date}`,
    `💰 ${formatCurrency(receipt.totalAmount)}`,
    `🏷️ ${category}`,
  ]

  if (receipt.notes) {
    lines.push(`📌 ${receipt.notes}`)
  }

  if (receipt.tags && receipt.tags.length > 0) {
    lines.push(`🔖 ${receipt.tags.join(', ')}`)
  }

  lines.push('')
  lines.push('— Fiskalni Račun App')

  return lines.join('\n')
}

/**
 * Generate warranty/device text for sharing
 */
export function generateWarrantyText(device: Device, locale: Locale = 'sr'): string {
  const purchaseDate = new Date(device.purchaseDate).toLocaleDateString(
    locale === 'sr' ? 'sr-Latn-RS' : 'en-US'
  )
  const expiryDate = new Date(device.warrantyExpiry).toLocaleDateString(
    locale === 'sr' ? 'sr-Latn-RS' : 'en-US'
  )

  const lines = [
    `📱 ${device.brand} ${device.model}`,
    `📅 Kupljeno: ${purchaseDate}`,
    `⏰ Garancija do: ${expiryDate}`,
    `📦 Kategorija: ${device.category}`,
  ]

  if (device.serialNumber) {
    lines.push(`🔢 Serijski broj: ${device.serialNumber}`)
  }

  if (device.serviceCenterName) {
    lines.push('')
    lines.push('🛠️ Servis:')
    lines.push(`   ${device.serviceCenterName}`)
    if (device.serviceCenterPhone) {
      lines.push(`   📞 ${device.serviceCenterPhone}`)
    }
    if (device.serviceCenterAddress) {
      lines.push(`   📍 ${device.serviceCenterAddress}`)
    }
  }

  lines.push('')
  lines.push('— Fiskalni Račun App')

  return lines.join('\n')
}

/**
 * Share receipt as text
 */
export async function shareReceipt(receipt: Receipt, locale: Locale = 'sr'): Promise<boolean> {
  const text = generateReceiptText(receipt, locale)
  return shareText(`${receipt.merchantName} - ${formatCurrency(receipt.totalAmount)}`, text)
}

/**
 * Share warranty/device as text
 */
export async function shareWarranty(device: Device, locale: Locale = 'sr'): Promise<boolean> {
  const text = generateWarrantyText(device, locale)
  return shareText(`${device.brand} ${device.model} - Garancija`, text)
}

/**
 * Generate receipt as canvas image
 */
export async function generateReceiptImage(
  receipt: Receipt,
  locale: Locale = 'sr'
): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Canvas dimensions
    const width = 400
    const padding = 24
    const lineHeight = 28

    // Calculate height based on content
    let contentLines = 5 // Base lines (header, store, date, amount, category)
    if (receipt.notes) contentLines += 2
    if (receipt.tags?.length) contentLines += 1
    contentLines += 2 // Footer

    const height = padding * 2 + contentLines * lineHeight + 40

    canvas.width = width * 2 // 2x for retina
    canvas.height = height * 2
    ctx.scale(2, 2)

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Header gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 60)
    gradient.addColorStop(0, '#0ea5e9')
    gradient.addColorStop(1, '#6366f1')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, 60)

    // Header text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px system-ui, sans-serif'
    ctx.fillText('🧾 Fiskalni Račun', padding, 38)

    let y = 80

    // Store name
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.fillText(receipt.merchantName, padding, y)
    y += lineHeight

    // Date
    const date = new Date(receipt.date).toLocaleDateString(
      locale === 'sr' ? 'sr-Latn-RS' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    )
    ctx.fillStyle = '#6b7280'
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText(`📅 ${date}`, padding, y)
    y += lineHeight

    // Amount
    ctx.fillStyle = '#059669'
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.fillText(`💰 ${formatCurrency(receipt.totalAmount)}`, padding, y)
    y += lineHeight + 8

    // Category
    const category = getCategoryLabel(receipt.category, locale)
    ctx.fillStyle = '#6b7280'
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText(`🏷️ ${category}`, padding, y)
    y += lineHeight

    // Notes
    if (receipt.notes) {
      y += 8
      ctx.fillStyle = '#374151'
      ctx.font = '13px system-ui, sans-serif'
      const noteText =
        receipt.notes.length > 50 ? receipt.notes.substring(0, 50) + '...' : receipt.notes
      ctx.fillText(`📌 ${noteText}`, padding, y)
      y += lineHeight
    }

    // Tags
    if (receipt.tags?.length) {
      ctx.fillStyle = '#8b5cf6'
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText(`🔖 ${receipt.tags.join(', ')}`, padding, y)
      y += lineHeight
    }

    // Footer
    y = height - padding
    ctx.fillStyle = '#9ca3af'
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('fiskalni.vercel.app', padding, y)

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  } catch (error) {
    logger.error('Failed to generate receipt image:', error)
    return null
  }
}

/**
 * Share receipt as image
 */
export async function shareReceiptAsImage(
  receipt: Receipt,
  locale: Locale = 'sr'
): Promise<boolean> {
  try {
    const blob = await generateReceiptImage(receipt, locale)
    if (!blob) {
      // Fallback to text
      return shareReceipt(receipt, locale)
    }

    const file = new File([blob], `racun-${receipt.id}.png`, { type: 'image/png' })

    if (canShareFiles()) {
      await navigator.share({
        title: `${receipt.merchantName} - ${formatCurrency(receipt.totalAmount)}`,
        text: generateReceiptText(receipt, locale),
        files: [file],
      })
      return true
    }

    // Fallback: Download the image
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `racun-${receipt.id}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      logger.error('Share as image failed:', error)
    }
    return false
  }
}

/**
 * Copy receipt text to clipboard
 */
export async function copyReceiptToClipboard(
  receipt: Receipt,
  locale: Locale = 'sr'
): Promise<boolean> {
  try {
    const text = generateReceiptText(receipt, locale)
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    logger.error('Copy to clipboard failed:', error)
    return false
  }
}
