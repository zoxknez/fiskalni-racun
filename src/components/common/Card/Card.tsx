import { cn } from '@lib/utils'
import { createContext, type ReactNode } from 'react'

/**
 * Modern Compound Component Pattern
 *
 * Flexible, composable Card component
 * Better than props-based approach
 *
 * Usage:
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Title</Card.Title>
 *     <Card.Badge>New</Card.Badge>
 *   </Card.Header>
 *   <Card.Body>
 *     Content here
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 */

interface CardContextValue {
  variant: 'default' | 'bordered' | 'elevated'
}

const CardContext = createContext<CardContextValue>({ variant: 'default' })

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'bordered' | 'elevated'
  onClick?: () => void
  hover?: boolean
}

function CardRoot({ children, className, variant = 'default', onClick, hover }: CardProps) {
  const baseStyles = 'bg-white dark:bg-dark-800 rounded-xl transition-all duration-200'

  const variantStyles = {
    default: 'shadow-sm',
    bordered: 'border-2 border-dark-200 dark:border-dark-700',
    elevated: 'shadow-lg',
  }

  const hoverStyles = hover ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' : ''

  if (onClick) {
    return (
      <CardContext.Provider value={{ variant }}>
        <button
          type="button"
          onClick={onClick}
          className={cn(baseStyles, variantStyles[variant], hoverStyles, className)}
        >
          {children}
        </button>
      </CardContext.Provider>
    )
  }

  return (
    <CardContext.Provider value={{ variant }}>
      <div className={cn(baseStyles, variantStyles[variant], hoverStyles, className)}>
        {children}
      </div>
    </CardContext.Provider>
  )
}

function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between p-6 pb-4', className)}>{children}</div>
  )
}

function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-xl font-bold text-dark-900 dark:text-dark-50', className)}>
      {children}
    </h3>
  )
}

function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-dark-600 dark:text-dark-400', className)}>{children}</p>
}

function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 pt-4 border-t border-dark-200 dark:border-dark-700', className)}>
      {children}
    </div>
  )
}

function CardBadge({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const variants = {
    default: 'bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }

  return (
    <span
      className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', variants[variant], className)}
    >
      {children}
    </span>
  )
}

function CardDivider({ className }: { className?: string }) {
  return <hr className={cn('border-dark-200 dark:border-dark-700', className)} />
}

// Export as compound component
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
  Badge: CardBadge,
  Divider: CardDivider,
})
