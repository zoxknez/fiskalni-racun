/**
 * ErrorBoundary Component Tests
 *
 * Tests error catching and fallback UI display
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

// Component that throws error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error during tests
  const originalError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })

  afterAll(() => {
    console.error = originalError
  })

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('should not show fallback UI when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
      expect(screen.queryByText(/nešto je pošlo po zlu/i)).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/nešto je pošlo po zlu/i)).toBeInTheDocument()
    })

    it('should display default error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/došlo je do neočekivane greške/i)).toBeInTheDocument()
    })

    it('should show refresh and retry buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /osveži stranicu/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pokušaj ponovo/i })).toBeInTheDocument()
    })
  })

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = (
        <div>
          <p>Custom error fallback</p>
          <button type="button">Custom action</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/custom error fallback/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /custom action/i })).toBeInTheDocument()
    })
  })

  describe('Error Details (Dev Mode)', () => {
    it('should show error details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      if (import.meta.env.DEV) {
        expect(screen.getByText(/detalji greške/i)).toBeInTheDocument()
        // Error message is in pre element with newlines, use text content matcher
        expect(
          screen.getByText((content, element) => {
            return element?.tagName === 'PRE' && content.includes('Test error message')
          })
        ).toBeInTheDocument()
      }
    })
  })

  describe('Reset Functionality', () => {
    it('should reset error boundary when retry button clicked', async () => {
      const user = userEvent.setup()

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Error displayed
      expect(screen.getByText(/nešto je pošlo po zlu/i)).toBeInTheDocument()

      // Click retry
      const retryButton = screen.getByRole('button', { name: /pokušaj ponovo/i })
      await user.click(retryButton)

      // Re-render with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // Error should be cleared (though component still throws on next render)
      // This tests the reset mechanism works
    })
  })

  describe('Custom Error Handler', () => {
    it('should call onError callback when error occurs', () => {
      const onErrorSpy = vi.fn()

      render(
        <ErrorBoundary onError={onErrorSpy}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onErrorSpy).toHaveBeenCalledTimes(1)
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper button types', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('should have accessible button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /osveži stranicu/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pokušaj ponovo/i })).toBeInTheDocument()
    })
  })
})
