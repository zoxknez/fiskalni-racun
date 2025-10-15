// lib/qr-scanner.ts
import {
  BrowserQRCodeReader,
  ChecksumException,
  FormatException,
  NotFoundException,
  type Result,
} from '@zxing/library'
import type { DecodeContinuouslyCallback } from '@zxing/library/esm/browser/DecodeContinuouslyCallback'

export type QRScanResult = {
  rawText: string
  timestamp: number
  format?: string
}

export type QRScanError = {
  code:
    | 'insecure-context'
    | 'no-media-devices'
    | 'not-allowed'
    | 'not-readable'
    | 'overconstrained'
    | 'abort'
    | 'other'
  message: string
  retryable: boolean
}

export type QRScannerStatus = 'idle' | 'initializing' | 'ready' | 'scanning' | 'stopped' | 'error'

export interface QRScannerConfig {
  /** Id konkretne kamere; ako nije zadat, biraće 'environment' kad može */
  deviceId?: string
  /** facingMode hint (user | environment) ako deviceId nije poznat */
  facingMode?: 'user' | 'environment'
  /** Dodatna media constraints (npr. { focusMode: "continuous" } u nekim browserima) */
  constraints?: MediaTrackConstraints
  /** Minimalni razmak između dva identična rezultata (ms) – dedupe */
  dedupeWindowMs?: number
  /** Validator rezultata (npr. propusti samo e-račun linkove) */
  validator?: (text: string) => boolean
}

export class QRScannerService {
  private reader: BrowserQRCodeReader | null = null
  private video: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private status: QRScannerStatus = 'idle'
  private lastText?: string
  private lastAt = 0
  private currentDeviceId?: string
  private config: QRScannerConfig & {
    dedupeWindowMs: number
    validator: (text: string) => boolean
  } = {
    facingMode: 'environment',
    constraints: {},
    dedupeWindowMs: 1000,
    validator: () => true,
  }

  getStatus() {
    return this.status
  }

  async listVideoDevices() {
    const devices = await navigator.mediaDevices?.enumerateDevices?.()
    return (devices ?? []).filter((d) => d.kind === 'videoinput')
  }

  async initialize(videoElement: HTMLVideoElement, cfg: QRScannerConfig = {}) {
    this.ensureSecureAndAPIs()
    this.status = 'initializing'
    this.video = videoElement
    this.config = { ...this.config, ...cfg }

    // Re-use ZXing reader
    if (!this.reader) this.reader = new BrowserQRCodeReader()

    // Stop everything if already running
    await this.stop()

    // Decide camera
    const deviceId = this.config.deviceId ?? (await this.pickDeviceId(this.config.facingMode))
    this.currentDeviceId = deviceId

    // Start stream manually to have track reference (torch, etc.)
    const trackConstraints: MediaTrackConstraints = {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: this.config.facingMode }),
      ...(this.config.constraints || {}),
    }
    const constraints: MediaStreamConstraints = { video: trackConstraints, audio: false }

    this.stream = await navigator.mediaDevices.getUserMedia(constraints)
    this.attachToVideo(this.stream)

    this.status = 'ready'
  }

  /** Jednokratno skeniranje (za modale/forme) */
  async scanOnce(): Promise<QRScanResult> {
    if (!this.reader || !this.video) throw new Error('QR reader nije inicijalizovan')
    this.status = 'scanning'
    try {
      const res = await this.reader.decodeOnceFromVideoDevice(
        this.currentDeviceId ?? undefined,
        this.video
      )
      const result = this.toResult(res)
      if (!this.config.validator(result.rawText)) {
        throw this.mapError(new Error('Nevalidan QR sadržaj (validator)'))
      }
      this.status = 'ready'
      this.memo(result.rawText)
      return result
    } catch (err: unknown) {
      const mapped = this.mapError(err)
      this.status = mapped.retryable ? 'ready' : 'error'
      throw mapped
    }
  }

  /**
   * Kontinuirano skeniranje: poziva `onResult` kad god dobije NOV rezultat
   * (debounced/dedupe u prozoru `dedupeWindowMs`). Greške su „meke“.
   */
  startContinuous(onResult: (res: QRScanResult) => void, onError?: (err: QRScanError) => void) {
    if (!this.reader || !this.video) throw new Error('QR reader nije inicijalizovan')
    this.status = 'scanning'

    // ZXing kontroler (omogućava .stop())
    const callback = ((result, error) => {
      if (result) {
        const out = this.toResult(result)
        if (!this.config.validator(out.rawText)) return
        if (!this.isDuplicate(out.rawText)) {
          this.memo(out.rawText)
          onResult(out)
        }
        return
      }
      if (error && !(error instanceof NotFoundException)) {
        onError?.(this.mapError(error))
      }
    }) as (result: Result | null, error?: unknown) => unknown

    const continuousCallback = callback as unknown as DecodeContinuouslyCallback

    this.reader
      .decodeFromVideoDevice(this.currentDeviceId ?? null, this.video, continuousCallback)
      .catch((error) => {
        const mapped = this.mapError(error)
        this.status = mapped.retryable ? 'ready' : 'error'
        onError?.(mapped)
      })
  }

  /** Zaustavi decoding, ali zadrži stream i video (status: ready) */
  pauseDecoding() {
    this.reader?.reset()
    if (this.video) this.video.pause()
    this.status = 'ready'
  }

  /** Potpuno zaustavljanje: decoding + media stream + video */
  stop() {
    this.reader?.reset()
    this.stopStream()
    this.status = 'stopped'
  }

  /** Uništi sve (uključujući reader instance) */
  async teardown() {
    await this.stop()
    this.reader = null
    this.video = null
    this.lastText = undefined
    this.lastAt = 0
    this.currentDeviceId = undefined
  }

  /** Uključi/isključi blic (torch) ako kamera podržava */
  async setTorch(on: boolean) {
    const track = this.getTrack()
    const caps = track?.getCapabilities?.()
    const torchSupported =
      caps && typeof caps === 'object' && 'torch' in caps
        ? Boolean((caps as { torch?: boolean }).torch)
        : false
    if (track && torchSupported) {
      const torchConstraint = { advanced: [{ torch: on }] } as unknown as MediaTrackConstraints
      await track.applyConstraints(torchConstraint)
      return true
    }
    return false
  }

  /** Trenutni MediaStreamTrack (video) */
  private getTrack(): MediaStreamTrack | undefined {
    return this.stream?.getVideoTracks?.()[0]
  }

  private stopStream() {
    if (this.video) {
      this.video.srcObject = null
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop()
      this.stream = null
    }
  }

  private attachToVideo(stream: MediaStream) {
    const videoElement = this.video
    if (!videoElement) {
      throw new Error('Video element is not available for QR scanning')
    }
    videoElement.srcObject = stream
    videoElement.playsInline = true // iOS Safari
    videoElement.muted = true
    // Autoplay hint; ignorisaće ako policy ne dozvoli
    const playPromise = videoElement.play()
    if (playPromise) {
      playPromise.catch(() => {})
    }
  }

  private async pickDeviceId(prefer: 'user' | 'environment' = 'environment') {
    const list = await this.listVideoDevices()
    if (!list.length) return undefined
    // Prefer rear camera by label when available
    const rear = list.find((d) => /back|rear|environment/i.test(d.label))
    if (prefer === 'environment' && rear) return rear.deviceId
    // Fallback: prva kamera
    return list[0].deviceId
  }

  private toResult(res: Result): QRScanResult {
    return {
      rawText: res.getText(),
      timestamp: Date.now(),
      format: (() => {
        const format = res.getBarcodeFormat?.()
        return format ? String(format) : 'QR_CODE'
      })(),
    }
  }

  private memo(text: string) {
    this.lastText = text
    this.lastAt = Date.now()
  }

  private isDuplicate(text: string) {
    const now = Date.now()
    return text === this.lastText && now - this.lastAt < this.config.dedupeWindowMs
  }

  private ensureSecureAndAPIs() {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw this.mapError({ name: 'InsecureContextError', message: 'Potreban je HTTPS kontekst' })
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw this.mapError({ name: 'NoMediaDevices', message: 'Kamera nije dostupna' })
    }
  }

  private mapError(err: unknown): QRScanError {
    // Browser getUserMedia errors
    const error = err as { name?: string; message?: string }
    const name = error?.name ?? ''
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return { code: 'not-allowed', message: 'Pristup kameri odbijen.', retryable: true }
    }
    if (name === 'NotReadableError') {
      return {
        code: 'not-readable',
        message: 'Kamera je zauzeta ili nedostupna.',
        retryable: true,
      }
    }
    if (name === 'OverconstrainedError') {
      return {
        code: 'overconstrained',
        message: 'Traženi parametri kamere nisu podržani.',
        retryable: true,
      }
    }
    if (name === 'AbortError') {
      return { code: 'abort', message: 'Operacija prekinuta.', retryable: true }
    }
    if (name === 'InsecureContextError') {
      return { code: 'insecure-context', message: 'Potreban je HTTPS kontekst.', retryable: false }
    }
    if (name === 'NoMediaDevices') {
      return { code: 'no-media-devices', message: 'Kamera nije dostupna.', retryable: false }
    }

    // ZXing decode errors (kontinuirano skeniranje ih uglavnom ignoriše)
    if (err instanceof NotFoundException) {
      return { code: 'other', message: 'Nema QR koda u kadru.', retryable: true }
    }
    if (err instanceof ChecksumException || err instanceof FormatException) {
      return { code: 'other', message: 'Neispravan QR kod.', retryable: true }
    }

    return {
      code: 'other',
      message: error?.message || 'Nepoznata greška',
      retryable: true,
    }
  }
}

/** Predefinisani validator: e-račun/verifikacija fiskalnog (često purs.gov.rs) */
export function isLikelyERacun(text: string) {
  return /https?:\/\/[^\s]*purs\.gov\.rs\/?/i.test(text) || /e-?račun|e-?racun/i.test(text)
}

export const qrScanner = new QRScannerService()
