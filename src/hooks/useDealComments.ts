/**
 * useDealComments Hook
 *
 * Manages deal comments with real-time updates
 */

import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

const API_BASE = '/api'

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
  parentId: string | null
  replies?: DealComment[]
}

export interface CreateCommentInput {
  dealId: string
  content: string
  parentId?: string
}

export function useDealComments(dealId: string | null) {
  const { user } = useAppStore()
  const [comments, setComments] = useState<DealComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('neon_auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  // Fetch comments for a deal
  const fetchComments = useCallback(async () => {
    if (!dealId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/deals-comments?dealId=${dealId}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }

      const data = await response.json()
      setComments(data.comments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading comments')
      setComments([])
    } finally {
      setIsLoading(false)
    }
  }, [dealId, getAuthHeaders])

  // Create a new comment
  const createComment = useCallback(
    async (input: CreateCommentInput): Promise<DealComment | null> => {
      if (!user) {
        setError('You must be logged in to comment')
        return null
      }

      setIsSubmitting(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/deals-comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create comment')
        }

        const newComment = await response.json()

        // Add to comments list
        if (newComment.parentId) {
          // Add as reply
          setComments((prev) =>
            prev.map((c) => {
              if (c.id === newComment.parentId) {
                return {
                  ...c,
                  replies: [...(c.replies || []), newComment],
                }
              }
              return c
            })
          )
        } else {
          // Add as top-level comment
          setComments((prev) => [...prev, { ...newComment, replies: [] }])
        }

        return newComment
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error creating comment')
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [user, getAuthHeaders]
  )

  // Delete a comment
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!user) return false

      try {
        const response = await fetch(`${API_BASE}/deals-comments?id=${commentId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Failed to delete comment')
        }

        // Remove from comments list
        setComments((prev) => {
          // Check if it's a top-level comment
          const topLevel = prev.filter((c) => c.id !== commentId)

          // Also remove from replies
          return topLevel.map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.id !== commentId) || [],
          }))
        })

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting comment')
        return false
      }
    },
    [user, getAuthHeaders]
  )

  // Like a comment
  const likeComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!user) return false

      try {
        const response = await fetch(`${API_BASE}/deals-comment-like?commentId=${commentId}`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Failed to like comment')
        }

        const data = await response.json()

        // Update comment in list
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) {
              return { ...c, likesCount: data.likesCount, isLikedByUser: true }
            }
            // Check replies
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId
                    ? { ...r, likesCount: data.likesCount, isLikedByUser: true }
                    : r
                ),
              }
            }
            return c
          })
        )

        return true
      } catch {
        return false
      }
    },
    [user, getAuthHeaders]
  )

  // Unlike a comment
  const unlikeComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!user) return false

      try {
        const response = await fetch(`${API_BASE}/deals-comment-like?commentId=${commentId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Failed to unlike comment')
        }

        const data = await response.json()

        // Update comment in list
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) {
              return { ...c, likesCount: data.likesCount, isLikedByUser: false }
            }
            // Check replies
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId
                    ? { ...r, likesCount: data.likesCount, isLikedByUser: false }
                    : r
                ),
              }
            }
            return c
          })
        )

        return true
      } catch {
        return false
      }
    },
    [user, getAuthHeaders]
  )

  // Toggle like
  const toggleLike = useCallback(
    async (commentId: string, isLiked: boolean) => {
      if (isLiked) {
        return unlikeComment(commentId)
      }
      return likeComment(commentId)
    },
    [likeComment, unlikeComment]
  )

  // Fetch comments when dealId changes
  useEffect(() => {
    if (dealId) {
      fetchComments()
    } else {
      setComments([])
    }
  }, [dealId, fetchComments])

  return {
    comments,
    isLoading,
    error,
    isSubmitting,
    createComment,
    deleteComment,
    likeComment,
    unlikeComment,
    toggleLike,
    refreshComments: fetchComments,
    totalComments: comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0),
  }
}
