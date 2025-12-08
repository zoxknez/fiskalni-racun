import { cn } from '@lib/utils'
import { X } from 'lucide-react'
import { memo, useMemo } from 'react'

interface TagBadgeProps {
  name: string
  color: string
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: (() => void) | undefined
  onClick?: (() => void) | undefined
  className?: string
}

/**
 * A badge component for displaying tags with customizable colors
 */
export const TagBadge = memo(function TagBadge({
  name,
  color,
  size = 'sm',
  removable = false,
  onRemove,
  onClick,
  className,
}: TagBadgeProps) {
  // Generate contrasting text color based on background
  const textColor = useMemo(() => {
    // Convert hex to RGB
    const hex = color.replace('#', '')
    const r = Number.parseInt(hex.substring(0, 2), 16)
    const g = Number.parseInt(hex.substring(2, 4), 16)
    const b = Number.parseInt(hex.substring(4, 6), 16)

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? '#1F2937' : '#FFFFFF'
  }, [color])

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove?.()
  }

  const baseClasses = cn(
    'inline-flex items-center gap-1 rounded-full font-medium transition-opacity',
    sizeClasses[size],
    className
  )

  // If onClick is provided, render as button for accessibility
  if (onClick) {
    return (
      <button
        type="button"
        className={cn(baseClasses, 'cursor-pointer hover:opacity-80')}
        style={{
          backgroundColor: color,
          color: textColor,
        }}
        onClick={onClick}
      >
        {name}
        {removable && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              'ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10',
              size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
            )}
            aria-label={`Remove ${name} tag`}
          >
            <X className="h-full w-full" />
          </button>
        )}
      </button>
    )
  }

  return (
    <span
      className={baseClasses}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
    >
      {name}
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
          aria-label={`Remove ${name} tag`}
        >
          <X className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </button>
      )}
    </span>
  )
})

interface TagListProps {
  tags: Array<{ name: string; color: string }>
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: (tagName: string) => void
  maxVisible?: number
  className?: string
}

/**
 * A component to display a list of tags with optional "show more" functionality
 */
export const TagList = memo(function TagList({
  tags,
  size = 'sm',
  removable = false,
  onRemove,
  maxVisible,
  className,
}: TagListProps) {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags
  const hiddenCount = maxVisible ? Math.max(0, tags.length - maxVisible) : 0

  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.name}
          name={tag.name}
          color={tag.color}
          size={size}
          removable={removable}
          onRemove={onRemove ? () => onRemove(tag.name) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span
          className={cn(
            'inline-flex items-center rounded-full bg-dark-200 font-medium text-dark-600 dark:bg-dark-700 dark:text-dark-300',
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          )}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  )
})
