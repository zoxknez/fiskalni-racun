import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Languages,
  Lock,
  LogIn,
  Mail,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { logger } from '@/lib/logger'
import { authService } from '@/lib/neon/auth'
import { useAppStore } from '@/store/useAppStore'

// import type { User } from '@/types'

type AuthMode = 'login' | 'register'

type AuthLocationState = {
  from?: {
    pathname?: string
  }
}

function AuthPage() {
  const { t, i18n } = useTranslation()
  const navigate = useSmoothNavigate()
  const location = useLocation()
  const { setUser, user } = useAppStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const emailInputId = useId()
  const passwordInputId = useId()
  const confirmPasswordInputId = useId()

  // ⭐ ACCESSIBILITY: Respect user's reduced motion preference
  const prefersReducedMotion = useReducedMotion()

  const redirectPath = useMemo(() => {
    const state = location.state as AuthLocationState | null
    return state?.from?.pathname ?? '/'
  }, [location.state])

  useEffect(() => {
    if (!user) return
    navigate(redirectPath, { replace: true })
  }, [navigate, redirectPath, user])

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // ⭐ OPTIMIZED: Language toggle with useCallback
  const toggleLanguage = useCallback(() => {
    const currentLang = i18n.language
    const newLang = currentLang.startsWith('sr') ? 'en' : 'sr-Latn'
    i18n.changeLanguage(newLang)
  }, [i18n])

  const SubmitIcon = mode === 'login' ? LogIn : UserPlus
  const submitLabel = mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')

  if (user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error(t('auth.fillAllFields'))
      return
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        toast.error(t('auth.passwordsDoNotMatch'))
        return
      }

      // Jednostavna provjera - minimalno 6 karaktera
      if (password.length < 6) {
        toast.error(t('auth.passwordMinLength', { min: 6 }))
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        // Sign in with Neon
        const result = await authService.login(email, password)

        if (!result.success || !result.user || !result.token) {
          throw new Error(result.error || 'Login failed')
        }

        // Sačuvaj token u localStorage
        localStorage.setItem('neon_auth_token', result.token)

        const user = result.user
        setUser({
          id: user.id,
          email: user.email,
          fullName: user.full_name || '',
          ...(user.avatar_url ? { avatarUrl: user.avatar_url } : {}),
          createdAt: new Date(user.created_at),
        })

        toast.success(t('auth.loginSuccess'))
      } else {
        // Sign up with Neon
        const result = await authService.register(email, password)

        if (!result.success || !result.user || !result.token) {
          throw new Error(result.error || 'Registration failed')
        }

        // Sačuvaj token u localStorage
        localStorage.setItem('neon_auth_token', result.token)

        const user = result.user
        setUser({
          id: user.id,
          email: user.email,
          fullName: user.full_name || '',
          ...(user.avatar_url ? { avatarUrl: user.avatar_url } : {}),
          createdAt: new Date(user.created_at),
        })

        toast.success(t('auth.registerSuccess'))
      }

      // Redirect to the page they tried to visit or home
      navigate(redirectPath, { replace: true })
    } catch (error: unknown) {
      logger.error('Auth error:', error)

      // Map API error messages to translations
      const getErrorMessage = (): string => {
        if (error instanceof Error) {
          const msg = error.message.toLowerCase()
          if (msg.includes('already exists') || msg.includes('user exists')) {
            return t('neonAuth.userAlreadyExists') as string
          }
          if (msg.includes('invalid credentials') || msg.includes('wrong password')) {
            return t('neonAuth.invalidCredentials') as string
          }
          return error.message
        }
        return t('auth.authError') as string
      }

      toast.error(getErrorMessage())
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-blue-600">
          {/* Floating Orbs - respects reduced motion */}
          {!prefersReducedMotion ? (
            <>
              <motion.div
                animate={{
                  x: [0, 50, 0],
                  y: [0, -50, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white opacity-20 blur-2xl"
              />
              <motion.div
                animate={{
                  x: [0, -40, 0],
                  y: [0, 40, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className="absolute bottom-20 left-20 h-80 w-80 rounded-full bg-primary-300 opacity-20 blur-2xl"
              />
              <motion.div
                animate={{
                  x: [0, 30, 0],
                  y: [0, -30, 0],
                }}
                transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className="absolute top-1/2 left-1/2 h-72 w-72 rounded-full bg-blue-400 opacity-10 blur-xl"
              />
            </>
          ) : (
            <>
              <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white opacity-20 blur-2xl" />
              <div className="absolute bottom-20 left-20 h-80 w-80 rounded-full bg-primary-300 opacity-20 blur-2xl" />
              <div className="absolute top-1/2 left-1/2 h-72 w-72 rounded-full bg-blue-400 opacity-10 blur-xl" />
            </>
          )}
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          <div className="card border-2 border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:bg-dark-900/95">
            {/* Logo & Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8 text-center"
            >
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/50"
              >
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="mb-2 font-black text-3xl text-dark-900 dark:text-dark-50">
                {t('auth.appTitle')}
              </h1>
              <p className="text-dark-600 dark:text-dark-400">
                {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
              </p>
            </motion.div>

            {/* Mode Toggle */}
            <div className="mb-6 flex gap-2 rounded-xl bg-dark-100 p-1 dark:bg-dark-800">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-lg py-2.5 font-semibold transition-all duration-300 ${
                  mode === 'login'
                    ? 'bg-white text-primary-600 shadow-md dark:bg-dark-700 dark:text-primary-400'
                    : 'text-dark-600 hover:text-dark-900 dark:text-dark-400 dark:hover:text-dark-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  {t('auth.login')}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-lg py-2.5 font-semibold transition-all duration-300 ${
                  mode === 'register'
                    ? 'bg-white text-primary-600 shadow-md dark:bg-dark-700 dark:text-primary-400'
                    : 'text-dark-600 hover:text-dark-900 dark:text-dark-400 dark:hover:text-dark-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('auth.register')}
                </div>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Email */}
                  <div>
                    <label
                      htmlFor={emailInputId}
                      className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('auth.emailLabel')}
                    </label>
                    <div className="relative">
                      <Mail className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-400" />
                      <input
                        id={emailInputId}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input pl-12"
                        placeholder={t('auth.emailPlaceholder')}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor={passwordInputId}
                      className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('auth.passwordLabel')}
                    </label>
                    <div className="relative">
                      <Lock className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-400" />
                      <input
                        id={passwordInputId}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input pr-12 pl-12"
                        placeholder={t('auth.passwordPlaceholder')}
                        required
                        minLength={6}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="-translate-y-1/2 absolute top-1/2 right-4 text-dark-400 transition-colors hover:text-dark-600 dark:hover:text-dark-200"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Register only) */}
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label
                        htmlFor={confirmPasswordInputId}
                        className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-300"
                      >
                        {t('auth.confirmPasswordLabel')}
                      </label>
                      <div className="relative">
                        <Lock className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-400" />
                        <input
                          id={confirmPasswordInputId}
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input pl-12"
                          placeholder={t('auth.passwordPlaceholder')}
                          required={mode === 'register'}
                          minLength={6}
                          autoComplete="new-password"
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Forgot Password (Login only) */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    className="font-medium text-primary-600 text-sm hover:underline dark:text-primary-400"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary group relative flex w-full items-center justify-center gap-2 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-400"
                  animate={{
                    x: loading ? ['-100%', '100%'] : 0,
                  }}
                  transition={{
                    duration: 1,
                    repeat: loading ? Number.POSITIVE_INFINITY : 0,
                    ease: 'linear',
                  }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'linear',
                        }}
                      >
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                      {t('auth.loading')}
                    </>
                  ) : (
                    [
                      <SubmitIcon key="icon" className="h-5 w-5" />,
                      <span key="label">{submitLabel}</span>,
                    ]
                  )}
                </span>
              </motion.button>
            </form>

            {/* Date & Time + Language Switcher */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 border-dark-200 border-t pt-6 dark:border-dark-700"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Date & Time */}
                <div className="flex flex-1 items-center gap-4">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                      <Calendar className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="font-medium text-dark-700 text-sm dark:text-dark-300">
                      {currentTime.toLocaleDateString(i18n.language, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Clock className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-dark-700 text-sm tabular-nums dark:text-dark-300">
                      {currentTime.toLocaleTimeString(i18n.language, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </motion.div>
                </div>

                {/* Language Switcher */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  onClick={toggleLanguage}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:scale-105 hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-500/40 hover:shadow-xl active:scale-95"
                >
                  <Languages className="h-4.5 w-4.5" />
                  <span className="text-sm">{i18n.language.startsWith('sr') ? 'EN' : 'RS'}</span>
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            className="-top-4 -right-4 -z-10 absolute h-24 w-24 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-600 opacity-50 blur-2xl"
          />
          <motion.div
            animate={{
              rotate: [360, 0],
            }}
            transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            className="-bottom-4 -left-4 -z-10 absolute h-32 w-32 rounded-3xl bg-gradient-to-br from-blue-400 to-blue-600 opacity-50 blur-2xl"
          />
        </motion.div>
      </div>
    </PageTransition>
  )
}

// ⭐ OPTIMIZED: Memoize component to prevent unnecessary re-renders
export default memo(AuthPage)
