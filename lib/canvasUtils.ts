export type CanvasSource = ImageBitmap | HTMLImageElement

export async function loadCanvasSource(file: Blob, signal?: AbortSignal): Promise<CanvasSource> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fallback to HTMLImageElement loader when createImageBitmap fails
    }
  }
  return await loadImageElement(file, signal)
}

export function createProcessingCanvas(
  width: number,
  height: number
): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  if (typeof document === 'undefined') {
    throw new Error('Canvas API je nedostupan u ovom okruženju')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function get2dContext(canvas: OffscreenCanvas | HTMLCanvasElement): CanvasRenderingContext2D {
  const settings = { willReadFrequently: true } as CanvasRenderingContext2DSettings
  const ctx = canvas.getContext('2d', settings)
  if (!ctx) {
    throw new Error('2D rendering context je nedostupan u ovom okruženju')
  }
  return ctx as CanvasRenderingContext2D
}

export function getSourceDimensions(source: CanvasSource) {
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { width: source.width, height: source.height }
  }
  const img = source as HTMLImageElement
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  }
}

export async function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    const options: ImageEncodeOptions = { type }
    if (typeof quality === 'number') {
      options.quality = quality
    }
    return await canvas.convertToBlob(options)
  }
  return await new Promise<Blob>((resolve, reject) => {
    const htmlCanvas = canvas as HTMLCanvasElement
    htmlCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Neuspešna konverzija canvas-a u Blob'))
        }
      },
      type,
      quality
    )
  })
}

export function releaseImageSource(source: CanvasSource) {
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    source.close?.()
  }
}

async function loadImageElement(file: Blob, signal?: AbortSignal): Promise<HTMLImageElement> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const objectUrl = URL.createObjectURL(file)

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    let settled = false

    const cleanup = () => {
      if (!settled) {
        settled = true
        if (signalAbortListener) {
          signal?.removeEventListener('abort', signalAbortListener)
        }
        URL.revokeObjectURL(objectUrl)
      }
    }

    const handleAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const signalAbortListener = signal
      ? () => {
          handleAbort()
        }
      : null

    if (signal && signalAbortListener) {
      signal.addEventListener('abort', signalAbortListener, { once: true })
    }

    img.onload = () => {
      cleanup()
      resolve(img)
    }
    img.onerror = () => {
      cleanup()
      reject(new Error('Učitavanje slike nije uspelo'))
    }
    img.decoding = 'async'
    img.src = objectUrl
  })
}
