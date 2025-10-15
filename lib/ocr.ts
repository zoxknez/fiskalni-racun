// lib/ocr.ts
import Tesseract, { type RecognizeResult } from 'tesseract.js'

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

async function getWorker(languages: string, dpi: number) {
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

// ──────────────────────────────────────────────────────────────────────────────
// Javni API
// ──────────────────────────────────────────────────────────────────────────────
export async function runOCR(image: File | Blob, opts: OcrOptions = {}): Promise<OCRResult> {
  const { languages = LANGUAGE_DEFAULT, signal, enhance = true, dpi = 300 } = opts

  const worker = await getWorker(languages, dpi)

  // Pre-processing: skaliranje + grayscale + kontrast + binarizacija + auto-rotate
  let source: Blob = image
  if (enhance) {
    source = await preprocessImage(image, { signal })
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

  const { data }: RecognizeResult = await worker.recognize(source as ImageInput)
  const cleanedText = (data.text || '').replace(/\u0000/g, '').trim()

  const fields = extractHeuristicFields(cleanedText)

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
  const bmp = await createImageBitmap(file)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  // Skaliraj male slike radi preciznosti OCR (do ~2x)
  const maxDim = Math.max(bmp.width, bmp.height)
  const scale = maxDim < 1400 ? scaleIfSmall : 1

  const canvas = new OffscreenCanvas(bmp.width * scale, bmp.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = img.data
  // Grayscale + kontrast + binarizacija (jednostavna prag vrednost)
  // Kontrast ~ 1.2, brightness ~ 5
  const contrast = 1.2
  const brightness = 5
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2]
    // luminance
    let v = 0.2126 * r + 0.7152 * g + 0.0722 * b
    // contrast + brightness
    v = (v - 128) * contrast + 128 + brightness
    // clamp
    v = v < 0 ? 0 : v > 255 ? 255 : v
    // threshold (adaptive light)
    const thr = 180
    const bin = v > thr ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = bin
  }
  ctx.putImageData(img, 0, 0)

  const blob = await canvas.convertToBlob({ type: 'image/png', quality: 0.92 })
  return blob
}

async function rotateBlob(blob: Blob, angleDeg: number) {
  const bmp = await createImageBitmap(blob)
  const angle = ((angleDeg % 360) + 360) % 360
  const rad = (angle * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const w = bmp.width
  const h = bmp.height
  const W = Math.floor(w * cos + h * sin)
  const H = Math.floor(w * sin + h * cos)

  const canvas = new OffscreenCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  ctx.translate(W / 2, H / 2)
  ctx.rotate(rad)
  ctx.drawImage(bmp, -w / 2, -h / 2)
  const out = await canvas.convertToBlob({ type: 'image/png', quality: 0.92 })
  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// Heuristike za srpske fiskalne račune
// ──────────────────────────────────────────────────────────────────────────────
function extractHeuristicFields(raw: string): OCRField[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const fields: OCRField[] = []
  const push = (label: OCRFieldLabel, value: string, confidence: number) => {
    fields.push({ label, value, confidence })
  }

  // Prebaci ceo tekst u „flat“ za lakše pretrage
  const flat = lines.join(' \n ')

  // 1) URL/QR link ka e-računu (često sadrži purs.gov.rs)
  const urlRx = /\bhttps?:\/\/[^\s)]+(?:purs\.gov\.rs|suf\.purs|efaktura|e-račun|e-racun)[^\s)]+/gi
  const url = flat.match(urlRx)?.[0]
  if (url) push('qrLink', sanitizeUrl(url), 0.95)

  // 2) PIB (9 cifara)
  const pibLine = lines.find((l) => /pib/i.test(l))
  const pibMatch = (pibLine || flat).match(/\b\d{9}\b/)
  if (pibMatch) push('pib', pibMatch[0], 0.9)

  // 3) Datum (dd.mm.yyyy ili varijacije), Vreme (HH:MM(:SS)?)
  const dateMatch = flat.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/i)
  if (dateMatch) {
    const iso = normalizeDate(dateMatch[1])
    push('datum', iso ?? dateMatch[1], iso ? 0.9 : 0.6)
  }
  const timeMatch = flat.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/)
  if (timeMatch) push('vreme', timeMatch[0], 0.85)

  // 4) Ukupno (preferira linije sa „ukupno“/„za naplatu“/„SUMA“)
  let bestAmount: { val: string; score: number } | null = null
  for (const line of lines) {
    const amount = findAmount(line)
    if (!amount) continue
    const weight = /ukupno|za naplatu|suma|total/i.test(line) ? 1.0 : 0.6
    if (!bestAmount || weight > bestAmount.score) {
      bestAmount = { val: amount, score: weight }
    }
  }
  if (bestAmount) push('ukupno', bestAmount.val, 0.9 * bestAmount.score)

  // 5) PDV (ako postoji zasebno)
  const pdvLine = lines.find((l) => /pdv|porez/i.test(l))
  const pdvAmt = pdvLine ? findAmount(pdvLine) : null
  if (pdvAmt) push('pdv', pdvAmt, 0.8)

  // 6) Broj računa / referenca
  const brojLine =
    lines.find((l) => /broj\s*(fiskalnog)?\s*računa|broj racuna|br\.\s*računa/i.test(l)) ||
    lines.find((l) => /broj\s*rač\w+/i.test(l))
  const brojMatch =
    brojLine?.match(/\b[\w/-]{6,}\b/) /* opšti token */ ||
    flat.match(/\bJIR[:\s-]*([A-Z0-9-]{8,})\b/i)
  if (brojMatch) push('brojRacuna', (brojMatch[1] ?? brojMatch[0]).trim(), 0.7)

  // 7) Merchant name (prva „zdrava“ linija bez ključnih reči/cena)
  const merchant = guessMerchant(lines)
  if (merchant) push('prodavac', merchant, 0.7)

  return dedupeFields(fields)
}

// Traži iznos sa RSD formatima (1.234,56 | 1234.56 | 1 234,56 …)
function findAmount(line: string): string | null {
  const rx = /(?<!\w)(\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})(?!\w)/ // amount
  const m = line.match(rx)
  if (!m) return null
  const raw = m[1]
  return normalizeAmount(raw)
}

function normalizeAmount(raw: string): string {
  // Ukloni thousand sep, zameni decimalni zarez u tačku
  let s = raw.replace(/\s/g, '')
  // Ako ima i '.' i ',' – pretpostavi da je '.' thousands, ',' decimals
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/,\d{2}$/.test(s)) {
    // decimalni zarez
    s = s.replace(',', '.')
  } else {
    // decimalna tačka već ok; ukloni tačke za hiljade (npr. "1.234")
    const parts = s.split('.')
    if (parts.length > 2) s = parts.join('')
  }
  return s
}

function sanitizeUrl(u: string) {
  return u.replace(/[)\]]+$/, '')
}

function normalizeDate(d: string): string | null {
  // Podrži dd.mm.yyyy, dd/mm/yy, 1.2.24...
  const m = d.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/)
  if (!m) return null
  const day = Number(m[1])
  const mon = Number(m[2])
  let year = Number(m[3])
  if (year < 100) year += year >= 70 ? 1900 : 2000
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null
  const iso = new Date(Date.UTC(year, mon - 1, day)).toISOString().slice(0, 10)
  return iso
}

function guessMerchant(lines: string): string | null
function guessMerchant(lines: string[]): string | null
function guessMerchant(arg: string | string[]): string | null {
  const arr = Array.isArray(arg) ? arg : arg.split(/\r?\n/)
  const bad = /(pib|mb|tel|račun|racun|ukupno|suma|pdv|din|rsd|stavke|kasa|slip|fiskalni|broj)/i
  for (let i = 0; i < Math.min(8, arr.length); i++) {
    const ln = arr[i].trim()
    if (!ln) continue
    if (bad.test(ln)) continue
    if (/\d{2,}/.test(ln)) continue // linije prepune cifara (verovatno adresa/PIB)
    // Preferiraj UPPER/Title case
    if (/[A-Za-zČĆŽŠĐčćžšđ]/.test(ln)) {
      return ln.replace(/\s{2,}/g, ' ')
    }
  }
  return null
}

function dedupeFields(fields: OCRField[]): OCRField[] {
  const best = new Map<OCRFieldLabel, OCRField>()
  for (const f of fields) {
    const e = best.get(f.label)
    if (!e || e.confidence < f.confidence) best.set(f.label, f)
  }
  return [...best.values()]
}
