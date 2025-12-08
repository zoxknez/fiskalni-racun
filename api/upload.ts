import { del } from '@vercel/blob'
import { type HandleUploadBody, handleUpload } from '@vercel/blob/client'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  runtime: 'nodejs',
}

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight if needed (though usually handled by Vercel config)
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'POST') {
    try {
      const body = req.body as HandleUploadBody

      // Client upload handshake
      if (
        body &&
        (body.type === 'blob.generate-client-token' || body.type === 'blob.upload-completed')
      ) {
        const jsonResponse = await handleUpload({
          body,
          request: req,
          onBeforeGenerateToken: async () => {
            return {
              allowedContentTypes: ALLOWED_TYPES,
              tokenPayload: JSON.stringify({
                uploadedAt: new Date().toISOString(),
              }),
            }
          },
          onUploadCompleted: async ({ blob }) => {
            console.log('Blob uploaded:', blob.url)
          },
        })

        return res.status(200).json(jsonResponse)
      }

      return res.status(400).json({ error: 'Invalid request type. Expected blob.upload-token.' })
    } catch (error) {
      console.error('Upload error:', error)
      return res.status(400).json({ error: (error as Error).message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { url } = req.body as { url?: string }
      if (!url) {
        return res.status(400).json({ error: 'URL is required' })
      }

      await del(url)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Delete error:', error)
      return res.status(500).json({ error: 'Delete failed' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
