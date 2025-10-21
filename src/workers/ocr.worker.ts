/**
 * OCR Web Worker
 *
 * Offloads Tesseract.js processing to background thread
 *
 * @module workers/ocr.worker
 */

import { createWorker, type Worker as TesseractWorker } from 'tesseract.js'

let worker: TesseractWorker | null = null

interface OCRMessage {
  type: 'init' | 'recognize' | 'terminate'
  imageData?: string
  lang?: string
}

interface OCRResult {
  text: string
  confidence: number
  words?: Array<{
    text: string
    bbox: { x0: number; y0: number; x1: number; y1: number }
    confidence: number
  }>
}

interface OCRResponse {
  type: 'ready' | 'progress' | 'result' | 'error'
  data?: OCRResult
  progress?: number
  error?: string
}

/**
 * Initialize Tesseract worker
 */
async function initWorker(lang = 'eng+srp') {
  if (worker) return

  try {
    worker = await createWorker(lang, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          self.postMessage({
            type: 'progress',
            progress: m.progress,
          } as OCRResponse)
        }
      },
    })

    self.postMessage({ type: 'ready' } as OCRResponse)
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as OCRResponse)
  }
}

/**
 * Recognize text from image
 */
async function recognizeText(imageData: string) {
  if (!worker) {
    await initWorker()
  }

  if (!worker) {
    throw new Error('Worker not initialized')
  }

  try {
    const result = await worker.recognize(imageData)
    const text = result.data.text
    const confidence = result.data.confidence

    const ocrResult: OCRResult = {
      text,
      confidence,
    }

    self.postMessage({
      type: 'result',
      data: ocrResult,
    } as OCRResponse)
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as OCRResponse)
  }
}

/**
 * Terminate worker
 */
async function terminateWorker() {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}

// Message handler
self.onmessage = async (e: MessageEvent<OCRMessage>) => {
  const { type, imageData, lang } = e.data

  switch (type) {
    case 'init':
      await initWorker(lang)
      break

    case 'recognize':
      if (imageData) {
        await recognizeText(imageData)
      }
      break

    case 'terminate':
      await terminateWorker()
      break
  }
}
