/**
 * Virtual List Component
 *
 * Efficiently renders large lists using react-virtuoso
 *
 * @module components/common/VirtualList
 */

import { Loader2 } from 'lucide-react'
import { Virtuoso, type VirtuosoProps } from 'react-virtuoso'

interface VirtualListProps<T> extends Partial<VirtuosoProps<T, unknown>> {
  items: T[]
  itemContent: (index: number, item: T) => React.ReactNode
  emptyMessage?: string
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  estimateSize?: number
  overscan?: number
}

export function VirtualList<T>({
  items,
  itemContent,
  emptyMessage = 'Nema stavki',
  loading = false,
  onLoadMore,
  hasMore = false,
  estimateSize = 80,
  overscan = 5,
  ...virtuosoProps
}: VirtualListProps<T>) {
  const { components: incomingComponents, ...restVirtuosoProps } = virtuosoProps

  const footerComponent = hasMore
    ? () => (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      )
    : undefined

  const components = footerComponent
    ? {
        ...incomingComponents,
        Footer: footerComponent,
      }
    : incomingComponents
  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-dark-600 dark:text-dark-400">{emptyMessage}</p>
      </div>
    )
  }

  const optionalVirtuosoProps = {
    ...(onLoadMore && hasMore ? { endReached: onLoadMore } : {}),
    ...(components ? { components } : {}),
  }

  return (
    <Virtuoso
      data={items}
      itemContent={itemContent}
      defaultItemHeight={estimateSize}
      overscan={overscan}
      {...optionalVirtuosoProps}
      {...restVirtuosoProps}
    />
  )
}

/**
 * Virtual Grid Component
 *
 * Grid layout with virtualization
 */
interface VirtualGridProps<T> {
  items: T[]
  itemContent: (index: number, item: T) => React.ReactNode
  columns?: number
  gap?: number
  emptyMessage?: string
}

export function VirtualGrid<T>({
  items,
  itemContent,
  columns = 2,
  gap = 16,
  emptyMessage = 'Nema stavki',
}: VirtualGridProps<T>) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-dark-600 dark:text-dark-400">{emptyMessage}</p>
      </div>
    )
  }

  // Group items into rows
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns))
  }

  return (
    <Virtuoso
      data={rows}
      itemContent={(rowIndex, row) => (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`,
            marginBottom: `${gap}px`,
          }}
        >
          {row.map((item, colIndex) => (
            <div key={rowIndex * columns + colIndex}>
              {itemContent(rowIndex * columns + colIndex, item)}
            </div>
          ))}
        </div>
      )}
    />
  )
}
