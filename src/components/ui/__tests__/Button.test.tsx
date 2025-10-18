/**
 * Button Component Tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

// Simple Button component for testing
function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
  loading = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={variant === 'destructive' ? 'btn-destructive' : 'btn-default'}
      data-testid="button"
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}

describe('Button Component', () => {
  it('should render button text', () => {
    render(<Button>Click me</Button>)

    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByTestId('button')
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    )

    const button = screen.getByTestId('button')
    await user.click(button)

    expect(handleClick).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
  })

  it('should show loading state', () => {
    render(<Button loading>Click me</Button>)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Click me')).not.toBeInTheDocument()
  })

  it('should apply destructive variant class', () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByTestId('button')
    expect(button).toHaveClass('btn-destructive')
  })

  it('should apply default variant class', () => {
    render(<Button variant="default">Save</Button>)

    const button = screen.getByTestId('button')
    expect(button).toHaveClass('btn-default')
  })
})
