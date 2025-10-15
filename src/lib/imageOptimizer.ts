import {
  canvasToBlob,
  createProcessingCanvas,
  get2dContext,
  getSourceDimensions,
  loadCanvasSource,
  releaseImageSource,
} from '@lib/canvasUtils'
import { logger } from './logger'

/**
 * Modern Image Optimization Utilities
 *
 * Features:
 * - WebP/AVIF conversion
 * - Automatic resizing
 * - Quality optimization
 * - Progressive enhancement
 * - Lazy loading support
 */

export interface ImageOptimizationOptions {
  /** Maximum width in pixels */
  maxWidth?: number
  /** Maximum height in pixels */
  maxHeight?: number
  /** Output quality (0-1) */
  quality?: number
  /** Output format (auto-detect best) */
  format?: 'webp' | 'jpeg' | 'png' | 'auto'
  /** Maintain aspect ratio */
  maintainAspectRatio?: boolean
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  format: 'auto',
  maintainAspectRatio: true,
}

/**
 * Check if browser supports modern image formats
 */
export function supportsWebP(): boolean {
  if (typeof document === 'undefined') return false
  const elem = document.createElement('canvas')
  if (elem.getContext?.('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }
  return false
}

export function supportsAVIF(): boolean {
  if (typeof document === 'undefined') return false
  const elem = document.createElement('canvas')
  if (elem.getContext?.('2d')) {
    return elem.toDataURL('image/avif').indexOf('data:image/avif') === 0
  }
  return false
}

/**
 * Get best supported image format
 */
export function getBestImageFormat(): 'image/avif' | 'image/webp' | 'image/jpeg' {
  if (supportsAVIF()) return 'image/avif'
  if (supportsWebP()) return 'image/webp'
  return 'image/jpeg'
}

/**
 * Optimize image file
 * Automatically resizes and converts to modern format
 */
export async function optimizeImage(
  file: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    const source = await loadCanvasSource(file)
    try {
      const { width: originalWidth, height: originalHeight } = getSourceDimensions(source)

      // Calculate dimensions maintaining aspect ratio
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

      // Round dimensions and ensure minimum size of 1px
      width = Math.max(1, Math.round(width))
      height = Math.max(1, Math.round(height))

      // Create canvas and draw image
      const canvas = createProcessingCanvas(width, height)
      const ctx = get2dContext(canvas)

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(source, 0, 0, width, height)

      // Determine output format
      const format = opts.format === 'auto' ? getBestImageFormat() : `image/${opts.format}`

      const blob = await canvasToBlob(canvas, format, opts.quality)
      const reduction =
        file.size > 0 ? `${Math.round(((file.size - blob.size) / file.size) * 100)}%` : 'n/a'

      logger.info('Image optimization:', {
        original: `${Math.round(file.size / 1024)}KB`,
        optimized: `${Math.round(blob.size / 1024)}KB`,
        reduction,
        format,
        dimensions: `${width}x${height}`,
      })

      return blob
    } finally {
      releaseImageSource(source)
    }
  } catch (error) {
    logger.error('Image optimization failed:', error)
    // Return original file if optimization fails
    return file
  }
}

/**
 * Convert File to Data URL
 * Useful for previews
 */
export function fileToDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Generate responsive image srcset
 * For <img srcset> attribute
 */
export async function generateSrcSet(
  file: File,
  widths: number[] = [320, 640, 960, 1280, 1920]
): Promise<string[]> {
  const format = getBestImageFormat()

  const results = await Promise.all(
    widths.map(async (width) => {
      const optimized = await optimizeImage(file, {
        maxWidth: width,
        format: format === 'image/avif' ? 'webp' : 'auto', // Fallback to webp for srcset
      })
      const dataURL = await fileToDataURL(optimized)
      return `${dataURL} ${width}w`
    })
  )

  return results
}

/**
 * Create thumbnail
 * Generates small preview image
 */
export async function createThumbnail(file: File | Blob, size = 200): Promise<Blob> {
  return await optimizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'webp',
  })
}

/**
 * Lazy Image Component Props
 */
export interface LazyImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
}

// Note: LazyImage component moved to imageOptimizer.tsx due to JSX syntax
