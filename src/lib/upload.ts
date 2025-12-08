/**
 * Vercel Blob Upload Service
 *
 * Client-side service for uploading files to Vercel Blob
 *
 * @module lib/upload
 */

import { upload } from '@vercel/blob/client'
import { logger } from '@/lib/logger'

const API_URL = import.meta.env['VITE_API_URL'] || '/api'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface BlobFile {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

export interface ListResult {
  success: boolean
  blobs?: BlobFile[]
  error?: string
}

/**
 * Upload a file to Vercel Blob storage
 * Uses client-side upload to avoid serverless function timeouts
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<UploadResult> {
  try {
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2)
    const filename = `${folder}/${timestamp}-${random}.${ext}`

    const newBlob = await upload(filename, file, {
      access: 'public',
      handleUploadUrl: `${API_URL}/upload`,
    })

    return {
      success: true,
      url: newBlob.url,
    }
  } catch (error) {
    logger.error('Upload error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Upload a receipt image
 */
export async function uploadReceiptImage(file: File): Promise<UploadResult> {
  return uploadFile(file, 'receipts')
}

/**
 * Upload a warranty document
 */
export async function uploadWarrantyDocument(file: File): Promise<UploadResult> {
  return uploadFile(file, 'warranties')
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(file: File): Promise<UploadResult> {
  return uploadFile(file, 'avatars')
}

/**
 * Upload a general document
 */
export async function uploadDocument(file: File): Promise<UploadResult> {
  return uploadFile(file, 'documents')
}

/**
 * Delete a file from Vercel Blob
 */
export async function deleteFile(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Delete failed' }
    }

    return { success: true }
  } catch (error) {
    logger.error('Delete error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * List files in Vercel Blob
 */
export async function listFiles(prefix?: string, limit: number = 100): Promise<ListResult> {
  try {
    const params = new URLSearchParams()
    if (prefix) params.set('prefix', prefix)
    params.set('limit', limit.toString())

    const response = await fetch(`${API_URL}/upload?${params.toString()}`, {
      method: 'GET',
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'List failed' }
    }

    return data
  } catch (error) {
    logger.error('List error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Helper to compress image before upload
 */
export async function compressAndUpload(
  file: File,
  folder: string = 'uploads',
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<UploadResult> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return uploadFile(file, folder)
  }

  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')

    let width = bitmap.width
    let height = bitmap.height

    // Resize if too large
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width)
      width = maxWidth
    }

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return uploadFile(file, folder)
    }

    ctx.drawImage(bitmap, 0, 0, width, height)

    // Convert to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality)
    })

    if (!blob) {
      return uploadFile(file, folder)
    }

    // Create new file with webp extension
    const newFileName = file.name.replace(/\.[^/.]+$/, '.webp')
    const compressedFile = new File([blob], newFileName, { type: 'image/webp' })

    logger.info(`Compressed ${file.name}: ${file.size} -> ${compressedFile.size} bytes`)

    return uploadFile(compressedFile, folder)
  } catch (error) {
    logger.warn('Compression failed, uploading original:', error)
    return uploadFile(file, folder)
  }
}
