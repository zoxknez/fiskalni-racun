import { addTag, deleteTag, getAllTags, getTagByName, type Tag, updateTag } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'

// Predefined color palette for tags
export const TAG_COLORS: string[] = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
  '#6366F1', // indigo
]

export interface UseTagsResult {
  tags: Tag[]
  isLoading: boolean
  createTag: (name: string, color?: string) => Promise<string>
  updateTag: (id: string, updates: { name?: string; color?: string }) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  getTagByName: (name: string) => Promise<Tag | undefined>
  getNextColor: () => string
}

export function useTags(): UseTagsResult {
  const tags = useLiveQuery(() => getAllTags(), [], [])
  const isLoading = tags === undefined

  const getNextColor = useCallback((): string => {
    // Pick a color that's least used
    const colorCounts = new Map<string, number>()
    for (const color of TAG_COLORS) {
      colorCounts.set(color, 0)
    }

    if (tags) {
      for (const tag of tags) {
        const count = colorCounts.get(tag.color) || 0
        colorCounts.set(tag.color, count + 1)
      }
    }

    let minCount = Number.POSITIVE_INFINITY
    let minColor: string = TAG_COLORS[0] ?? '#3B82F6'

    for (const [color, count] of colorCounts) {
      if (count < minCount) {
        minCount = count
        minColor = color
      }
    }

    return minColor
  }, [tags])

  const createTag = useCallback(
    async (name: string, color?: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Tag name cannot be empty')

      // Check if tag with same name exists
      const existing = await getTagByName(trimmedName)
      if (existing) throw new Error('Tag with this name already exists')

      const tagColor = color ?? getNextColor()
      return addTag({ name: trimmedName, color: tagColor })
    },
    [getNextColor]
  )

  const handleUpdateTag = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      if (updates.name !== undefined) {
        const trimmedName = updates.name.trim()
        if (!trimmedName) throw new Error('Tag name cannot be empty')

        // Check if another tag with same name exists
        const existing = await getTagByName(trimmedName)
        if (existing && existing.id !== id) {
          throw new Error('Tag with this name already exists')
        }

        updates.name = trimmedName
      }

      await updateTag(id, updates)
    },
    []
  )

  const handleDeleteTag = useCallback(async (id: string) => {
    await deleteTag(id)
  }, [])

  const handleGetTagByName = useCallback(async (name: string) => {
    return getTagByName(name)
  }, [])

  return useMemo(
    () => ({
      tags: tags || [],
      isLoading,
      createTag,
      updateTag: handleUpdateTag,
      deleteTag: handleDeleteTag,
      getTagByName: handleGetTagByName,
      getNextColor,
    }),
    [tags, isLoading, createTag, handleUpdateTag, handleDeleteTag, handleGetTagByName, getNextColor]
  )
}

// Helper hook to get tag objects from an array of tag names
export function useTagsFromNames(tagNames: string[] | undefined): Tag[] {
  const { tags } = useTags()

  return useMemo(() => {
    if (!tagNames || tagNames.length === 0) return []

    const tagMap = new Map(tags.map((t) => [t.name, t]))
    return tagNames.map((name) => tagMap.get(name)).filter((t): t is Tag => t !== undefined)
  }, [tagNames, tags])
}
