/**
 * Image Processing Web Worker
 *
 * Offloads heavy image operations to background thread
 *
 * @module workers/image.worker
 */

interface ImageMessage {
  type: 'optimize' | 'resize' | 'compress' | 'thumbnail'
  imageData: string
  options?: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  }
}

interface ImageResponse {
  type: 'result' | 'error'
  data?: string
  error?: string
}

/**
 * Load image from data URL
 */
async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Resize image
 */
async function resizeImage(
  imageData: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  const img = await loadImage(imageData)
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Calculate new dimensions
  let width = img.width
  let height = img.height

  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  // Resize canvas
  canvas.width = width
  canvas.height = height

  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height)

  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })
  return URL.createObjectURL(blob)
}

/**
 * Compress image
 */
async function compressImage(
  imageData: string,
  quality: number,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): Promise<string> {
  const img = await loadImage(imageData)
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  ctx.drawImage(img, 0, 0)

  const blob = await canvas.convertToBlob({
    type: `image/${format}`,
    quality,
  })

  return URL.createObjectURL(blob)
}

/**
 * Create thumbnail
 */
async function createThumbnail(imageData: string, size = 200): Promise<string> {
  const img = await loadImage(imageData)
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Calculate crop dimensions (center crop)
  const aspectRatio = img.width / img.height
  let cropWidth = img.width
  let cropHeight = img.height

  if (aspectRatio > 1) {
    cropWidth = img.height
  } else {
    cropHeight = img.width
  }

  const cropX = (img.width - cropWidth) / 2
  const cropY = (img.height - cropHeight) / 2

  // Draw cropped and resized image
  ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, size, size)

  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })
  return URL.createObjectURL(blob)
}

/**
 * Optimize image (resize + compress)
 */
async function optimizeImage(
  imageData: string,
  options: ImageMessage['options'] = {}
): Promise<string> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8, format = 'webp' } = options

  // First resize
  const resized = await resizeImage(imageData, maxWidth, maxHeight)

  // Then compress
  return compressImage(resized, quality, format)
}

// Message handler
self.onmessage = async (e: MessageEvent<ImageMessage>) => {
  const { type, imageData, options } = e.data

  try {
    let result: string

    switch (type) {
      case 'optimize':
        result = await optimizeImage(imageData, options)
        break

      case 'resize':
        result = await resizeImage(imageData, options?.maxWidth || 1920, options?.maxHeight || 1080)
        break

      case 'compress':
        result = await compressImage(imageData, options?.quality || 0.8, options?.format)
        break

      case 'thumbnail':
        result = await createThumbnail(imageData, 200)
        break

      default:
        throw new Error(`Unknown operation: ${type}`)
    }

    self.postMessage({
      type: 'result',
      data: result,
    } as ImageResponse)
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ImageResponse)
  }
}
