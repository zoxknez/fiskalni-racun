import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Award,
  Bell,
  BellOff,
  DollarSign,
  Download,
  Globe,
  Heart,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react'
import { useCallback, useId, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { useDevices, useReceipts } from '@/hooks/useDatabase'
import {
  deleteAccount,
  downloadUserDataArchive,
  downloadUserDataCsv,
  downloadUserDataJson,
} from '@/services/accountService'
import { useAppStore } from '@/store/useAppStore'

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const { settings, updateSettings, setLanguage, setTheme, user, logout } = useAppStore()

  const { scrollY } = useScroll()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'all'>('json')

  const warrantyExpiryThresholdId = useId()
  const warrantyCriticalThresholdId = useId()

  // Stats
  const receipts = useReceipts()
  const devices = useDevices()
  const totalReceipts = receipts?.length || 0
  const totalDevices = devices?.length || 0
  const totalAmount = receipts?.reduce((sum, r) => sum + (r.totalAmount || 0), 0) || 0

  // sigurniji izbor šifre valute (ne oslanjamo se slepo na prevod)
  const currencyCode = (() => {
    const c = String(t('common.currency') || 'RSD')
    return /^[A-Z]{3}$/.test(c) ? c : 'RSD'
  })()

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: currencyCode === 'RSD' ? 0 : 2,
      }).format(value),
    [i18n.language, currencyCode]
  )

  const stats = useMemo(
    () => [
      {
        label: t('profile.totalReceipts'),
        value: totalReceipts,
        icon: Award,
        color: 'from-primary-400 to-primary-300',
      },
      {
        label: t('profile.totalDevices'),
        value: totalDevices,
        icon: Shield,
        color: 'from-primary-500 to-primary-400',
      },
      {
        label: t('profile.totalAmount'),
        value: formatCurrency(totalAmount),
        icon: TrendingUp,
        color: 'from-blue-400 to-primary-500',
      },
    ],
    [formatCurrency, t, totalAmount, totalDevices, totalReceipts]
  )

  // jezički kodovi: i18next koristi 'sr'/'en', DB (drugde u appu) često 'sr-Latn'/'en'
  const handleLanguageChange = (lang: 'sr' | 'en') => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
    try {
      localStorage.setItem('i18nextLng', lang)
    } catch {}
    updateSettings({ language: lang })
    toast.success(t('common.success'))
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme)
    updateSettings({ theme })
    toast.success(t('common.success'))
  }

  // generički toggle za boolean polja u settings
  const handleToggle = <K extends keyof typeof settings>(key: K) => {
    const next = !settings[key]
    updateSettings({ [key]: next } as Partial<typeof settings>)
    toast.success(t('common.success'))
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(String(t('profile.deleteAccountConfirm')))
    if (!confirmed) return
    const doubleConfirm = window.confirm(String(t('profile.deleteAccountConfirm')))
    if (!doubleConfirm) return

    setIsDeleting(true)
    try {
      const result = await deleteAccount(user?.id || '')
      if (result.success) {
        toast.success(t('common.success'))
        try {
          // odjava + sklanjanje lokalnih podataka je dobra praksa posle brisanja naloga
          await logout()
          // best-effort čišćenje PWA keševa
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k)))
          }
        } finally {
          navigate('/')
        }
      } else {
        toast.error(result.error || (t('common.error') as string))
      }
    } catch {
      toast.error(t('common.error'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportData = async () => {
    if (!user?.id) {
      toast.error(t('auth.authError'))
      return
    }

    setIsExporting(true)
    const dateSuffix = new Date().toISOString().split('T')[0]
    const baseFilename = `fiskalni-racun-${dateSuffix}`

    try {
      if (exportFormat === 'json') {
        await downloadUserDataJson(user.id, { filename: baseFilename })
      } else if (exportFormat === 'csv') {
        await downloadUserDataCsv(user.id, { filename: `${baseFilename}-csv` })
      } else {
        await downloadUserDataArchive(user.id, {
          filename: `${baseFilename}-bundle`,
          includeJson: true,
          includeCsv: true,
        })
      }
      toast.success(t('common.success'))
    } catch (error) {
      console.error('Data export failed', error)
      toast.error(t('common.error'))
    } finally {
      setIsExporting(false)
    }
  }

  const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const

  // Parallax efekti
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const heroScale = useTransform(scrollY, [0, 200], [1, 0.95])

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Hero Section */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-400 p-8 text-white"
        >
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>

          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            className="absolute top-10 right-10 h-32 w-32 rounded-full bg-white blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
            className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-primary-300 blur-3xl"
          />

          <div className="relative z-10">
            <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 shadow-2xl backdrop-blur-sm"
                >
                  <UserIcon className="h-10 w-10 text-white" />
                </motion.div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-bold text-4xl"
                  >
                    {t('profile.title')}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="break-all text-lg text-white/80"
                  >
                    {user?.email || 'user@example.com'}
                  </motion.p>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-shrink-0 self-start rounded-2xl bg-white/10 p-2 backdrop-blur-sm sm:self-auto sm:p-3"
              >
                <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={String(stat.label)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm" />
                  <div className="relative p-3 sm:p-4">
                    <div className="mb-2 flex items-start justify-between gap-1">
                      <span className="flex-1 break-words font-medium text-white/70 text-xs leading-tight sm:text-sm">
                        {stat.label}
                      </span>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{
                          duration: 20,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'linear',
                        }}
                        className={`bg-gradient-to-br p-1.5 sm:p-2 ${stat.color} flex-shrink-0 rounded-xl`}
                      >
                        <stat.icon className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                      </motion.div>
                    </div>
                    <div className="break-words font-bold text-xl sm:text-2xl">{stat.value}</div>
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
          className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
              <Globe className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
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
                className={`flex-1 rounded-xl px-4 py-3 font-semibold transition-all duration-300 ${
                  i18n.language.startsWith(key)
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-dark-50 text-dark-700 hover:bg-dark-100 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600'
                }`}
                aria-pressed={i18n.language.startsWith(key)}
              >
                <span className="mb-1 text-2xl" aria-hidden>
                  {flag}
                </span>
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
          className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
              <Moon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
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
                  className={`flex flex-col items-center gap-2 rounded-xl px-4 py-4 font-semibold transition-all duration-300 ${
                    settings.theme === theme
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-dark-50 text-dark-700 hover:bg-dark-100 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600'
                  }`}
                  aria-pressed={settings.theme === theme}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs capitalize">{theme}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Notifications (master + kanali) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
              <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
              {t('profile.notifications')}
            </h3>
          </div>

          {/* master toggle */}
          <div className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-dark-50 dark:hover:bg-dark-700">
            <div className="flex items-center gap-3">
              <BellOff className="h-5 w-5 text-dark-600 dark:text-dark-400" />
              <span className="font-medium text-dark-900 dark:text-dark-50">
                {t('profile.notificationsEnabled')}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToggle('notificationsEnabled')}
              role="switch"
              aria-checked={!!settings.notificationsEnabled}
              aria-label={String(t('profile.notificationsEnabled'))}
              className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${
                settings.notificationsEnabled ? 'bg-primary-500' : 'bg-dark-300 dark:bg-dark-600'
              }`}
            >
              <motion.div
                animate={{ x: settings.notificationsEnabled ? 28 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg"
              />
            </motion.button>
          </div>

          {[
            {
              key: 'pushNotifications' as const,
              label: t('profile.pushNotifications'),
              icon: Bell,
            },
            {
              key: 'emailNotifications' as const,
              label: t('profile.emailNotifications'),
              icon: Mail,
            },
          ].map((item) => (
            <motion.div
              key={item.key}
              whileHover={{ x: 5 }}
              className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-dark-50 dark:hover:bg-dark-700"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-dark-600 dark:text-dark-400" />
                <span className="font-medium text-dark-900 dark:text-dark-50">{item.label}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleToggle(item.key)}
                role="switch"
                aria-checked={!!settings[item.key]}
                aria-label={String(item.label)}
                className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${
                  settings[item.key] ? 'bg-primary-500' : 'bg-dark-300 dark:bg-dark-600'
                }`}
                disabled={!settings.notificationsEnabled}
                title={
                  !settings.notificationsEnabled
                    ? String(t('profile.notificationsDisabledHint'))
                    : undefined
                }
              >
                <motion.div
                  animate={{ x: settings[item.key] ? 28 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg"
                />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>

        {/* Warranty notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2 dark:bg-amber-900/20">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
              {t('profile.warrantyAlerts')}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor={warrantyExpiryThresholdId}
                className="block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('profile.warrantyExpiryThreshold')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={warrantyExpiryThresholdId}
                  type="range"
                  min="7"
                  max="90"
                  step="1"
                  value={settings.warrantyExpiryThreshold || 30}
                  onChange={(e) =>
                    updateSettings({ warrantyExpiryThreshold: Number(e.target.value) })
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-dark-200 accent-amber-500 dark:bg-dark-700"
                />
                <span className="min-w-[4rem] rounded-lg bg-amber-100 px-3 py-1 text-center font-semibold text-dark-900 dark:bg-amber-900/20 dark:text-dark-50">
                  {t('common.days', { count: settings.warrantyExpiryThreshold || 30 })}
                </span>
              </div>
              <p className="text-dark-500 text-xs dark:text-dark-500">
                {t('profile.warrantyExpiryThresholdDesc')}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={warrantyCriticalThresholdId}
                className="block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('profile.warrantyCriticalThreshold')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={warrantyCriticalThresholdId}
                  type="range"
                  min="1"
                  max="14"
                  step="1"
                  value={settings.warrantyCriticalThreshold || 7}
                  onChange={(e) =>
                    updateSettings({ warrantyCriticalThreshold: Number(e.target.value) })
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-dark-200 accent-red-500 dark:bg-dark-700"
                />
                <span className="min-w-[4rem] rounded-lg bg-red-100 px-3 py-1 text-center font-semibold text-dark-900 dark:bg-red-900/20 dark:text-dark-50">
                  {t('common.days', { count: settings.warrantyCriticalThreshold || 7 })}
                </span>
              </div>
              <p className="text-dark-500 text-xs dark:text-dark-500">
                {t('profile.warrantyCriticalThresholdDesc')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Privacy – usklađeno sa DB ključem biometricLock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/20">
              <Lock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
              {t('profile.privacy')}
            </h3>
          </div>

          <motion.div
            whileHover={{ x: 5 }}
            className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-dark-50 dark:hover:bg-dark-700"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-dark-600 dark:text-dark-400" />
              <span className="font-medium text-dark-900 dark:text-dark-50">
                {t('profile.biometric')}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToggle('biometricLock')}
              role="switch"
              aria-checked={!!settings.biometricLock}
              aria-label={String(t('profile.biometric'))}
              className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${
                settings.biometricLock ? 'bg-primary-500' : 'bg-dark-300 dark:bg-dark-600'
              }`}
            >
              <motion.div
                animate={{ x: settings.biometricLock ? 28 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg"
              />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Export Data (sa izborom formata) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary-100 p-3 dark:bg-primary-900/20">
                <Download className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-900 text-lg dark:text-dark-50">
                  {t('profile.exportData')}
                </h3>
                <p className="text-dark-600 text-sm dark:text-dark-400">
                  {t('profile.exportDescription')}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-xl bg-dark-100 p-1 sm:flex dark:bg-dark-700">
              {[
                { k: 'json' as const, label: 'JSON' },
                { k: 'csv' as const, label: 'CSV' },
                { k: 'all' as const, label: 'ZIP' },
              ].map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setExportFormat(opt.k)}
                  className={`rounded-lg px-3 py-1.5 font-semibold text-sm transition ${
                    exportFormat === opt.k
                      ? 'bg-primary-500 text-white'
                      : 'text-dark-700 hover:bg-dark-200/60 dark:text-dark-200 dark:hover:bg-dark-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportData}
              disabled={isExporting}
              className="rounded-xl bg-primary-500 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-600 disabled:bg-dark-300"
            >
              {isExporting ? t('common.loading') : t('profile.export')}
            </motion.button>
          </div>

          {/* Mobile format picker */}
          <div className="sm:hidden">
            <label className="mb-1 block text-dark-600 text-sm dark:text-dark-400">
              {t('profile.exportFormat')}
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'all')}
              className="input"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="all">ZIP (JSON+CSV)</option>
            </select>
          </div>
        </motion.div>

        {/* Donate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-lg dark:border-blue-700 dark:from-blue-900/20 dark:to-indigo-900/20"
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="flex-shrink-0 rounded-xl bg-blue-500 p-3 shadow-lg dark:bg-blue-600">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 flex flex-wrap items-center gap-2 font-bold text-dark-900 text-xl dark:text-dark-50">
                {t('about.donate.title')}
                <Heart className="h-5 w-5 animate-pulse text-red-500" />
              </h3>
              <p className="mb-4 text-dark-700 dark:text-dark-200">
                {t('about.donate.description')}
              </p>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://www.paypal.com/paypalme/o0o0o0o0o0o0o"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-bold text-white shadow-blue-500/40 shadow-xl transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-2xl hover:shadow-blue-500/50"
              >
                <DollarSign className="h-5 w-5" />
                <span>{t('about.donate.button')}</span>
              </motion.a>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-500 px-6 py-4 font-semibold text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-600 disabled:bg-red-300"
          >
            <Trash2 className="h-5 w-5" />
            {isDeleting ? t('common.loading') : t('profile.deleteAccount')}
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
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 font-semibold text-dark-900 shadow-lg transition-colors hover:bg-dark-50 dark:bg-dark-800 dark:text-dark-50 dark:hover:bg-dark-700"
        >
          <LogOut className="h-5 w-5" />
          {t('profile.logout')}
        </motion.button>
      </div>
    </PageTransition>
  )
}
