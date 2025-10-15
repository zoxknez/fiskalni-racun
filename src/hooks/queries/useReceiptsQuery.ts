/**
 * TanStack Query hooks for Receipts
 *
 * Modern v5 features with Suspense support
 *
 * @module hooks/queries/useReceiptsQuery
 */

import { addReceipt, db, deleteReceipt, type Receipt, updateReceipt } from '@lib/db'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'

/**
 * Query keys factory
 */
export const receiptKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptKeys.all, 'list'] as const,
  list: (filters?: Partial<Receipt>) => [...receiptKeys.lists(), filters] as const,
  details: () => [...receiptKeys.all, 'detail'] as const,
  detail: (id: number) => [...receiptKeys.details(), id] as const,
  search: (query: string) => [...receiptKeys.all, 'search', query] as const,
}

/**
 * Fetch all receipts
 */
async function fetchReceipts(): Promise<Receipt[]> {
  return await db.receipts.orderBy('date').reverse().toArray()
}

/**
 * Fetch single receipt
 */
async function fetchReceipt(id: number): Promise<Receipt | undefined> {
  return await db.receipts.get(id)
}

/**
 * ⭐ Suspense query - All receipts
 */
export function useReceiptsSuspense() {
  return useSuspenseQuery({
    queryKey: receiptKeys.lists(),
    queryFn: fetchReceipts,
  })
}

/**
 * Regular query - All receipts (without suspense)
 */
export function useReceipts() {
  return useQuery({
    queryKey: receiptKeys.lists(),
    queryFn: fetchReceipts,
  })
}

/**
 * ⭐ Suspense query - Single receipt
 */
export function useReceiptSuspense(id: number) {
  return useSuspenseQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: () => fetchReceipt(id),
  })
}

/**
 * Regular query - Single receipt
 */
export function useReceipt(id: number) {
  return useQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: () => fetchReceipt(id),
    enabled: id > 0,
  })
}

/**
 * ⭐ Optimistic mutation - Add receipt
 */
export function useAddReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
      return await addReceipt(receipt)
    },

    // ⭐ Optimistic update
    onMutate: async (newReceipt) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: receiptKeys.lists() })

      // Snapshot previous value
      const previousReceipts = queryClient.getQueryData<Receipt[]>(receiptKeys.lists())

      // Optimistically update
      queryClient.setQueryData<Receipt[]>(receiptKeys.lists(), (old) => {
        const optimisticReceipt: Receipt = {
          id: Date.now(), // Temporary ID
          ...newReceipt,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
        }
        return [optimisticReceipt, ...(old || [])]
      })

      return { previousReceipts }
    },

    // On error, rollback
    onError: (_err, _newReceipt, context) => {
      queryClient.setQueryData(receiptKeys.lists(), context?.previousReceipts)
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() })
    },
  })
}

/**
 * ⭐ Optimistic mutation - Update receipt
 */
export function useUpdateReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Receipt> }) => {
      await updateReceipt(id, updates)
      return id
    },

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: receiptKeys.detail(id) })

      const previous = queryClient.getQueryData<Receipt>(receiptKeys.detail(id))

      queryClient.setQueryData<Receipt>(receiptKeys.detail(id), (old) => {
        if (!old) return old
        return { ...old, ...updates }
      })

      return { previous }
    },

    onError: (_err, { id }, context) => {
      queryClient.setQueryData(receiptKeys.detail(id), context?.previous)
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() })
    },
  })
}

/**
 * ⭐ Optimistic mutation - Delete receipt
 */
export function useDeleteReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await deleteReceipt(id)
      return id
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: receiptKeys.lists() })

      const previousReceipts = queryClient.getQueryData<Receipt[]>(receiptKeys.lists())

      queryClient.setQueryData<Receipt[]>(receiptKeys.lists(), (old) => {
        return old?.filter((r) => r.id !== id) || []
      })

      return { previousReceipts }
    },

    onError: (_err, _id, context) => {
      queryClient.setQueryData(receiptKeys.lists(), context?.previousReceipts)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() })
    },
  })
}

/**
 * Prefetch receipt (for hover/navigation optimization)
 */
export function usePrefetchReceipt() {
  const queryClient = useQueryClient()

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: receiptKeys.detail(id),
      queryFn: () => fetchReceipt(id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }
}
