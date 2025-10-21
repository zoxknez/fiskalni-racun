/**
 * Advanced Image Optimization
 *
 * Modern image processing with WebP/AVIF support
 *
 * @module lib/images/optimizer
 */

import {
  canvasToBlob,
  createProcessingCanvas,
  get2dContext,
  getSourceDimensions,
  loadCanvasSource,
  releaseImageSource,
} from '@lib/canvasUtils'
import { logger } from '@/lib/logger'

export interface OptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'
  maintainAspectRatio?: boolean
}

export interface OptimizationResult {
  blob: Blob
  format: string
  originalSize: number
  optimizedSize: number
  reductionPercent: number
  width: number
  height: number
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  format: 'auto',
  maintainAspectRatio: true,
}

/**
 * Check browser format support
 */
const formatSupport = {
  webp:
    typeof document !== 'undefined' &&
    document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'),
  avif:
    typeof document !== 'undefined' &&
    document.createElement('canvas').toDataURL('image/avif').startsWith('data:image/avif'),
}

/**
 * Get best supported format
 */
export function getBestFormat(): 'image/avif' | 'image/webp' | 'image/jpeg' {
  if (formatSupport.avif) return 'image/avif'
  if (formatSupport.webp) return 'image/webp'
  return 'image/jpeg'
}

/**
 * Optimize image with modern formats
 *
 * @example
 * ```ts
 * const result = await optimizeImage(file, {
 *   maxWidth: 1920,
 *   quality: 0.85,
 *   format: 'auto'
 * })
 *
 * logger.debug(`Reduced by ${result.reductionPercent}%`)
 * ```
 */
export async function optimizeImage(
  file: File | Blob,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSize = file.size

  try {
    const source = await loadCanvasSource(file)

    try {
      const { width: originalWidth, height: originalHeight } = getSourceDimensions(source)

      // Calculate dimensions
      let width = originalWidth
      let height = originalHeight

      if (opts.maintainAspectRatio) {
        const aspectRatio = width / height

        if (width > opts.maxWidth) {
          width = opts.maxWidth
          height = width / aspectRatio
        }

        if (height > opts.maxHeight) {
          height = opts.maxHeight
          width = height * aspectRatio
        }
      } else {
        width = Math.min(width, opts.maxWidth)
        height = Math.min(height, opts.maxHeight)
      }

      width = Math.max(1, Math.round(width))
      height = Math.max(1, Math.round(height))

      // Create canvas
      const canvas = createProcessingCanvas(width, height)
      const ctx = get2dContext(canvas)

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(source, 0, 0, width, height)

      // Determine format
      const format = opts.format === 'auto' ? getBestFormat() : `image/${opts.format}`

      // Convert to blob
      const blob = await canvasToBlob(canvas, format, opts.quality)
      const optimizedSize = blob.size
      const reductionPercent =
        originalSize > 0 ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) : 0

      logger.info('Image optimized:', {
        original: `${Math.round(originalSize / 1024)}KB`,
        optimized: `${Math.round(optimizedSize / 1024)}KB`,
        reduction: `${reductionPercent}%`,
        format,
        dimensions: `${width}x${height}`,
      })

      return {
        blob,
        format,
        originalSize,
        optimizedSize,
        reductionPercent,
        width,
        height,
      }
    } finally {
      releaseImageSource(source)
    }
  } catch (error) {
    logger.error('Image optimization failed:', error)

    // Fallback: return original
    return {
      blob: file,
      format: file.type,
      originalSize: file.size,
      optimizedSize: file.size,
      reductionPercent: 0,
      width: 0,
      height: 0,
    }
  }
}

/**
 * Generate responsive image variants
 *
 * Creates multiple sizes for srcset attribute
 */
export async function generateResponsiveVariants(
  file: File,
  widths: number[] = [320, 640, 960, 1280, 1920]
): Promise<Array<{ blob: Blob; width: number; url: string }>> {
  const variants = await Promise.all(
    widths.map(async (width) => {
      const result = await optimizeImage(file, {
        maxWidth: width,
        format: 'auto',
      })

      const url = URL.createObjectURL(result.blob)

      return {
        blob: result.blob,
        width: result.width,
        url,
      }
    })
  )

  return variants
}

/**
 * Create thumbnail
 */
export async function createThumbnail(file: File | Blob, size = 200): Promise<Blob> {
  const result = await optimizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'webp',
  })

  return result.blob
}

/**
 * Batch optimize images
 */
export async function optimizeImages(
  files: File[],
  options?: OptimizationOptions,
  onProgress?: (current: number, total: number) => void
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file) {
      continue
    }

    const result = await optimizeImage(file, options)
    results.push(result)

    onProgress?.(i + 1, files.length)
  }

  return results
}
