/**
 * Progressive Image Component
 *
 * Loads images with blur-up placeholder for better UX
 *
 * @module components/common/ProgressiveImage
 */

import { cn } from '@lib/utils'
import { useEffect, useState } from 'react'

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  placeholder?: string
  alt: string
  className?: string
  aspectRatio?: number
  onLoad?: () => void
  blur?: boolean
}

export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className,
  aspectRatio,
  onLoad,
  blur = true,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(placeholder || src)

  useEffect(() => {
    // Create image element to preload
    const img = new Image()

    img.onload = () => {
      setCurrentSrc(src)
      setIsLoaded(true)
      onLoad?.()
    }

    img.src = src
  }, [src, onLoad])

  return (
    <div
      className={cn('relative overflow-hidden bg-dark-100 dark:bg-dark-800', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          'h-full w-full object-cover transition-all duration-500',
          !isLoaded && blur && 'scale-110 blur-lg',
          isLoaded && 'scale-100 blur-0'
        )}
        {...props}
      />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900/10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      )}
    </div>
  )
}

/**
 * Generate blur placeholder from image
 *
 * @param imageUrl - URL of the image
 * @param width - Width of blur placeholder (default: 10px)
 * @returns Data URL of blurred image
 */
export async function generateBlurPlaceholder(imageUrl: string, width = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Calculate height maintaining aspect ratio
      const aspectRatio = img.height / img.width
      const height = Math.round(width * aspectRatio)

      canvas.width = width
      canvas.height = height

      // Draw scaled down image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to base64
      resolve(canvas.toDataURL('image/jpeg', 0.1))
    }

    img.onerror = reject
    img.src = imageUrl
  })
}

/**
 * Image with srcset for responsive loading
 */
interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  srcSet?: string
  sizes?: string
  alt: string
  className?: string
  lazy?: boolean
}

export function ResponsiveImage({
  src,
  srcSet,
  sizes,
  alt,
  className,
  lazy = true,
  ...props
}: ResponsiveImageProps) {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      {...props}
    />
  )
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths.map((width) => `${baseUrl}?w=${width} ${width}w`).join(', ')
}

/**
 * Generate sizes attribute
 */
export function generateSizes(breakpoints: Record<string, string>): string {
  return Object.entries(breakpoints)
    .map(([bp, size]) => `${bp} ${size}`)
    .join(', ')
}
