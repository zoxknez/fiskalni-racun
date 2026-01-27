/**
 * Deal Likes API
 *
 * API route for liking/unliking deals
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './auth-utils.js'
import { sql } from './db.js'

// Helper to get user ID from token
async function getUserIdFromToken(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const mockReq = {
    headers: new Headers({ authorization: authHeader }),
  } as unknown as Request

  return verifyToken(mockReq)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  // Check if already liked
  const existing = await sql`
    SELECT id FROM deal_likes WHERE deal_id = ${dealId} AND user_id = ${userId}
  `

  if (existing.length > 0) {
    return res.status(400).json({ error: 'Already liked' })
  }

  // Add like
  await sql`
    INSERT INTO deal_likes (deal_id, user_id)
    VALUES (${dealId}, ${userId})
  `

  // Update likes count
  await sql`
    UPDATE community_deals 
    SET likes_count = likes_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${dealId}
  `

  // Get updated count
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
  // Check if liked
  const existing = await sql`
    SELECT id FROM deal_likes WHERE deal_id = ${dealId} AND user_id = ${userId}
  `

  if (existing.length === 0) {
    return res.status(400).json({ error: 'Not liked' })
  }

  // Remove like
  await sql`
    DELETE FROM deal_likes WHERE deal_id = ${dealId} AND user_id = ${userId}
  `

  // Update likes count
  await sql`
    UPDATE community_deals 
    SET likes_count = GREATEST(0, likes_count - 1), updated_at = CURRENT_TIMESTAMP
    WHERE id = ${dealId}
  `

  // Get updated count
  const result = await sql`SELECT likes_count FROM community_deals WHERE id = ${dealId}`
  const likesCount = result[0]?.likes_count || 0

  return res.status(200).json({ success: true, likesCount })
}
