/**
 * Deal Comment Like API
 *
 * Toggle like on a deal comment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './auth-utils'
import { sql } from './db'

async function getUserId(req: VercelRequest): Promise<string | null> {
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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { commentId } = req.query

  if (!commentId) {
    return res.status(400).json({ error: 'Comment ID is required' })
  }

  try {
    // Verify comment exists
    const comment = await sql`SELECT id FROM deal_comments WHERE id = ${commentId as string}`
    if (comment.length === 0) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    if (req.method === 'POST') {
      // Like comment
      await sql`
        INSERT INTO deal_comment_likes (comment_id, user_id)
        VALUES (${commentId as string}, ${userId})
        ON CONFLICT (comment_id, user_id) DO NOTHING
      `

      // Update likes count
      await sql`
        UPDATE deal_comments 
        SET likes_count = (SELECT COUNT(*) FROM deal_comment_likes WHERE comment_id = ${commentId as string})
        WHERE id = ${commentId as string}
      `

      const updated =
        await sql`SELECT likes_count FROM deal_comments WHERE id = ${commentId as string}`
      return res.status(200).json({ success: true, likesCount: updated[0].likes_count })
    }

    if (req.method === 'DELETE') {
      // Unlike comment
      await sql`
        DELETE FROM deal_comment_likes 
        WHERE comment_id = ${commentId as string} AND user_id = ${userId}
      `

      // Update likes count
      await sql`
        UPDATE deal_comments 
        SET likes_count = (SELECT COUNT(*) FROM deal_comment_likes WHERE comment_id = ${commentId as string})
        WHERE id = ${commentId as string}
      `

      const updated =
        await sql`SELECT likes_count FROM deal_comments WHERE id = ${commentId as string}`
      return res.status(200).json({ success: true, likesCount: updated[0].likes_count })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Comment like error:', error)
    return res.status(500).json({ error: 'Failed to update like', details: String(error) })
  }
}
