/**
 * Vercel Blob Upload API
 *
 * Handles file uploads to Vercel Blob storage
 *
 * @module api/upload
 */

import { del, list, put } from '@vercel/blob'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

async function handleUpload(req: Request): Promise<Response> {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get folder from query params (optional)
    const url = new URL(req.url, 'https://localhost')
    const folder = url.searchParams.get('folder') || 'uploads'

    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    const result: UploadResult = {
      success: true,
      url: blob.url,
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function handleDelete(req: Request): Promise<Response> {
  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'No URL provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await del(url)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Delete error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function handleList(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url, 'https://localhost')
    const prefix = url.searchParams.get('prefix') || undefined
    const limit = Number.parseInt(url.searchParams.get('limit') || '100', 10)

    const blobs = await list({ prefix, limit })

    return new Response(
      JSON.stringify({
        success: true,
        blobs: blobs.blobs.map((b) => ({
          url: b.url,
          pathname: b.pathname,
          size: b.size,
          uploadedAt: b.uploadedAt,
        })),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('List error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'List failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export default async function handler(req: Request): Promise<Response> {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  let response: Response

  switch (req.method) {
    case 'POST':
      response = await handleUpload(req)
      break
    case 'DELETE':
      response = await handleDelete(req)
      break
    case 'GET':
      response = await handleList(req)
      break
    default:
      response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
  }

  // Add CORS headers to response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}
