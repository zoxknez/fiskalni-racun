/**
 * Share utilities for Capacitor
 *
 * Native sharing functionality for mobile platforms
 *
 * @module lib/capacitor/share
 */

import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/**
 * Check if sharing is available
 */
export function canShare(): Promise<boolean> {
  return Promise.resolve(
    !Capacitor.isNativePlatform() ? typeof navigator.share !== 'undefined' : true
  )
}

/**
 * Share text
 */
export async function shareText(text: string, title?: string): Promise<void> {
  const isAvailable = await canShare()

  if (!isAvailable) {
    console.warn('Sharing not available')
    return
  }

  try {
    await Share.share({
      title: title || 'Podeli',
      text,
      dialogTitle: title || 'Podeli',
    })
  } catch (error) {
    console.error('Failed to share:', error)
    throw error
  }
}

/**
 * Share URL
 */
export async function shareUrl(url: string, title?: string, text?: string): Promise<void> {
  const isAvailable = await canShare()

  if (!isAvailable) {
    console.warn('Sharing not available')
    return
  }

  try {
    await Share.share({
      title: title || 'Podeli',
      text: text || '',
      url,
      dialogTitle: title || 'Podeli',
    })
  } catch (error) {
    console.error('Failed to share:', error)
    throw error
  }
}

/**
 * Share file
 * Note: File must be saved to filesystem first
 */
export async function shareFile(fileUri: string, title?: string, text?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.warn('File sharing only available on native platforms')
    return
  }

  try {
    await Share.share({
      title: title || 'Podeli fajl',
      text: text || '',
      url: fileUri,
      dialogTitle: title || 'Podeli fajl',
    })
  } catch (error) {
    console.error('Failed to share file:', error)
    throw error
  }
}

/**
 * Share receipt as PDF
 */
export async function shareReceipt(receiptId: number, merchantName: string): Promise<void> {
  try {
    // This would integrate with your PDF generation
    const text = `Račun od ${merchantName}`
    const url = `${window.location.origin}/receipts/${receiptId}`

    await shareUrl(url, `Račun - ${merchantName}`, text)
  } catch (error) {
    console.error('Failed to share receipt:', error)
    throw error
  }
}
