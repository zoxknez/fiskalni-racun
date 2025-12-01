/**
 * Neon Auth Page
 *
 * Simple, clean login/register page using Neon PostgreSQL
 * Supports dark/light mode and i18n (en/sr)
 *
 * @module pages/NeonAuthPage
 */

import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Lock,
  LogIn,
  Mail,
  Moon,
  Sun,
  UserPlus,
} from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/logger'
import { authService, initializeDatabase } from '@/lib/neon'
import { useAppStore } from '@/store/useAppStore'
import type { User } from '@/types'

type AuthMode = 'login' | 'register' | 'forgot-password'

// Session token storage key
const SESSION_TOKEN_KEY = 'neon_auth_token'

export default function NeonAuthPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setUser, user, settings, updateSettings } = useAppStore()

  // Unique IDs for form elements
  const formId = useId()
  const fullNameInputId = `${formId}-fullName`
  const emailInputId = `${formId}-email`
  const passwordInputId = `${formId}-password`
  const confirmPasswordInputId = `${formId}-confirmPassword`

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dbInitialized, setDbInitialized] = useState(false)

  // Initialize database on mount
  useEffect(() => {
    initializeDatabase().then((success) => {
      setDbInitialized(success)
      if (!success) {
        toast.error(t('neonAuth.dbInitError'))
      }
    })
  }, [t])

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem(SESSION_TOKEN_KEY)
      if (token) {
        const neonUser = await authService.validateSession(token)
        if (neonUser) {
          const appUser: User = {
            id: neonUser.id,
            email: neonUser.email,
            createdAt: new Date(neonUser.created_at),
            ...(neonUser.full_name ? { fullName: neonUser.full_name } : {}),
            ...(neonUser.avatar_url ? { avatarUrl: neonUser.avatar_url } : {}),
          }
          setUser(appUser)
          navigate('/', { replace: true })
        } else {
          // Invalid session, remove token
          localStorage.removeItem(SESSION_TOKEN_KEY)
        }
      }
    }
    checkSession()
  }, [setUser, navigate])

  // Toggle language
  const toggleLanguage = useCallback(() => {
    const currentLang = i18n.language
    const newLang = currentLang.startsWith('sr') ? 'en' : 'sr-Latn'
    i18n.changeLanguage(newLang)
  }, [i18n])

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    updateSettings({ theme: newTheme })
  }, [settings.theme, updateSettings])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error(t('neonAuth.fillAllFields'))
      return
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        toast.error(t('neonAuth.passwordsDoNotMatch'))
        return
      }
      if (password.length < 8) {
        toast.error(t('neonAuth.passwordTooShort'))
        return
      }
    }

    setLoading(true)

    try {
      let result:
        | Awaited<ReturnType<typeof authService.login>>
        | Awaited<ReturnType<typeof authService.register>>

      if (mode === 'login') {
        result = await authService.login(email, password)
      } else {
        result = await authService.register(email, password, fullName || undefined)
      }

      if (result.success && result.user && result.token) {
        // Save session token
        localStorage.setItem(SESSION_TOKEN_KEY, result.token)

        // Set user in store
        const appUser: User = {
          id: result.user.id,
          email: result.user.email,
          createdAt: new Date(result.user.created_at),
          ...(result.user.full_name ? { fullName: result.user.full_name } : {}),
          ...(result.user.avatar_url ? { avatarUrl: result.user.avatar_url } : {}),
        }
        setUser(appUser)

        toast.success(mode === 'login' ? t('neonAuth.loginSuccess') : t('neonAuth.registerSuccess'))
        navigate('/', { replace: true })
      } else {
        toast.error(result.error || t('neonAuth.authError'))
      }
    } catch (error) {
      logger.error('Auth error:', error)
      toast.error(t('neonAuth.authError'))
    } finally {
      setLoading(false)
    }
  }

  // Switch between login and register
  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setPassword('')
    setConfirmPassword('')
  }

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t('neonAuth.fillAllFields'))
      return
    }

    setLoading(true)

    try {
      const result = await authService.requestPasswordReset(email)
      if (result.success) {
        toast.success(t('neonAuth.resetLinkSent'))
        setMode('login')
      } else {
        // Still show success message for security (don't reveal if email exists)
        toast.success(t('neonAuth.resetLinkSent'))
        setMode('login')
      }
    } catch (error) {
      logger.error('Password reset error:', error)
      toast.error(t('neonAuth.resetPasswordError'))
    } finally {
      setLoading(false)
    }
  }

  const isDark = settings.theme === 'dark'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900">
      {/* Theme & Language Toggle */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg bg-white/80 p-2 shadow-sm transition-colors hover:bg-white dark:bg-dark-700/80 dark:hover:bg-dark-600"
          aria-label={isDark ? t('neonAuth.switchToLight') : t('neonAuth.switchToDark')}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 text-dark-600" />
          )}
        </button>
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1 rounded-lg bg-white/80 p-2 shadow-sm transition-colors hover:bg-white dark:bg-dark-700/80 dark:hover:bg-dark-600"
          aria-label={t('neonAuth.toggleLanguage')}
        >
          <Languages className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <span className="font-medium text-dark-600 text-xs dark:text-dark-300">
            {i18n.language.startsWith('sr') ? 'SR' : 'EN'}
          </span>
        </button>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-dark-200 bg-white p-8 shadow-xl dark:border-dark-700 dark:bg-dark-800">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
              {mode === 'forgot-password' ? (
                <KeyRound className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              ) : (
                <LogIn className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            <h1 className="font-bold text-2xl text-dark-900 dark:text-white">
              {mode === 'forgot-password'
                ? t('neonAuth.resetPasswordTitle')
                : t('neonAuth.appTitle')}
            </h1>
            <p className="mt-2 text-dark-500 dark:text-dark-400">
              {mode === 'forgot-password'
                ? t('neonAuth.resetPasswordSubtitle')
                : mode === 'login'
                  ? t('neonAuth.welcomeBack')
                  : t('neonAuth.createAccount')}
            </p>
          </div>

          {/* Forgot Password Form */}
          {mode === 'forgot-password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor={emailInputId}
                  className="mb-1.5 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('neonAuth.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-dark-400" />
                  <Input
                    id={emailInputId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('neonAuth.emailPlaceholder')}
                    className="w-full pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading || !dbInitialized}
              >
                <Mail className="mr-2 h-5 w-5" />
                {t('neonAuth.sendResetLink')}
              </Button>

              {/* Back to Login */}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex w-full items-center justify-center gap-2 text-dark-500 text-sm hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('neonAuth.backToLogin')}
              </button>
            </form>
          ) : (
            /* Login/Register Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (only for register) */}
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor={fullNameInputId}
                    className="mb-1.5 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('neonAuth.fullNameLabel')}
                  </label>
                  <Input
                    id={fullNameInputId}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('neonAuth.fullNamePlaceholder')}
                    className="w-full"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor={emailInputId}
                  className="mb-1.5 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('neonAuth.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-dark-400" />
                  <Input
                    id={emailInputId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('neonAuth.emailPlaceholder')}
                    className="w-full pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor={passwordInputId}
                  className="mb-1.5 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('neonAuth.passwordLabel')}
                </label>
                <div className="relative">
                  <Lock className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-dark-400" />
                  <Input
                    id={passwordInputId}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('neonAuth.passwordPlaceholder')}
                    className="w-full pr-10 pl-10"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="-translate-y-1/2 absolute top-1/2 right-3 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link (only for login) */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-primary-600 text-sm hover:underline dark:text-primary-400"
                  >
                    {t('neonAuth.forgotPassword')}
                  </button>
                </div>
              )}

              {/* Confirm Password (only for register) */}
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor={confirmPasswordInputId}
                    className="mb-1.5 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('neonAuth.confirmPasswordLabel')}
                  </label>
                  <div className="relative">
                    <Lock className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-dark-400" />
                    <Input
                      id={confirmPasswordInputId}
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('neonAuth.confirmPasswordPlaceholder')}
                      className="w-full pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading || !dbInitialized}
              >
                {mode === 'login' ? (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    {t('neonAuth.loginButton')}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    {t('neonAuth.registerButton')}
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Switch Mode */}
          {mode !== 'forgot-password' && (
            <div className="mt-6 text-center">
              <p className="text-dark-500 text-sm dark:text-dark-400">
                {mode === 'login' ? t('neonAuth.noAccount') : t('neonAuth.hasAccount')}
                <button
                  type="button"
                  onClick={switchMode}
                  className="ml-1 font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  {mode === 'login' ? t('neonAuth.register') : t('neonAuth.login')}
                </button>
              </p>
            </div>
          )}

          {/* Database Status */}
          {!dbInitialized && (
            <div className="mt-4 rounded-lg bg-warning-100 p-3 text-center dark:bg-warning-900/30">
              <p className="text-sm text-warning-700 dark:text-warning-300">
                {t('neonAuth.initializingDb')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-dark-400 text-sm dark:text-dark-500">
          {t('neonAuth.poweredBy')}
        </p>
      </div>
    </div>
  )
}
