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

interface OCRResponse {
  type: 'ready' | 'progress' | 'result' | 'error'
  data?: any
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
    const {
      data: { text },
    } = await worker.recognize(imageData)

    self.postMessage({
      type: 'result',
      data: text,
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
