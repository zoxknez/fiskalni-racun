/**
 * Filesystem utilities for Capacitor
 *
 * Provides file operations for mobile platforms
 *
 * @module lib/capacitor/filesystem
 */

import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { logger } from '@/lib/logger'

/**
 * Check if filesystem is available
 */
export function isFilesystemAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Save blob to filesystem
 */
export async function saveFile(
  filename: string,
  blob: Blob,
  directory: Directory = Directory.Documents
): Promise<string | null> {
  if (!isFilesystemAvailable()) {
    logger.warn('Filesystem not available on web')
    return null
  }

  try {
    // Convert blob to base64
    const base64Data = await blobToBase64(blob)

    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory,
    })

    return result.uri
  } catch (error) {
    logger.error('Failed to save file:', error)
    throw error
  }
}

/**
 * Read file from filesystem
 */
export async function readFile(
  path: string,
  directory: Directory = Directory.Documents
): Promise<Blob | null> {
  if (!isFilesystemAvailable()) {
    logger.warn('Filesystem not available on web')
    return null
  }

  try {
    const result = await Filesystem.readFile({
      path,
      directory,
    })

    // Convert base64 back to blob
    return base64ToBlob(result.data as string)
  } catch (error) {
    logger.error('Failed to read file:', error)
    throw error
  }
}

/**
 * Delete file from filesystem
 */
export async function deleteFile(
  path: string,
  directory: Directory = Directory.Documents
): Promise<void> {
  if (!isFilesystemAvailable()) {
    logger.warn('Filesystem not available on web')
    return
  }

  try {
    await Filesystem.deleteFile({
      path,
      directory,
    })
  } catch (error) {
    logger.error('Failed to delete file:', error)
    throw error
  }
}

/**
 * List files in directory
 */
export async function listFiles(
  path: string = '',
  directory: Directory = Directory.Documents
): Promise<string[]> {
  if (!isFilesystemAvailable()) {
    return []
  }

  try {
    const result = await Filesystem.readdir({
      path,
      directory,
    })

    return result.files.map((f) => f.name)
  } catch (error) {
    logger.error('Failed to list files:', error)
    return []
  }
}

/**
 * Get file stats
 */
export async function getFileInfo(path: string, directory: Directory = Directory.Documents) {
  if (!isFilesystemAvailable()) {
    return null
  }

  try {
    const result = await Filesystem.stat({
      path,
      directory,
    })

    return {
      size: result.size,
      ctime: result.ctime,
      mtime: result.mtime,
      uri: result.uri,
      type: result.type,
    }
  } catch (error) {
    logger.error('Failed to get file info:', error)
    return null
  }
}

/**
 * Helper: Convert blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      // Remove data URL prefix if present
      const [, encoded = base64String] = base64String.split(',')
      resolve(encoded)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Helper: Convert base64 to blob
 */
function base64ToBlob(base64: string, type = 'application/octet-stream'): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type })
}
