/**
 * Deal Likes API
 *
 * API route for liking/unliking deals
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './db.js'
import { verifyTokenFromHeader } from './lib/auth.js'
import { applyCors } from './lib/cors.js'

// Helper to get user ID from token
async function getUserIdFromToken(req: VercelRequest): Promise<string | null> {
  return verifyTokenFromHeader(req.headers.authorization)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cors = applyCors(req, res, { methods: 'POST, DELETE, OPTIONS' })
  if (!cors.allowed) return

  try {
    const userId = await getUserIdFromToken(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { dealId } = req.query

    if (!dealId || typeof dealId !== 'string') {
      return res.status(400).json({ error: 'Deal ID is required' })
    }

    switch (req.method) {
      case 'POST':
        return likeDeal(req, res, dealId, userId)
      case 'DELETE':
        return unlikeDeal(req, res, dealId, userId)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Deal likes API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function likeDeal(_req: VercelRequest, res: VercelResponse, dealId: string, userId: string) {
  // Use ON CONFLICT to atomically insert (avoids race conditions)
  const inserted = await sql`
    INSERT INTO deal_likes (deal_id, user_id)
    VALUES (${dealId}, ${userId})
    ON CONFLICT (deal_id, user_id) DO NOTHING
    RETURNING id
  `

  if (inserted.length === 0) {
    return res.status(400).json({ error: 'Already liked' })
  }

  // Update likes count atomically using subquery
  await sql`
    UPDATE community_deals 
    SET likes_count = (SELECT COUNT(*) FROM deal_likes WHERE deal_id = ${dealId}),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${dealId}
  `

  const result = await sql`SELECT likes_count FROM community_deals WHERE id = ${dealId}`
  const likesCount = result[0]?.likes_count || 0

  return res.status(200).json({ success: true, likesCount })
}

async function unlikeDeal(
  _req: VercelRequest,
  res: VercelResponse,
  dealId: string,
  userId: string
) {
  // Atomically delete and check if it existed
  const deleted = await sql`
    DELETE FROM deal_likes 
    WHERE deal_id = ${dealId} AND user_id = ${userId}
    RETURNING id
  `

  if (deleted.length === 0) {
    return res.status(400).json({ error: 'Not liked' })
  }

  // Update likes count atomically using subquery
  await sql`
    UPDATE community_deals 
    SET likes_count = (SELECT COUNT(*) FROM deal_likes WHERE deal_id = ${dealId}),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${dealId}
  `

  const result = await sql`SELECT likes_count FROM community_deals WHERE id = ${dealId}`
  const likesCount = result[0]?.likes_count || 0

  return res.status(200).json({ success: true, likesCount })
}
