// Main auth API router

import { handleChangePassword } from './handlers/change-password.js'
import { handleDeleteAccount } from './handlers/delete-account.js'
import { handleLogin } from './handlers/login.js'
import { handleLogout } from './handlers/logout.js'
import { handleMe } from './handlers/me.js'
import { handleRequestPasswordReset, handleResetPassword } from './handlers/password-reset.js'
import { handleProfileUpdate } from './handlers/profile.js'
import { handleRegister } from './handlers/register.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

type RouteHandler = (req: Request) => Promise<Response>

const routes: Record<string, RouteHandler> = {
  'POST:/register': handleRegister,
  'POST:/login': handleLogin,
  'POST:/logout': handleLogout,
  'GET:/me': handleMe,
  'PATCH:/profile': handleProfileUpdate,
  'POST:/request-password-reset': handleRequestPasswordReset,
  'POST:/reset-password': handleResetPassword,
  'POST:/change-password': handleChangePassword,
  'POST:/delete-account': handleDeleteAccount,
}

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const path = url.pathname.replace('/api/auth/', '')
  const method = req.method
  const routeKey = `${method}:${path}`

  const routeHandler = routes[routeKey]

  if (!routeHandler) {
    return new Response(JSON.stringify({ error: 'Not Found', code: 'NOT_FOUND' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    return await routeHandler(req)
  } catch (error) {
    console.error('Auth API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
