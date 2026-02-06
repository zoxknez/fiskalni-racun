/**
 * Deal Comment Like API
 *
 * Toggle like on a deal comment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './db.js'
import { verifyTokenFromHeader } from './lib/auth.js'
import { applyCors } from './lib/cors.js'

async function getUserId(req: VercelRequest): Promise<string | null> {
  return verifyTokenFromHeader(req.headers.authorization)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cors = applyCors(req, res, { methods: 'POST, DELETE, OPTIONS' })
  if (!cors.allowed) return

  try {
    const userId = await getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { commentId } = req.query

    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' })
    }
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
    return res.status(500).json({ error: 'Failed to update like' })
  }
}
