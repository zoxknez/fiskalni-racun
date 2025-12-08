/**
 * Community Deals API
 *
 * API routes for managing community-shared deals
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './auth-utils'
import { sql } from './db'

export interface Deal {
  id: string
  userId: string
  userName: string
  title: string
  description: string
  originalPrice: number | null
  discountedPrice: number | null
  discountPercent: number | null
  store: string
  category: string
  url: string | null
  imageUrl: string | null
  expiresAt: string | null
  location: string | null
  isOnline: boolean
  likesCount: number
  commentsCount: number
  isLikedByUser: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateDealInput {
  title: string
  description: string
  originalPrice?: number
  discountedPrice?: number
  discountPercent?: number
  store: string
  category: string
  url?: string
  imageUrl?: string
  expiresAt?: string
  location?: string
  isOnline: boolean
}

interface UserInfo {
  id: string
  name: string
}

// Helper to get user info from token
async function getUserFromToken(req: VercelRequest): Promise<UserInfo | null> {
  // Convert VercelRequest to Request-like object for verifyToken
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  // Create a mock Request object
  const mockReq = {
    headers: new Headers({ authorization: authHeader }),
  } as unknown as Request

  const userId = await verifyToken(mockReq)
  if (!userId) return null

  // Get user info
  const users = await sql`SELECT id, name FROM users WHERE id = ${userId}`
  if (users.length === 0) return null

  return {
    id: users[0].id as string,
    name: (users[0].name as string) || 'Anonymous',
  }
}

// Initialize deals table
async function ensureDealsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS community_deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      original_price DECIMAL(10,2),
      discounted_price DECIMAL(10,2),
      discount_percent INTEGER,
      store VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      url TEXT,
      image_url TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      location VARCHAR(200),
      is_online BOOLEAN DEFAULT true,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS deal_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES community_deals(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(deal_id, user_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS deal_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id UUID NOT NULL REFERENCES community_deals(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Create indexes if they don't exist
  await sql`CREATE INDEX IF NOT EXISTS idx_deals_created_at ON community_deals(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_deals_category ON community_deals(category)`
  await sql`CREATE INDEX IF NOT EXISTS idx_deals_store ON community_deals(store)`
  await sql`CREATE INDEX IF NOT EXISTS idx_deal_likes_deal ON deal_likes(deal_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_deal_comments_deal ON deal_comments(deal_id)`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Ensure tables exist
    await ensureDealsTable()

    const user = await getUserFromToken(req)

    switch (req.method) {
      case 'GET':
        return getDeals(req, res, user?.id)
      case 'POST':
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        return createDeal(req, res, user.id, user.name || 'Anonymous')
      case 'DELETE':
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        return deleteDeal(req, res, user.id)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Deals API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getDeals(req: VercelRequest, res: VercelResponse, userId?: string) {
  const { category, store, search, limit = '50', offset = '0' } = req.query

  let query = `
    SELECT 
      d.*,
      u.name as user_name,
      ${userId ? `EXISTS(SELECT 1 FROM deal_likes WHERE deal_id = d.id AND user_id = '${userId}') as is_liked_by_user` : 'false as is_liked_by_user'}
    FROM community_deals d
    JOIN users u ON d.user_id = u.id
    WHERE 1=1
  `

  const conditions: string[] = []

  if (category && category !== 'all') {
    conditions.push(`d.category = '${category}'`)
  }

  if (store) {
    conditions.push(`d.store ILIKE '%${store}%'`)
  }

  if (search) {
    conditions.push(
      `(d.title ILIKE '%${search}%' OR d.description ILIKE '%${search}%' OR d.store ILIKE '%${search}%')`
    )
  }

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(' AND ')}`
  }

  query += ` ORDER BY d.created_at DESC LIMIT ${limit} OFFSET ${offset}`

  const dealsResult = (await sql.unsafe(query)) as unknown as Record<string, unknown>[]

  // Map to response format
  const mappedDeals: Deal[] = dealsResult.map((d) => ({
    id: d.id as string,
    userId: d.user_id as string,
    userName: (d.user_name as string) || 'Anonymous',
    title: d.title as string,
    description: d.description as string,
    originalPrice: d.original_price ? Number(d.original_price) : null,
    discountedPrice: d.discounted_price ? Number(d.discounted_price) : null,
    discountPercent: d.discount_percent as number | null,
    store: d.store as string,
    category: d.category as string,
    url: d.url as string | null,
    imageUrl: d.image_url as string | null,
    expiresAt: d.expires_at as string | null,
    location: d.location as string | null,
    isOnline: d.is_online as boolean,
    likesCount: (d.likes_count as number) || 0,
    commentsCount: (d.comments_count as number) || 0,
    isLikedByUser: (d.is_liked_by_user as boolean) || false,
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  }))

  return res.status(200).json({ deals: mappedDeals, total: mappedDeals.length })
}

async function createDeal(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
  userName: string
) {
  const input: CreateDealInput = req.body

  if (!input.title || !input.store || !input.category) {
    return res.status(400).json({ error: 'Title, store, and category are required' })
  }

  const result = await sql`
    INSERT INTO community_deals (
      user_id, title, description, original_price, discounted_price, 
      discount_percent, store, category, url, image_url, expires_at, 
      location, is_online
    ) VALUES (
      ${userId}, ${input.title}, ${input.description || ''}, 
      ${input.originalPrice || null}, ${input.discountedPrice || null},
      ${input.discountPercent || null}, ${input.store}, ${input.category},
      ${input.url || null}, ${input.imageUrl || null}, 
      ${input.expiresAt || null}, ${input.location || null}, ${input.isOnline}
    )
    RETURNING *
  `

  const deal: Deal = {
    id: result[0].id,
    userId: result[0].user_id,
    userName,
    title: result[0].title,
    description: result[0].description,
    originalPrice: result[0].original_price ? Number(result[0].original_price) : null,
    discountedPrice: result[0].discounted_price ? Number(result[0].discounted_price) : null,
    discountPercent: result[0].discount_percent,
    store: result[0].store,
    category: result[0].category,
    url: result[0].url,
    imageUrl: result[0].image_url,
    expiresAt: result[0].expires_at,
    location: result[0].location,
    isOnline: result[0].is_online,
    likesCount: 0,
    commentsCount: 0,
    isLikedByUser: false,
    createdAt: result[0].created_at,
    updatedAt: result[0].updated_at,
  }

  return res.status(201).json(deal)
}

async function deleteDeal(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Deal ID is required' })
  }

  // Check ownership
  const deal = await sql`SELECT user_id FROM community_deals WHERE id = ${id as string}`

  if (deal.length === 0) {
    return res.status(404).json({ error: 'Deal not found' })
  }

  if (deal[0].user_id !== userId) {
    return res.status(403).json({ error: 'You can only delete your own deals' })
  }

  await sql`DELETE FROM community_deals WHERE id = ${id as string}`

  return res.status(200).json({ success: true })
}
