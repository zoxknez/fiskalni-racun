/**
 * Modern Web Share API
 *
 * Native sharing functionality for mobile and desktop
 * Supports text, URL, and files
 *
 * Supported: Chrome 89+, Edge 93+, Safari 14+, Mobile browsers
 */

import { logger } from './logger'

export interface ShareData {
  title?: string
  text?: string
  url?: string
  files?: File[]
}

export interface ShareResult {
  success: boolean
  error?: string
  shared: boolean
}

/**
 * Check if Web Share API is supported
 */
export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

/**
 * Check if sharing files is supported
 */
export function isFileShareSupported(): boolean {
  return isShareSupported() && 'canShare' in navigator && navigator.canShare?.({ files: [] })
}

/**
 * Share content using native share sheet
 */
export async function share(data: ShareData): Promise<ShareResult> {
  if (!isShareSupported()) {
    return {
      success: false,
      error: 'Web Share API not supported',
      shared: false,
    }
  }

  // Check if can share (especially for files)
  if (data.files && data.files.length > 0) {
    if (!navigator.canShare?.({ files: data.files })) {
      return {
        success: false,
        error: 'Cannot share files on this device',
        shared: false,
      }
    }
  }

  try {
    await navigator.share(data)
    logger.log('Content shared successfully')
    return {
      success: true,
      shared: true,
    }
  } catch (error) {
    // User cancelled share
    if (error instanceof Error && error.name === 'AbortError') {
      logger.debug('Share cancelled by user')
      return {
        success: true,
        shared: false,
        error: 'cancelled',
      }
    }

    logger.error('Share failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Share failed',
      shared: false,
    }
  }
}

/**
 * Share receipt
 */
export async function shareReceipt(receipt: {
  merchantName: string
  totalAmount: number
  date: Date
  category?: string
}): Promise<ShareResult> {
  const formattedAmount = new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
  }).format(receipt.totalAmount)

  const formattedDate = new Intl.DateTimeFormat('sr-RS').format(receipt.date)

  return share({
    title: `Račun - ${receipt.merchantName}`,
    text: `Račun od ${receipt.merchantName}\n${formattedAmount}\n${formattedDate}\n${receipt.category ? `Kategorija: ${receipt.category}` : ''}`,
    url: window.location.href,
  })
}

/**
 * Share device warranty info
 */
export async function shareWarranty(device: {
  brand: string
  model: string
  warrantyExpiry: Date
}): Promise<ShareResult> {
  const daysUntil = Math.ceil(
    (device.warrantyExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return share({
    title: `Garancija - ${device.brand} ${device.model}`,
    text: `Garancija za ${device.brand} ${device.model}\nIsteka za ${daysUntil} dana\nDatum isteka: ${new Intl.DateTimeFormat('sr-RS').format(device.warrantyExpiry)}`,
    url: window.location.href,
  })
}

/**
 * Share image file
 */
export async function shareImage(file: File, title?: string): Promise<ShareResult> {
  if (!isFileShareSupported()) {
    return {
      success: false,
      error: 'File sharing not supported',
      shared: false,
    }
  }

  return share({
    title: title || 'Slika',
    files: [file],
  })
}

/**
 * Fallback: Copy to clipboard if share not supported
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    logger.log('Copied to clipboard')
    return true
  } catch (error) {
    logger.error('Failed to copy to clipboard:', error)

    // Fallback: legacy method
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()

    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      document.body.removeChild(textArea)
      return false
    }
  }
}

/**
 * Read from clipboard (requires user permission)
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText()
    return text
  } catch (error) {
    logger.error('Failed to read from clipboard:', error)
    return null
  }
}
