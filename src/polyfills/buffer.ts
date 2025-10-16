// @ts-nocheck

const TEXT_DECODER = new TextDecoder()
const TEXT_ENCODER = new TextEncoder()

type SupportedEncoding = 'utf8' | 'utf-8' | 'hex' | 'base64'

function normalizeEncoding(encoding?: string): SupportedEncoding {
  const normalized = encoding?.toLowerCase()
  if (normalized === 'utf8' || normalized === 'utf-8' || normalized === undefined) {
    return (normalized ?? 'utf8') as SupportedEncoding
  }
  if (normalized === 'hex' || normalized === 'base64') {
    return normalized
  }
  throw new TypeError(`Unsupported encoding: ${encoding}`)
}

function encodeString(value: string, encoding: SupportedEncoding): Uint8Array {
  switch (encoding) {
    case 'hex': {
      const sanitized = value.trim()
      if (sanitized.length % 2 !== 0) {
        throw new TypeError('Invalid hex string length')
      }
      const result = new Uint8Array(sanitized.length / 2)
      for (let i = 0; i < sanitized.length; i += 2) {
        result[i / 2] = Number.parseInt(sanitized.slice(i, i + 2), 16)
      }
      return result
    }
    case 'base64': {
      const binary = atob(value)
      const result = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        result[i] = binary.charCodeAt(i)
      }
      return result
    }
    case 'utf-8':
    case 'utf8':
    default:
      return TEXT_ENCODER.encode(value)
  }
}

function decodeBuffer(buffer: Uint8Array, encoding: SupportedEncoding): string {
  switch (encoding) {
    case 'hex':
      return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('')
    case 'base64': {
      let binary = ''
      buffer.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      return btoa(binary)
    }
    case 'utf8':
    case 'utf-8':
    default:
      return TEXT_DECODER.decode(buffer)
  }
}

function isArrayBufferLike(value: unknown): value is ArrayBufferLike {
  return (
    value instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer)
  )
}

class BrowserBuffer extends Uint8Array {
  constructor(input: number | ArrayBufferLike | ArrayLike<number>, byteOffset?: number, length?: number) {
    if (typeof input === 'number') {
      super(input)
      return
    }

    if (isArrayBufferLike(input)) {
      if (typeof byteOffset === 'number' || typeof length === 'number') {
        super(input, byteOffset, length)
      } else {
        super(input)
      }
      return
    }

    if (ArrayBuffer.isView(input)) {
      super(input.buffer, input.byteOffset, input.byteLength)
      return
    }

    super(Array.from(input as ArrayLike<number>))
  }

  static override get [Symbol.species]() {
    return BrowserBuffer
  }

  static from(
    value: string | ArrayBufferLike | ArrayLike<number>,
    encodingOrOffset?: string | number,
    length?: number
  ): BrowserBuffer {
    if (typeof value === 'string') {
      const encoding = normalizeEncoding(typeof encodingOrOffset === 'string' ? encodingOrOffset : undefined)
      const bytes = encodeString(value, encoding)
      return new BrowserBuffer(bytes)
    }

    if (isArrayBufferLike(value)) {
      const offset = typeof encodingOrOffset === 'number' ? encodingOrOffset : 0
      const viewLength = typeof length === 'number' ? length : value.byteLength - offset
      return new BrowserBuffer(value, offset, viewLength)
    }

    if (ArrayBuffer.isView(value)) {
      return new BrowserBuffer(value.buffer, value.byteOffset, value.byteLength)
    }

    return new BrowserBuffer(value)
  }

  static alloc(size: number, fill?: number | string, encoding?: string): BrowserBuffer {
    const buffer = new BrowserBuffer(size)

    if (fill === undefined) {
      buffer.fill(0)
      return buffer
    }

    if (typeof fill === 'number') {
      buffer.fill(fill & 0xff)
      return buffer
    }

    const pattern = BrowserBuffer.from(fill, encoding)
    for (let i = 0; i < buffer.length; i += pattern.length) {
      buffer.set(pattern.subarray(0, Math.min(pattern.length, buffer.length - i)), i)
    }
    return buffer
  }

  static concat(list: ArrayLike<ArrayBufferView | ArrayBuffer>, totalLength?: number): BrowserBuffer {
    const buffers = Array.from(list, (item) => BrowserBuffer.from(item as ArrayBufferView | ArrayBuffer))
    const length = totalLength ?? buffers.reduce((sum, current) => sum + current.length, 0)
    const result = new BrowserBuffer(length)
    let offset = 0

    for (const buffer of buffers) {
      result.set(buffer, offset)
      offset += buffer.length
    }

    return result
  }

  static isBuffer(value: unknown): value is BrowserBuffer {
    return value instanceof BrowserBuffer
  }

  toString(encoding?: string): string {
    const normalized = normalizeEncoding(encoding)
    return decodeBuffer(this, normalized)
  }
}

if (typeof (globalThis as { Buffer?: typeof BrowserBuffer }).Buffer === 'undefined') {
  Object.defineProperty(BrowserBuffer.prototype, Symbol.toStringTag, {
    value: 'Buffer',
    configurable: true,
  })

  ;(globalThis as { Buffer?: typeof BrowserBuffer }).Buffer = BrowserBuffer
}

export {}
