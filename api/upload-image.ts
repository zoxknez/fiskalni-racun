import { del, put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './auth-utils'

/**
 * API endpoint for uploading receipt images to Vercel Blob
 *
 * POST /api/upload-image - Upload a new image
 * DELETE /api/upload-image?url=... - Delete an image
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Verify authentication using session token
  const userId = await verifyToken(req as unknown as Request)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (req.method === 'POST') {
      // Handle image upload
      const contentType = req.headers['content-type'] || ''

      if (!contentType.startsWith('image/')) {
        return res.status(400).json({
          error: 'Invalid content type. Expected image/*',
          hint: 'Send the raw image bytes with Content-Type: image/jpeg, image/png, or image/webp',
        })
      }

      // Get the image data from request body
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
      }
      const imageBuffer = Buffer.concat(chunks)

      // Determine file extension from content type
      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg'

      const filename = `receipt_${userId}_${Date.now()}.${ext}`
      const mimeType = contentType.split(';')[0] || 'image/jpeg'

      // Validate image size (max 10MB)
      const maxSize = 10 * 1024 * 1024
      if (imageBuffer.length > maxSize) {
        return res.status(400).json({ error: 'Image too large. Maximum size is 10MB' })
      }

      // Validate minimum size (at least 1KB - likely not a real image otherwise)
      if (imageBuffer.length < 1024) {
        return res.status(400).json({ error: 'Image too small. Minimum size is 1KB' })
      }

      // Upload to Vercel Blob
      const blob = await put(`receipts/${userId}/${filename}`, imageBuffer, {
        access: 'public',
        contentType: mimeType,
        addRandomSuffix: false,
      })

      return res.status(200).json({
        success: true,
        url: blob.url,
        filename: filename,
        size: imageBuffer.length,
      })
    } else if (req.method === 'DELETE') {
      // Handle image deletion
      const { url } = req.query

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing url parameter' })
      }

      // Verify the URL belongs to this user's receipts
      if (!url.includes(`receipts/${userId}/`)) {
        return res.status(403).json({ error: 'Cannot delete images that do not belong to you' })
      }

      await del(url)

      return res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
      })
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({
      error: 'Failed to process image',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
