/**
 * Modern Higher-Order Component - withLoading
 *
 * Adds loading state to any component
 */

import type { ComponentType } from 'react'

interface WithLoadingProps {
  isLoading?: boolean
  loadingComponent?: React.ReactNode
}

export function withLoading<P extends object>(Component: ComponentType<P>) {
  return function ComponentWithLoading(props: P & WithLoadingProps) {
    const { isLoading, loadingComponent, ...rest } = props

    if (isLoading) {
      return (
        loadingComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )
      )
    }

    return <Component {...(rest as P)} />
  }
}
