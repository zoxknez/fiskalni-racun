/**
 * useDeals Hook
 *
 * Hook for managing community deals
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

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
  originalPrice?: number | undefined
  discountedPrice?: number | undefined
  discountPercent?: number | undefined
  store: string
  category: string
  url?: string | undefined
  imageUrl?: string | undefined
  expiresAt?: string | undefined
  location?: string | undefined
  isOnline: boolean
}

export type DealCategory =
  | 'electronics'
  | 'fashion'
  | 'food'
  | 'home'
  | 'beauty'
  | 'sports'
  | 'travel'
  | 'services'
  | 'other'

// Deal category options with icons/colors
export const DEAL_CATEGORIES = [
  { key: 'electronics' as const, color: '#3B82F6', icon: 'Smartphone', label: 'Elektronika' },
  { key: 'fashion' as const, color: '#EC4899', icon: 'Shirt', label: 'Moda' },
  { key: 'food' as const, color: '#F59E0B', icon: 'UtensilsCrossed', label: 'Hrana' },
  { key: 'home' as const, color: '#10B981', icon: 'Home', label: 'Dom' },
  { key: 'beauty' as const, color: '#8B5CF6', icon: 'Sparkles', label: 'Lepota' },
  { key: 'sports' as const, color: '#EF4444', icon: 'Dumbbell', label: 'Sport' },
  { key: 'travel' as const, color: '#06B6D4', icon: 'Plane', label: 'Putovanja' },
  { key: 'services' as const, color: '#6366F1', icon: 'Wrench', label: 'Usluge' },
  { key: 'other' as const, color: '#6B7280', icon: 'MoreHorizontal', label: 'Ostalo' },
] as const

// Popular stores
export const POPULAR_STORES = [
  'Gigatron',
  'Tehnomanija',
  'Emmezeta',
  'Lidl',
  'Idea',
  'Maxi',
  'Roda',
  'Fashion Company',
  'H&M',
  'Zara',
  'Reserved',
  'DM',
  'Lilly',
  'Sport Vision',
  'Planeta Sport',
  'Deichmann',
  'IKEA',
  'Jysk',
  'Uradi Sam',
  'Dr. Oetker Shop',
  'Wolt',
  'Glovo',
  'AliExpress',
  'Amazon',
  'eBay',
] as const

const API_BASE = '/api'

export interface UseDealsResult {
  deals: Deal[]
  isLoading: boolean
  error: string | null
  categoryCounts: Record<DealCategory, number>
  fetchDeals: (options?: {
    category?: string | undefined
    store?: string | undefined
    search?: string | undefined
  }) => Promise<void>
  createDeal: (deal: CreateDealInput) => Promise<Deal | null>
  deleteDeal: (id: string) => Promise<boolean>
  likeDeal: (id: string) => Promise<boolean>
  unlikeDeal: (id: string) => Promise<boolean>
  refreshDeals: () => Promise<void>
  getCategoryInfo: (category: DealCategory) => (typeof DEAL_CATEGORIES)[number] | undefined
}

export function useDeals(): UseDealsResult {
  const [deals, setDeals] = useState<Deal[]>([])
  const [allDeals, setAllDeals] = useState<Deal[]>([]) // Keep all deals for counting
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAppStore()

  // Calculate category counts from all deals
  const categoryCounts = useMemo(() => {
    const counts: Record<DealCategory, number> = {
      electronics: 0,
      fashion: 0,
      food: 0,
      home: 0,
      beauty: 0,
      sports: 0,
      travel: 0,
      services: 0,
      other: 0,
    }

    for (const deal of allDeals) {
      const category = deal.category as DealCategory
      if (category in counts) {
        counts[category]++
      }
    }

    return counts
  }, [allDeals])

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const fetchDeals = useCallback(
    async (options?: {
      category?: string | undefined
      store?: string | undefined
      search?: string | undefined
    }) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (options?.category) params.append('category', options.category)
        if (options?.store) params.append('store', options.store)
        if (options?.search) params.append('search', options.search)

        const url = `${API_BASE}/deals${params.toString() ? `?${params}` : ''}`
        const response = await fetch(url, {
          headers: {
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch deals')
        }

        const data = await response.json()
        const fetchedDeals = data.deals || []
        setDeals(fetchedDeals)

        // If no filters, update allDeals for counting
        if (!options?.category && !options?.store && !options?.search) {
          setAllDeals(fetchedDeals)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading deals')
        setDeals([])
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthHeaders]
  )

  const createDeal = useCallback(
    async (deal: CreateDealInput): Promise<Deal | null> => {
      if (!user) {
        setError('You must be logged in to create a deal')
        return null
      }

      try {
        const response = await fetch(`${API_BASE}/deals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(deal),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create deal')
        }

        const newDeal = await response.json()
        setDeals((prev) => [newDeal, ...prev])
        setAllDeals((prev) => [newDeal, ...prev])
        return newDeal
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error creating deal')
        return null
      }
    },
    [user, getAuthHeaders]
  )

  const deleteDeal = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        setError('You must be logged in to delete a deal')
        return false
      }

      try {
        const response = await fetch(`${API_BASE}/deals?id=${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete deal')
        }

        setDeals((prev) => prev.filter((d) => d.id !== id))
        setAllDeals((prev) => prev.filter((d) => d.id !== id))
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting deal')
        return false
      }
    },
    [user, getAuthHeaders]
  )

  const likeDeal = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        setError('You must be logged in to like a deal')
        return false
      }

      try {
        const response = await fetch(`${API_BASE}/deals-like?dealId=${id}`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to like deal')
        }

        const { likesCount } = await response.json()
        setDeals((prev) =>
          prev.map((d) => (d.id === id ? { ...d, likesCount, isLikedByUser: true } : d))
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error liking deal')
        return false
      }
    },
    [user, getAuthHeaders]
  )

  const unlikeDeal = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        setError('You must be logged in to unlike a deal')
        return false
      }

      try {
        const response = await fetch(`${API_BASE}/deals-like?dealId=${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to unlike deal')
        }

        const { likesCount } = await response.json()
        setDeals((prev) =>
          prev.map((d) => (d.id === id ? { ...d, likesCount, isLikedByUser: false } : d))
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error unliking deal')
        return false
      }
    },
    [user, getAuthHeaders]
  )

  const refreshDeals = useCallback(async () => {
    await fetchDeals()
  }, [fetchDeals])

  const getCategoryInfo = useCallback((category: DealCategory) => {
    return DEAL_CATEGORIES.find((c) => c.key === category)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  return {
    deals,
    isLoading,
    error,
    categoryCounts,
    fetchDeals,
    createDeal,
    deleteDeal,
    likeDeal,
    unlikeDeal,
    refreshDeals,
    getCategoryInfo,
  }
}
