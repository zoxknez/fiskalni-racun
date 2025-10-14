import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus,
  Sparkles,
  Shield,
  Zap,
  Chrome
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { PageTransition } from '@/components/common/PageTransition'

type AuthMode = 'login' | 'register'

export default function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setUser } = useAppStore()
  
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock successful auth
      setUser({
        id: '1',
        email,
        createdAt: new Date(),
      })
      
      toast.success(mode === 'login' ? t('auth.loginSuccess') : t('auth.registerSuccess'))
      navigate('/')
    } catch (error) {
      toast.error(t('auth.authError'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      // Simulate Google OAuth
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setUser({
        id: '1',
        email: 'user@gmail.com',
        createdAt: new Date(),
      })
      
      toast.success(t('auth.googleLoginSuccess'))
      navigate('/')
    } catch (error) {
      toast.error(t('auth.googleAuthError'))
    } finally {
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
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl opacity-20"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, 80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-20 left-20 w-80 h-80 bg-primary-300 rounded-full blur-3xl opacity-20"
          />
          <motion.div
            animate={{
              x: [0, 60, 0],
              y: [0, -60, 0],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
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
                transition={{ duration: 3, repeat: Infinity }}
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
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
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
                    repeat: loading ? Infinity : 0,
                    ease: 'linear',
                  }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Zap className="w-5 h-5" />
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
              <span className="text-sm text-dark-500 dark:text-dark-400 font-medium">{t('auth.orDivider')}</span>
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

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-dark-200 dark:border-dark-700"
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { icon: Shield, label: t('auth.featureSecure'), color: 'text-green-500' },
                  { icon: Zap, label: t('auth.featureFast'), color: 'text-yellow-500' },
                  { icon: Sparkles, label: t('auth.featureModern'), color: 'text-purple-500' },
                ].map((feature, index) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <span className="text-xs font-medium text-dark-600 dark:text-dark-400">
                      {feature.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl blur-2xl opacity-50 -z-10"
          />
          <motion.div
            animate={{
              rotate: [360, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl blur-2xl opacity-50 -z-10"
          />
        </motion.div>
      </div>
    </PageTransition>
  )
}
