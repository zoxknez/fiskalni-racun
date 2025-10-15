/**
 * Modern Data Compression for IndexedDB
 *
 * Compresses data before storing in IndexedDB
 * Uses native Compression Streams API (Chrome 80+)
 * Fallback to JSON stringify for older browsers
 *
 * Benefits:
 * - 70-90% storage reduction
 * - Faster network sync (less data)
 * - More room for receipts/images
 */

import { logger } from './logger'

/**
 * Check if Compression Streams API is supported
 */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

/**
 * Compress data using Compression Streams API
 */
export async function compress<T>(data: T): Promise<Blob> {
  const json = JSON.stringify(data)

  if (!isCompressionSupported()) {
    // Fallback: just convert to blob
    return new Blob([json], { type: 'application/json' })
  }

  try {
    const blob = new Blob([json])
    const stream = blob.stream()
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
    const compressedBlob = await new Response(compressedStream).blob()

    logger.debug('Data compressed:', {
      original: blob.size,
      compressed: compressedBlob.size,
      ratio: `${Math.round((compressedBlob.size / blob.size) * 100)}%`,
    })

    return compressedBlob
  } catch (error) {
    logger.error('Compression failed, using uncompressed:', error)
    return new Blob([json], { type: 'application/json' })
  }
}

/**
 * Decompress data
 */
export async function decompress<T>(blob: Blob): Promise<T> {
  if (!isCompressionSupported() || blob.type === 'application/json') {
    // Uncompressed data
    const text = await blob.text()
    return JSON.parse(text)
  }

  try {
    const stream = blob.stream()
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
    const text = await new Response(decompressedStream).text()
    return JSON.parse(text)
  } catch (error) {
    logger.error('Decompression failed:', error)
    // Try as uncompressed
    const text = await blob.text()
    return JSON.parse(text)
  }
}

/**
 * Compress array buffer (for images)
 */
export async function compressBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (!isCompressionSupported()) {
    return buffer
  }

  try {
    const blob = new Blob([buffer])
    const stream = blob.stream()
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
    const compressedBlob = await new Response(compressedStream).blob()
    return await compressedBlob.arrayBuffer()
  } catch (error) {
    logger.error('Buffer compression failed:', error)
    return buffer
  }
}

/**
 * Decompress array buffer
 */
export async function decompressBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (!isCompressionSupported()) {
    return buffer
  }

  try {
    const blob = new Blob([buffer])
    const stream = blob.stream()
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
    const decompressedBlob = await new Response(decompressedStream).blob()
    return await decompressedBlob.arrayBuffer()
  } catch (error) {
    logger.error('Buffer decompression failed:', error)
    return buffer
  }
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0
  return Math.round(((original - compressed) / original) * 100)
}

// Example usage:
/*
// Compress before storing in IndexedDB
const receipt = { merchantName: 'Market', amount: 1000, ... }
const compressed = await compress(receipt)
await db.receipts.add({ ...receipt, compressedData: compressed })

// Decompress when reading
const stored = await db.receipts.get(id)
if (stored.compressedData) {
  const receipt = await decompress(stored.compressedData)
}

// For images
const imageBuffer = await file.arrayBuffer()
const compressed = await compressBuffer(imageBuffer)
// Store compressed buffer in IndexedDB
*/
