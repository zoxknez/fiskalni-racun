import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Chrome,
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
import { useEffect, useState, useState as useStateReact } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { signIn, signInWithGoogle, signUp, toAuthUser } from '@/lib/auth'
import { useAppStore } from '@/store/useAppStore'

type AuthMode = 'login' | 'register'

export default function AuthPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser, user } = useAppStore()
  const [currentTime, setCurrentTime] = useStateReact(new Date())

  // If already logged in, redirect to home
  if (user) {
    const from = (location.state as any)?.from?.pathname || '/'
    navigate(from, { replace: true })
    return null
  }

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

  // Language toggle
  const toggleLanguage = () => {
    const currentLang = i18n.language
    const newLang = currentLang.startsWith('sr') ? 'en' : 'sr-Latn'
    i18n.changeLanguage(newLang)
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
      if (password.length < 6) {
        toast.error(t('auth.passwordTooShort'))
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        // Sign in with Supabase
        const { user } = await signIn(email, password)
        const authUser = toAuthUser(user)

        setUser({
          id: authUser.id,
          email: authUser.email,
          fullName: authUser.fullName,
          avatarUrl: authUser.avatarUrl,
          createdAt: new Date(),
        })

        toast.success(t('auth.loginSuccess'))
      } else {
        // Sign up with Supabase
        const { user } = await signUp(email, password)

        if (user) {
          const authUser = toAuthUser(user)

          setUser({
            id: authUser.id,
            email: authUser.email,
            fullName: authUser.fullName,
            avatarUrl: authUser.avatarUrl,
            createdAt: new Date(),
          })

          toast.success(t('auth.registerSuccess'))
        }
      }

      // Redirect to the page they tried to visit or home
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (error: any) {
      console.error('Auth error:', error)
      toast.error(error.message || t('auth.authError'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      // Sign in with Google
      await signInWithGoogle()
      // Note: Google OAuth will redirect, so no need to handle response here
      toast.success(t('auth.googleLoginSuccess'))
    } catch (error: any) {
      console.error('Google auth error:', error)
      toast.error(error.message || t('auth.googleAuthError'))
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-blue-600">
          {/* Floating Orbs */}
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="absolute top-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl opacity-20"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, 80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="absolute bottom-20 left-20 w-80 h-80 bg-primary-300 rounded-full blur-3xl opacity-20"
          />
          <motion.div
            animate={{
              x: [0, 60, 0],
              y: [0, -60, 0],
            }}
            transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 w-72 h-72 bg-blue-400 rounded-full blur-3xl opacity-10"
          />
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          <div className="card p-8 backdrop-blur-xl bg-white/95 dark:bg-dark-900/95 border-2 border-white/20 shadow-2xl">
            {/* Logo & Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/50"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-3xl font-black text-dark-900 dark:text-dark-50 mb-2">
                {t('auth.appTitle')}
              </h1>
              <p className="text-dark-600 dark:text-dark-400">
                {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
              </p>
            </motion.div>

            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-dark-100 dark:bg-dark-800 rounded-xl mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                  mode === 'login'
                    ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-md'
                    : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {t('auth.login')}
                </div>
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                  mode === 'register'
                    ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-md'
                    : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
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
                    <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">
                      {t('auth.emailLabel')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                      <input
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
                    <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">
                      {t('auth.passwordLabel')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input pl-12 pr-12"
                        placeholder={t('auth.passwordPlaceholder')}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
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
                      <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">
                        {t('auth.confirmPasswordLabel')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input pl-12"
                          placeholder={t('auth.passwordPlaceholder')}
                          required={mode === 'register'}
                          minLength={6}
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
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
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
                className="btn-primary w-full flex items-center justify-center gap-2 relative overflow-hidden group"
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
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      {t('auth.loading')}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? (
                        <>
                          <LogIn className="w-5 h-5" />
                          {t('auth.loginButton')}
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          {t('auth.registerButton')}
                        </>
                      )}
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-dark-200 dark:bg-dark-700" />
              <span className="text-sm text-dark-500 dark:text-dark-400 font-medium">
                {t('auth.orDivider')}
              </span>
              <div className="flex-1 h-px bg-dark-200 dark:bg-dark-700" />
            </div>

            {/* Google OAuth */}
            <motion.button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-dark-800 border-2 border-dark-200 dark:border-dark-700 rounded-xl font-semibold text-dark-900 dark:text-dark-50 hover:bg-dark-50 dark:hover:bg-dark-700 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <Chrome className="w-5 h-5 text-red-500" />
              {t('auth.continueWithGoogle')}
            </motion.button>

            {/* Demo Account */}
            <motion.button
              type="button"
              onClick={async () => {
                setEmail('demo@fiskalni-racun.app')
                setPassword('demo123')
                setLoading(true)
                try {
                  const { user } = await signIn('demo@fiskalni-racun.app', 'demo123')
                  const authUser = toAuthUser(user)
                  setUser({
                    id: authUser.id,
                    email: authUser.email,
                    fullName: authUser.fullName,
                    avatarUrl: authUser.avatarUrl,
                    createdAt: new Date(),
                  })
                  toast.success(t('auth.demoLoginSuccess'))
                  const from = (location.state as any)?.from?.pathname || '/'
                  navigate(from, { replace: true })
                } catch (error: any) {
                  console.error('Demo login error:', error)
                  toast.error(t('auth.demoLoginError'))
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              {t('auth.tryDemo')}
            </motion.button>

            {/* Date & Time + Language Switcher */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-dark-200 dark:border-dark-700"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Date & Time */}
                <div className="flex items-center gap-4 flex-1">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Calendar className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
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
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Clock className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300 tabular-nums">
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
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold transition-all shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 active:scale-95"
                >
                  <Languages className="w-4.5 h-4.5" />
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
            className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl blur-2xl opacity-50 -z-10"
          />
          <motion.div
            animate={{
              rotate: [360, 0],
            }}
            transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl blur-2xl opacity-50 -z-10"
          />
        </motion.div>
      </div>
    </PageTransition>
  )
}
