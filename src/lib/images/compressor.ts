/**
 * Image Compression & Optimization
 *
 * Kompresuje slike pre upload-a na Supabase Storage
 * Generiše thumbnail verzije za brže učitavanje
 *
 * @module lib/images/compressor
 */

import { logger } from '../logger'

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  reductionPercent: number
  width: number
  height: number
}

/**
 * Kompresuje sliku i vraća optimizovan File
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8, format = 'webp' } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read file'))

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => reject(new Error('Failed to load image'))

      img.onload = () => {
        try {
          // Izračunaj nove dimenzije (održavaj aspect ratio)
          let { width, height } = img

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)
          }

          // Kreiraj canvas
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Draw image sa visokim kvalitetom
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }

              // Kreiraj novi File
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, `.${format === 'jpeg' ? 'jpg' : format}`),
                {
                  type: `image/${format}`,
                  lastModified: Date.now(),
                }
              )

              const originalSize = file.size
              const compressedSize = blob.size
              const reductionPercent = Math.round(
                ((originalSize - compressedSize) / originalSize) * 100
              )

              logger.info('Image compressed:', {
                original: `${(originalSize / 1024).toFixed(2)} KB`,
                compressed: `${(compressedSize / 1024).toFixed(2)} KB`,
                reduction: `${reductionPercent}%`,
                dimensions: `${width}x${height}`,
              })

              resolve({
                file: compressedFile,
                originalSize,
                compressedSize,
                reductionPercent,
                width,
                height,
              })
            },
            `image/${format}`,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Generiše thumbnail verziju slike
 */
export async function generateThumbnail(file: File, size: number = 200): Promise<File> {
  const result = await compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'webp',
  })

  return result.file
}

/**
 * Optimizuje sliku i kreira thumbnail u jednom pozivu
 */
export async function optimizeForUpload(file: File): Promise<{
  main: File
  thumbnail: File
  stats: {
    originalSize: number
    mainSize: number
    thumbnailSize: number
    totalReduction: number
  }
}> {
  // Proveri da li je valid image fajl
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  // Maksimalna veličina: 10MB
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    throw new Error('Image too large (max 10MB)')
  }

  try {
    // Paralelno generiši obe verzije
    const [mainResult, thumbResult] = await Promise.all([
      compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        format: 'webp',
      }),
      compressImage(file, {
        maxWidth: 200,
        maxHeight: 200,
        quality: 0.7,
        format: 'webp',
      }),
    ])

    const totalReduction = Math.round(
      ((file.size - mainResult.compressedSize - thumbResult.compressedSize) / file.size) * 100
    )

    return {
      main: mainResult.file,
      thumbnail: thumbResult.file,
      stats: {
        originalSize: file.size,
        mainSize: mainResult.compressedSize,
        thumbnailSize: thumbResult.compressedSize,
        totalReduction,
      },
    }
  } catch (error) {
    logger.error('Image optimization failed:', error)
    throw error
  }
}

/**
 * Validacija image fajla
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Proveri tip
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Nepodržan format slike. Podržani formati: JPEG, PNG, WebP, HEIC',
    }
  }

  // Proveri veličinu (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'Slika je prevelika. Maksimalna veličina: 10MB',
    }
  }

  return { valid: true }
}

/**
 * Batch kompresija više slika
 */
export async function compressBatch(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file) continue

    const result = await compressImage(file)
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, files.length)
    }
  }

  return results
}
