// lib/ocr.ts
// ⭐ Dynamic import of Tesseract.js to reduce initial bundle size
import type { RecognizeResult } from 'tesseract.js'
import { ocrLogger } from '@/lib/logger'
import {
  canvasToBlob,
  createProcessingCanvas,
  get2dContext,
  getSourceDimensions,
  loadCanvasSource,
  releaseImageSource,
} from './canvasUtils'

/**
 * Lazy load Tesseract.js
 * This reduces the initial bundle size by ~2MB
 */
let tesseractModule: typeof import('tesseract.js') | null = null

async function loadTesseract() {
  if (!tesseractModule) {
    tesseractModule = await import('tesseract.js')
  }
  return tesseractModule
}

export type OCRFieldLabel =
  | 'ukupno'
  | 'pdv'
  | 'datum'
  | 'vreme'
  | 'pib'
  | 'brojRacuna'
  | 'qrLink'
  | 'prodavac'

export type OCRField = {
  label: OCRFieldLabel
  value: string
  confidence: number // 0..1
}

export type OCRResult = {
  rawText: string
  fields: OCRField[]
}

export type OcrOptions = {
  /** Jezički paket, podrazumevano 'srp+eng' */
  languages?: string
  /** Abortuj dug OCR (npr. pri navigaciji) */
  signal?: AbortSignal
  /** Uključi pre-processing slike (preporučeno) */
  enhance?: boolean
  /** DPI hint (Tesseract param), podrazumevano 300 */
  dpi?: number
  /** Timeout u milisekundama, podrazumevano 60000 (60s) */
  timeout?: number
}

const LANGUAGE_DEFAULT = 'srp+eng'

// ──────────────────────────────────────────────────────────────────────────────
// Worker lifecycle (re-use za performanse)
// ──────────────────────────────────────────────────────────────────────────────
type ImageInput =
  | File
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | ImageData
  | string

type OCRWorker = {
  recognize: (image: ImageInput) => Promise<RecognizeResult>
  detect: (image: ImageInput) => Promise<unknown>
  loadLanguage: (lang: string) => Promise<void>
  initialize: (lang: string) => Promise<void>
  setParameters: (params: Record<string, string>) => Promise<void>
  terminate: () => Promise<void>
}

type OrientationPayload = { data?: { orientation?: { angle?: number } } }

let _workerPromise: Promise<OCRWorker> | null = null
let _loadedLang = ''

// ⭐ ADDED: Idle timeout mechanism to free memory when OCR is not used
let _workerIdleTimer: ReturnType<typeof setTimeout> | null = null
const WORKER_IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

async function getWorker(languages: string, dpi: number) {
  // ⭐ ADDED: Cancel idle timer - worker is being used
  if (_workerIdleTimer) {
    clearTimeout(_workerIdleTimer)
    _workerIdleTimer = null
  }

  // ⭐ Load Tesseract.js dynamically on first use
  const Tesseract = await loadTesseract()

  if (!_workerPromise) {
    _workerPromise = (async () => {
      const worker = await Tesseract.createWorker()
      return worker as unknown as OCRWorker
    })()
  }
  const worker = await _workerPromise

  // Učitaj/ini jezike samo prvi put ili kad tražiš drugi paket
  if (_loadedLang !== languages) {
    await worker.loadLanguage(languages)
    await worker.initialize(languages)
    await worker.setParameters({
      // malo agresivnije na blok teksta sa cenama
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
      user_defined_dpi: String(dpi),
    })
    _loadedLang = languages
  }

  return worker
}

// ⭐ ADDED: Schedule worker cleanup after idle period
function scheduleWorkerCleanup() {
  if (_workerIdleTimer) clearTimeout(_workerIdleTimer)

  _workerIdleTimer = setTimeout(async () => {
    if (_workerPromise) {
      const w = await _workerPromise
      await w.terminate()
      _workerPromise = null
      _loadedLang = ''
      ocrLogger.debug('OCR worker terminated due to inactivity')
    }
  }, WORKER_IDLE_TIMEOUT)
}

// ──────────────────────────────────────────────────────────────────────────────
// Javni API
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_OCR_TIMEOUT = 60000 // 60 seconds

export async function runOCR(image: File | Blob, opts: OcrOptions = {}): Promise<OCRResult> {
  const {
    languages = LANGUAGE_DEFAULT,
    signal,
    enhance = true,
    dpi = 300,
    timeout = DEFAULT_OCR_TIMEOUT,
  } = opts

  // ⭐ ADDED: Timeout protection wrapper
  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`OCR timeout after ${ms}ms`)), ms)
      ),
    ])
  }

  const worker = await getWorker(languages, dpi)

  // Pre-processing: skaliranje + grayscale + kontrast + binarizacija + auto-rotate
  let source: Blob = image
  if (enhance) {
    const preprocessOptions: PreprocessOptions = signal ? { signal } : {}
    source = await withTimeout(preprocessImage(image, preprocessOptions), timeout / 2)
  }

  // Auto detect orijentacije (ako je podržano)
  try {
    const det = await worker.detect(source as ImageInput)
    const orientationInfo = (det as OrientationPayload).data?.orientation
    if (orientationInfo && Math.abs(orientationInfo.angle ?? 0) >= 1) {
      source = await rotateBlob(source, orientationInfo.angle ?? 0)
    }
  } catch {
    /* noop – detect nije kritičan */
  }

  // Abort safety
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  // ⭐ ADDED: OCR recognition with timeout protection
  const { data }: RecognizeResult = await withTimeout(
    worker.recognize(source as ImageInput),
    timeout
  )
  const cleanedText = (data.text || '').replace(/\0/g, '').trim()

  const fields = extractHeuristicFields(cleanedText)

  // ⭐ ADDED: Schedule worker cleanup after successful OCR
  scheduleWorkerCleanup()

  return {
    rawText: cleanedText,
    fields,
  }
}

// Bezbedno rušenje workera (npr. pri logoutu / zatvaranju aplikacije)
export async function disposeOcrWorker() {
  if (_workerPromise) {
    const w = await _workerPromise
    await w.terminate()
    _workerPromise = null
    _loadedLang = ''
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Pre-processing (canvas): scale ↑, grayscale, contrast, simple threshold
// ──────────────────────────────────────────────────────────────────────────────
type PreprocessOptions = { signal?: AbortSignal; scaleIfSmall?: number }
async function preprocessImage(file: Blob, { signal, scaleIfSmall = 2 }: PreprocessOptions) {
  const source = await loadCanvasSource(file, signal)
  try {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const { width, height } = getSourceDimensions(source)
    const maxDim = Math.max(width, height)
    const scale = maxDim < 1400 ? scaleIfSmall : 1

    const canvas = createProcessingCanvas(width * scale, height * scale)
    const ctx = get2dContext(canvas)
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = img.data
    const contrast = 1.2
    const brightness = 5
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      let v = 0.2126 * r + 0.7152 * g + 0.0722 * b
      v = (v - 128) * contrast + 128 + brightness
      v = v < 0 ? 0 : v > 255 ? 255 : v
      const thr = 180
      const bin = v > thr ? 255 : 0
      data[i] = data[i + 1] = data[i + 2] = bin
    }
    ctx.putImageData(img, 0, 0)

    return await canvasToBlob(canvas, 'image/png', 0.92)
  } finally {
    releaseImageSource(source)
  }
}

async function rotateBlob(blob: Blob, angleDeg: number) {
  const normalized = ((angleDeg % 360) + 360) % 360
  if (normalized === 0) return blob

  const source = await loadCanvasSource(blob)
  try {
    const { width: w, height: h } = getSourceDimensions(source)
    const rad = (normalized * Math.PI) / 180
    const sin = Math.abs(Math.sin(rad))
    const cos = Math.abs(Math.cos(rad))
    const W = Math.floor(w * cos + h * sin)
    const H = Math.floor(w * sin + h * cos)

    const canvas = createProcessingCanvas(W, H)
    const ctx = get2dContext(canvas)
    ctx.translate(W / 2, H / 2)
    ctx.rotate(rad)
    ctx.drawImage(source, -w / 2, -h / 2)
    return await canvasToBlob(canvas, 'image/png', 0.92)
  } finally {
    releaseImageSource(source)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Heuristike za srpske fiskalne račune
// ──────────────────────────────────────────────────────────────────────────────
function extractHeuristicFields(raw: string): OCRField[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const best = new Map<OCRFieldLabel, OCRField>()
  const addField = (label: OCRFieldLabel, value: string, confidence: number) => {
    const cleaned = value.trim()
    if (!cleaned) return
    const current = best.get(label)
    if (!current || current.confidence < confidence) {
      best.set(label, { label, value: cleaned, confidence })
    }
  }

  const normalizeAmount = (value: string) => {
    const compact = value.replace(/\s/g, '').replace(/[.](?=\d{3}(?:\D|$))/g, '')
    const decimal = compact.replace(',', '.')
    return decimal
  }

  const amountPattern = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})/
  const pibPattern = /\b\d{9}\b/
  const invoicePattern = /(broj\s*racuna|racun\s*br\.?)/i
  const qrPattern = /https?:\/\/\S+/i

  lines.forEach((line, index) => {
    const lower = line.toLowerCase()

    if (/ukupno|total/.test(lower)) {
      const amt = line.match(amountPattern)
      if (amt) {
        addField('ukupno', normalizeAmount(amt[0]), 0.9)
      }
    }

    if (lower.includes('pdv')) {
      const amt = line.match(amountPattern)
      if (amt) {
        const confidence = lower.includes('%') ? 0.8 : 0.7
        addField('pdv', normalizeAmount(amt[0]), confidence)
      }
    }

    const dateMatch = line.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/)
    if (dateMatch) {
      const normalized = dateMatch[0].replace(/\//g, '.').replace(/\.(\d)$/, '.0$1')
      addField('datum', normalized, 0.75)
    }

    const timeMatch = line.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)
    if (timeMatch) {
      const canonical = timeMatch[0].length === 5 ? `${timeMatch[0]}:00` : timeMatch[0]
      addField('vreme', canonical, 0.7)
    }

    if (pibPattern.test(line) || lower.includes('pib')) {
      const pib = line.match(pibPattern)?.[0]
      if (pib) {
        addField('pib', pib, 0.85)
      }
    }

    if (invoicePattern.test(line)) {
      const rawValue = lines[index + 1] ?? line
      const digits = rawValue.replace(/[^0-9/-]/g, '')
      if (digits.length >= 4) {
        addField('brojRacuna', digits, 0.7)
      }
    }

    const link = line.match(qrPattern)?.[0]
    if (link) {
      addField('qrLink', link, link.includes('suf.purs.gov.rs') ? 0.95 : 0.6)
    }
  })

  if (!best.has('prodavac') && lines.length) {
    const merchant = lines[0]
    if (merchant && merchant.length >= 3 && !/^\d/.test(merchant)) {
      addField('prodavac', merchant, 0.5)
    }
  }

  return [...best.values()]
}
