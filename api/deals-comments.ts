/**
 * Deal Comments API
 *
 * API routes for managing comments on community deals
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './db.js'
import { applyCors } from './lib/cors.js'
import { getUserFromToken, type UserInfo } from './lib/user-helpers.js'

export interface DealComment {
  id: string
  dealId: string
  userId: string
  userName: string
  userAvatar: string | null
  content: string
  likesCount: number
  isLikedByUser: boolean
  createdAt: string
  updatedAt: string
  replies?: DealComment[]
  parentId: string | null
}

// Flag to track if comment tables have been initialized
let commentTablesInitialized = false

// Ensure comments table has all needed columns
async function ensureCommentsTable() {
  if (commentTablesInitialized) return

  // Add parent_id for threaded comments if not exists
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deal_comments' AND column_name = 'parent_id'
      ) THEN
        ALTER TABLE deal_comments ADD COLUMN parent_id UUID REFERENCES deal_comments(id) ON DELETE CASCADE;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deal_comments' AND column_name = 'likes_count'
      ) THEN
        ALTER TABLE deal_comments ADD COLUMN likes_count INTEGER DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deal_comments' AND column_name = 'updated_at'
      ) THEN
        ALTER TABLE deal_comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      END IF;
    END $$;
  `

  // Create comment likes table
  await sql`
    CREATE TABLE IF NOT EXISTS deal_comment_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id UUID NOT NULL REFERENCES deal_comments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, user_id)
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON deal_comment_likes(comment_id)`

  commentTablesInitialized = true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cors = applyCors(req, res, { methods: 'GET, POST, PUT, DELETE, OPTIONS' })
  if (!cors.allowed) return

  try {
    await ensureCommentsTable()
    const user = await getUserFromToken(req)

    switch (req.method) {
      case 'GET':
        return getComments(req, res, user?.id)
      case 'POST':
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        return createComment(req, res, user)
      case 'PUT':
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        return updateComment(req, res, user.id)
      case 'DELETE':
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        return deleteComment(req, res, user.id)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Comments API error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}

async function getComments(req: VercelRequest, res: VercelResponse, userId?: string) {
  const { dealId, limit = '50', offset = '0' } = req.query
  const limitNumber = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const offsetNumber = Math.max(Number(offset) || 0, 0)

  if (!dealId) {
    return res.status(400).json({ error: 'Deal ID is required' })
  }

  try {
    const comments = userId
      ? await sql`
          SELECT 
            c.*,
            u.full_name as user_name,
            u.avatar_url as user_avatar,
            EXISTS(SELECT 1 FROM deal_comment_likes WHERE comment_id = c.id AND user_id = ${userId}) as is_liked_by_user
          FROM deal_comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.deal_id = ${dealId as string}
          ORDER BY c.created_at ASC
          LIMIT ${limitNumber} OFFSET ${offsetNumber}
        `
      : await sql`
          SELECT 
            c.*,
            u.full_name as user_name,
            u.avatar_url as user_avatar,
            false as is_liked_by_user
          FROM deal_comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.deal_id = ${dealId as string}
          ORDER BY c.created_at ASC
          LIMIT ${limitNumber} OFFSET ${offsetNumber}
        `

    const mappedComments: DealComment[] = comments.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      dealId: c.deal_id as string,
      userId: c.user_id as string,
      userName: (c.user_name as string) || 'Anonymous',
      userAvatar: c.user_avatar as string | null,
      content: c.content as string,
      likesCount: (c.likes_count as number) || 0,
      isLikedByUser: (c.is_liked_by_user as boolean) || false,
      createdAt: c.created_at as string,
      updatedAt: c.updated_at as string,
      parentId: c.parent_id as string | null,
    }))

    // Organize into threads (parent comments with replies)
    const parentComments = mappedComments.filter((c) => !c.parentId)
    const replies = mappedComments.filter((c) => c.parentId)

    const threadedComments = parentComments.map((parent) => ({
      ...parent,
      replies: replies.filter((r) => r.parentId === parent.id),
    }))

    return res.status(200).json({ comments: threadedComments, total: mappedComments.length })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return res.status(500).json({ error: 'Failed to fetch comments' })
  }
}

async function createComment(req: VercelRequest, res: VercelResponse, user: UserInfo) {
  const { dealId, content, parentId } = req.body

  if (!dealId || !content?.trim()) {
    return res.status(400).json({ error: 'Deal ID and content are required' })
  }

  try {
    // Verify deal exists
    const deal = await sql`SELECT id FROM community_deals WHERE id = ${dealId}`
    if (deal.length === 0) {
      return res.status(404).json({ error: 'Deal not found' })
    }

    // If replying, verify parent comment exists
    if (parentId) {
      const parent = await sql`SELECT id FROM deal_comments WHERE id = ${parentId}`
      if (parent.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' })
      }
    }

    const result = await sql`
      INSERT INTO deal_comments (deal_id, user_id, content, parent_id)
      VALUES (${dealId}, ${user.id}, ${content.trim()}, ${parentId || null})
      RETURNING *
    `

    // Update comments count on deal
    await sql`
      UPDATE community_deals 
      SET comments_count = (SELECT COUNT(*) FROM deal_comments WHERE deal_id = ${dealId})
      WHERE id = ${dealId}
    `

    const comment: DealComment = {
      id: result[0].id,
      dealId: result[0].deal_id,
      userId: result[0].user_id,
      userName: user.name,
      userAvatar: user.avatar,
      content: result[0].content,
      likesCount: 0,
      isLikedByUser: false,
      createdAt: result[0].created_at,
      updatedAt: result[0].updated_at,
      parentId: result[0].parent_id,
    }

    return res.status(201).json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return res.status(500).json({ error: 'Failed to create comment' })
  }
}

async function updateComment(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query
  const { content } = req.body

  if (!id || !content?.trim()) {
    return res.status(400).json({ error: 'Comment ID and content are required' })
  }

  try {
    // Check ownership
    const comment = await sql`SELECT user_id FROM deal_comments WHERE id = ${id as string}`
    if (comment.length === 0) {
      return res.status(404).json({ error: 'Comment not found' })
    }
    if (comment[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' })
    }

    const result = await sql`
      UPDATE deal_comments 
      SET content = ${content.trim()}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id as string}
      RETURNING *
    `

    return res.status(200).json(result[0])
  } catch (error) {
    console.error('Error updating comment:', error)
    return res.status(500).json({ error: 'Failed to update comment' })
  }
}

async function deleteComment(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Comment ID is required' })
  }

  try {
    // Check ownership
    const comment = await sql`SELECT user_id, deal_id FROM deal_comments WHERE id = ${id as string}`
    if (comment.length === 0) {
      return res.status(404).json({ error: 'Comment not found' })
    }
    if (comment[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' })
    }

    const commentDealId = comment[0].deal_id

    await sql`DELETE FROM deal_comments WHERE id = ${id as string}`

    // Update comments count on deal
    await sql`
      UPDATE community_deals 
      SET comments_count = (SELECT COUNT(*) FROM deal_comments WHERE deal_id = ${commentDealId})
      WHERE id = ${commentDealId}
    `

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return res.status(500).json({ error: 'Failed to delete comment' })
  }
}
