/**
 * Authentication Flow Integration Tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

// Simple auth components for testing
function AuthForm() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Popunite sva polja')
      return
    }

    if (password.length < 12) {
      setError('Šifra mora imati najmanje 12 karaktera')
      return
    }

    // Simulate API call (keep short to speed up test)
    await new Promise((resolve) => setTimeout(resolve, 5))

    if (email === 'error@test.com') {
      setError('Invalid login credentials')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return <div>Uspešna prijava!</div>
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />

      <input
        type="password"
        placeholder="Šifra"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />

      <button type="submit">Prijavi se</button>

      {error && <div role="alert">{error}</div>}
    </form>
  )
}

import React from 'react'

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

describe('Authentication Flow', () => {
  it('should complete sign in flow successfully', async () => {
    const user = userEvent.setup({ delay: 0 })

    render(
      <BrowserRouter future={routerFuture}>
        <AuthForm />
      </BrowserRouter>
    )

    // Fill in form
    await user.type(screen.getByTestId('email-input'), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'TestPassword123!')

    // Submit
    await user.click(screen.getByText('Prijavi se'))

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Uspešna prijava!')).toBeInTheDocument()
    })
  })

  it('should show validation error for empty fields', async () => {
    const user = userEvent.setup({ delay: 0 })

    render(
      <BrowserRouter future={routerFuture}>
        <AuthForm />
      </BrowserRouter>
    )

    // Submit without filling
    await user.click(screen.getByText('Prijavi se'))

    // Should show error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Popunite sva polja')
    })
  })

  it('should show password length validation error', async () => {
    const user = userEvent.setup({ delay: 0 })

    render(
      <BrowserRouter future={routerFuture}>
        <AuthForm />
      </BrowserRouter>
    )

    await user.type(screen.getByTestId('email-input'), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'short')

    await user.click(screen.getByText('Prijavi se'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Šifra mora imati najmanje 12 karaktera')
    })
  })

  it('should handle API errors', async () => {
    const user = userEvent.setup({ delay: 0 })

    render(
      <BrowserRouter future={routerFuture}>
        <AuthForm />
      </BrowserRouter>
    )

    await user.type(screen.getByTestId('email-input'), 'error@test.com')
    await user.type(screen.getByTestId('password-input'), 'TestPassword123!')

    await user.click(screen.getByText('Prijavi se'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials')
    })
  })
})
