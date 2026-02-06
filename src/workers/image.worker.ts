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
  data?: Blob
  error?: string
}

async function loadImageBitmap(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

function calculateResize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let targetWidth = width
  let targetHeight = height

  if (targetWidth > maxWidth) {
    targetHeight = (targetHeight * maxWidth) / targetWidth
    targetWidth = maxWidth
  }

  if (targetHeight > maxHeight) {
    targetWidth = (targetWidth * maxHeight) / targetHeight
    targetHeight = maxHeight
  }

  return { width: Math.round(targetWidth), height: Math.round(targetHeight) }
}

async function renderToBlob(
  image: ImageBitmap,
  width: number,
  height: number,
  format: 'webp' | 'jpeg' | 'png',
  quality: number
): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  ctx.drawImage(image, 0, 0, width, height)
  return canvas.convertToBlob({ type: `image/${format}`, quality })
}

async function resizeImage(imageData: string, maxWidth: number, maxHeight: number): Promise<Blob> {
  const img = await loadImageBitmap(imageData)
  try {
    const { width, height } = calculateResize(img.width, img.height, maxWidth, maxHeight)
    return await renderToBlob(img, width, height, 'webp', 0.8)
  } finally {
    img.close()
  }
}

async function compressImage(
  imageData: string,
  quality: number,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): Promise<Blob> {
  const img = await loadImageBitmap(imageData)
  try {
    return await renderToBlob(img, img.width, img.height, format, quality)
  } finally {
    img.close()
  }
}

async function createThumbnail(imageData: string, size = 200): Promise<Blob> {
  const img = await loadImageBitmap(imageData)
  try {
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

    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, size, size)
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })
  } finally {
    img.close()
  }
}

async function optimizeImage(
  imageData: string,
  options: ImageMessage['options'] = {}
): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8, format = 'webp' } = options
  const img = await loadImageBitmap(imageData)
  try {
    const { width, height } = calculateResize(img.width, img.height, maxWidth, maxHeight)
    return await renderToBlob(img, width, height, format, quality)
  } finally {
    img.close()
  }
}

// Message handler
self.onmessage = async (e: MessageEvent<ImageMessage>) => {
  const { type, imageData, options } = e.data

  try {
    let result: Blob

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
