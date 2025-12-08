/**
 * Image Upload Service
 * Handles uploading receipt images to Vercel Blob storage
 */

import { logger } from '@/lib/logger'

const API_BASE = (import.meta.env['VITE_API_URL'] as string) || ''

export interface UploadResult {
  success: boolean
  url: string
  filename: string
  size: number
}

export interface UploadError {
  error: string
  details?: string
}

/**
 * Upload an image to Vercel Blob storage
 * @param file - The image file to upload
 * @param token - Auth token from localStorage
 * @returns Upload result with URL or throws error
 */
export async function uploadImage(file: File, token: string): Promise<UploadResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Only images are allowed.')
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Image too large. Maximum size is 10MB.')
  }

  try {
    // Convert file to array buffer for raw upload
    const buffer = await file.arrayBuffer()

    const response = await fetch(`${API_BASE}/api/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        Authorization: `Bearer ${token}`,
      },
      body: buffer,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(errorData.error || `Upload failed with status ${response.status}`)
    }

    const result = (await response.json()) as UploadResult
    logger.info('Image uploaded successfully:', { url: result.url, size: result.size })
    return result
  } catch (error) {
    logger.error('Image upload failed:', error)
    throw error
  }
}

/**
 * Delete an image from Vercel Blob storage
 * @param url - The URL of the image to delete
 * @param token - Auth token from localStorage
 */
export async function deleteImage(url: string, token: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/upload-image?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Delete failed' }))
      throw new Error(errorData.error || `Delete failed with status ${response.status}`)
    }

    logger.info('Image deleted successfully:', { url })
  } catch (error) {
    logger.error('Image delete failed:', error)
    throw error
  }
}

/**
 * Compress image before upload if needed
 * Uses canvas to resize large images
 */
export async function compressImage(file: File, maxWidth = 2048, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)

      // Calculate new dimensions
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Upload image with automatic compression
 */
export async function uploadImageWithCompression(
  file: File,
  token: string,
  options?: { maxWidth?: number; quality?: number }
): Promise<UploadResult> {
  const { maxWidth = 2048, quality = 0.85 } = options || {}

  // Compress if larger than 1MB or wider than maxWidth
  let fileToUpload: File | Blob = file

  if (file.size > 1024 * 1024 || file.type !== 'image/jpeg') {
    try {
      const compressed = await compressImage(file, maxWidth, quality)
      // Only use compressed if it's smaller
      if (compressed.size < file.size) {
        fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
        })
        logger.info('Image compressed:', {
          original: file.size,
          compressed: compressed.size,
          reduction: `${Math.round((1 - compressed.size / file.size) * 100)}%`,
        })
      }
    } catch (error) {
      logger.warn('Compression failed, using original:', error)
    }
  }

  return uploadImage(fileToUpload as File, token)
}
