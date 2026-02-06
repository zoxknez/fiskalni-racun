import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../db.js'
import { hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers['authorization'] as string | undefined
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token) {
        const tokenHash = await hashToken(token)
        await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[Logout] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
