import { useTranslation } from 'react-i18next'
import { 
  User as UserIcon, 
  Globe, 
  Moon, 
  Sun, 
  Monitor,
  Bell,
  Lock,
  Download,
  Trash2,
  LogOut,
  Mail,
  Settings as SettingsIcon,
  Shield,
  TrendingUp,
  Award
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useReceipts, useDevices } from '@/hooks/useDatabase'
import toast from 'react-hot-toast'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PageTransition } from '../components/common/PageTransition'

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { settings, updateSettings, setLanguage, setTheme, user, logout } = useAppStore()
  const { scrollY } = useScroll()
  
  // Get stats
  const receipts = useReceipts()
  const devices = useDevices()
  const totalReceipts = receipts?.length || 0
  const totalDevices = devices?.length || 0
  const totalAmount = receipts?.reduce((sum, r) => sum + (r.totalAmount || 0), 0) || 0

  const handleLanguageChange = (lang: 'sr' | 'en') => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    toast.success(t('common.success'))
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme)
    toast.success(t('common.success'))
  }

  const handleToggle = (key: keyof typeof settings) => {
    updateSettings({ [key]: !settings[key] })
    toast.success(t('common.success'))
  }

  const handleDeleteAccount = () => {
    if (window.confirm(t('profile.deleteAccountConfirm'))) {
      // TODO: Delete account
      logout()
      toast.success(t('common.success'))
    }
  }

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }
  
  // Parallax effects
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const heroScale = useTransform(scrollY, [0, 200], [1, 0.95])

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Section */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-400 p-8 text-white"
        >
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>

          {/* Floating orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute bottom-10 left-10 w-40 h-40 bg-primary-300 rounded-full blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl"
                >
                  <UserIcon className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-bold"
                  >
                    {t('profile.title')}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/80 text-lg"
                  >
                    {user?.email || 'user@example.com'}
                  </motion.p>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-2xl flex-shrink-0"
              >
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { label: t('profile.totalReceipts'), value: totalReceipts, icon: Award, color: 'from-primary-400 to-primary-300' },
                { label: t('profile.totalDevices'), value: totalDevices, icon: Shield, color: 'from-primary-500 to-primary-400' },
                { label: t('profile.totalAmount'), value: `${(totalAmount / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'from-blue-400 to-primary-500' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl backdrop-blur-sm" />
                  <div className="relative p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-xs sm:text-sm font-medium truncate pr-2">{stat.label}</span>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className={`p-1.5 sm:p-2 bg-gradient-to-br ${stat.color} rounded-xl flex-shrink-0`}
                      >
                        <stat.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </motion.div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold truncate">{stat.value}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Language */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
              <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
              {t('profile.language')}
            </h3>
          </div>
          <div className="flex gap-3">
            {[
              { key: 'sr', label: t('profile.serbian'), flag: '🇷🇸' },
              { key: 'en', label: t('profile.english'), flag: '🇬🇧' },
            ].map(({ key, label, flag }) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleLanguageChange(key as 'sr' | 'en')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  i18n.language === key
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-dark-50 dark:bg-dark-700 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-600'
                }`}
              >
                <span className="text-2xl mb-1">{flag}</span>
                <div className="text-sm">{label}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Theme */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
              <Moon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
              {t('profile.theme')}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((theme) => {
              const Icon = themeIcons[theme]
              return (
                <motion.button
                  key={theme}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleThemeChange(theme)}
                  className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl font-semibold transition-all duration-300 ${
                    settings.theme === theme
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-dark-50 dark:bg-dark-700 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-600'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs capitalize">{theme}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg space-y-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
              <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
              {t('profile.notifications')}
            </h3>
          </div>

          {[
            { key: 'pushNotifications' as const, label: t('profile.pushNotifications'), icon: Bell },
            { key: 'emailNotifications' as const, label: t('profile.emailNotifications'), icon: Mail },
          ].map((item) => (
            <motion.div
              key={item.key}
              whileHover={{ x: 5 }}
              className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-dark-600 dark:text-dark-400" />
                <span className="font-medium text-dark-900 dark:text-dark-50">
                  {item.label}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleToggle(item.key)}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                  settings[item.key] ? 'bg-primary-500' : 'bg-dark-300 dark:bg-dark-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings[item.key] ? 28 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg space-y-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
              <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
              {t('profile.privacy')}
            </h3>
          </div>

          {[
            { key: 'appLock' as const, label: t('profile.appLock'), icon: Lock },
            { key: 'biometric' as const, label: t('profile.biometric'), icon: Shield },
          ].map((item) => (
            <motion.div
              key={item.key}
              whileHover={{ x: 5 }}
              className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-dark-600 dark:text-dark-400" />
                <span className="font-medium text-dark-900 dark:text-dark-50">
                  {item.label}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleToggle(item.key)}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                  settings[item.key] ? 'bg-primary-500' : 'bg-dark-300 dark:bg-dark-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings[item.key] ? 28 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>

        {/* Export Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                <Download className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                  {t('profile.exportData')}
                </h3>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  {t('profile.exportDescription')}
                </p>
              </div>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-dark-100 dark:bg-dark-700 text-dark-400 dark:text-dark-500 rounded-xl font-medium cursor-not-allowed"
            >
              {t('profile.comingSoon')}
            </button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-900/30 rounded-2xl p-6"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDeleteAccount}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-500/30"
          >
            <Trash2 className="w-5 h-5" />
            {t('profile.deleteAccount')}
          </motion.button>
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-900 dark:text-dark-50 rounded-xl font-semibold transition-colors shadow-lg"
        >
          <LogOut className="w-5 h-5" />
          {t('profile.logout')}
        </motion.button>
      </div>
    </PageTransition>
  )
}
