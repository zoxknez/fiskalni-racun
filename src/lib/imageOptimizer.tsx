export type { ImageOptimizationOptions } from './imageOptimizer'
export {
  createThumbnail,
  fileToDataURL,
  generateSrcSet,
  getBestImageFormat,
  optimizeImage,
  supportsAVIF,
  supportsWebP,
} from './imageOptimizer'

export interface LazyImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
}

/**
 * Modern Lazy Image Component
 * Uses native lazy loading + modern decoding
 */
export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
}: LazyImageProps) {
  const style = width && height ? { aspectRatio: `${width} / ${height}` } : undefined

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      style={style}
    />
  )
}
