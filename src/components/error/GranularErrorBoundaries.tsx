/**
 * Granular Error Boundaries
 *
 * Provides specialized error boundaries for different parts of the application.
 * Each boundary has specific fallback UI and recovery options.
 *
 * @module components/error/GranularErrorBoundaries
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, BarChart3, Camera, RefreshCw, Wifi } from '@/lib/icons'

// ────────────────────────────────────────────────────────────────────────────
// Base Error Boundary Props
// ────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ────────────────────────────────────────────────────────────────────────────
// Chart Error Boundary
// ────────────────────────────────────────────────────────────────────────────

/**
 * Error boundary specifically for chart/visualization components.
 * Charts can fail due to invalid data or rendering issues.
 */
export class ChartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
          <BarChart3 className="mb-2 h-12 w-12 text-gray-400" />
          <p className="mb-2 font-medium text-gray-600 text-sm dark:text-gray-300">
            Ne mogu prikazati grafikon
          </p>
          <p className="mb-4 text-gray-500 text-xs">
            Podaci nisu validni ili je došlo do greške u prikazu
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" />
            Pokušaj ponovo
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Camera/Scanner Error Boundary
// ────────────────────────────────────────────────────────────────────────────

/**
 * Error boundary for camera and QR scanner components.
 * These can fail due to permission issues or device problems.
 */
export class CameraErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
          <Camera className="mb-2 h-12 w-12 text-gray-400" />
          <p className="mb-2 font-medium text-gray-600 text-sm dark:text-gray-300">
            Kamera nije dostupna
          </p>
          <p className="mb-4 text-center text-gray-500 text-xs">
            Proverite da li ste dozvolili pristup kameri i da neka druga aplikacija ne koristi
            kameru
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" />
            Pokušaj ponovo
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Network Error Boundary
// ────────────────────────────────────────────────────────────────────────────

/**
 * Error boundary for components that depend on network data.
 * Shows offline-friendly message and retry option.
 */
export class NetworkErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isOffline = !navigator.onLine

      return (
        <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
          <Wifi className="mb-2 h-12 w-12 text-gray-400" />
          <p className="mb-2 font-medium text-gray-600 text-sm dark:text-gray-300">
            {isOffline ? 'Nema internet konekcije' : 'Greška pri učitavanju podataka'}
          </p>
          <p className="mb-4 text-center text-gray-500 text-xs">
            {isOffline
              ? 'Povežite se na internet da biste videli ove podatke'
              : 'Proverite internet konekciju i pokušajte ponovo'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" />
            Pokušaj ponovo
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Widget Error Boundary
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight error boundary for dashboard widgets.
 * Shows minimal fallback to not disrupt the dashboard layout.
 */
export class WidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-full min-h-[100px] flex-col items-center justify-center rounded-lg border border-gray-300 border-dashed bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
          <AlertTriangle className="mb-1 h-6 w-6 text-amber-500" />
          <p className="text-gray-500 text-xs">Widget greška</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-2 text-primary-600 text-xs hover:underline"
          >
            Osveži
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Form Error Boundary
// ────────────────────────────────────────────────────────────────────────────

/**
 * Error boundary for form components.
 * Preserves user input where possible and provides clear recovery path.
 */
export class FormErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-800 text-sm dark:text-red-200">
                Došlo je do greške u formi
              </p>
              <p className="mt-1 text-red-600 text-xs dark:text-red-300">
                Vaši podaci su sačuvani. Pokušajte da osvežite stranicu.
              </p>
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-red-700 text-sm hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Pokušaj ponovo
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Export default composed boundary with all types
// ────────────────────────────────────────────────────────────────────────────

export const ErrorBoundaries = {
  Chart: ChartErrorBoundary,
  Camera: CameraErrorBoundary,
  Network: NetworkErrorBoundary,
  Widget: WidgetErrorBoundary,
  Form: FormErrorBoundary,
}
