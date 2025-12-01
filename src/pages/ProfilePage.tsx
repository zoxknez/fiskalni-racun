import { motion } from 'framer-motion'
import {
  AlertCircle,
  Award,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Globe,
  Info,
  Loader2,
  Lock,
  LogOut,
  type LucideIcon,
  Mail,
  Monitor,
  Moon,
  Send,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react'
import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { useDevices, useReceipts } from '@/hooks/useDatabase'
import { useScrollAnimations } from '@/hooks/useOptimizedScroll'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { deleteAccount } from '@/services/accountService'
import { useAppStore } from '@/store/useAppStore'

function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const { settings, updateSettings, setLanguage, setTheme, user, logout } = useAppStore()

  // ⚠️ MEMORY OPTIMIZED: Using useScrollAnimations prevents memory leaks in E2E tests
  const { heroOpacity, heroScale } = useScrollAnimations()
  const [isDeleting, setIsDeleting] = useState(false)

  const warrantyExpiryThresholdId = useId()
  const warrantyCriticalThresholdId = useId()

  const pushNotificationsController = usePushNotifications({
    notificationsEnabled: settings.notificationsEnabled,
    pushNotifications: settings.pushNotifications,
    updateSettings,
    ...(user?.id ? { userId: user.id } : {}),
  })

  const {
    pushSupported,
    notificationPermission,
    pushError,
    isPushProcessing,
    isSendingTest,
    isPushStateLoading,
    togglePush,
    sendTest,
    ensureUnsubscribed,
    resetPushError,
  } = pushNotificationsController

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

  useEffect(() => {
    resetPushError()
  }, [resetPushError])

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

  const handleNotificationsMasterToggle = async () => {
    const next = !settings.notificationsEnabled
    let hadError = false
    let disableToastShown = false

    if (!next && settings.pushNotifications) {
      const outcome = await ensureUnsubscribed()
      if (outcome.status === 'error') {
        toast.error(outcome.error)
        hadError = true
      } else if (outcome.status === 'unsupported') {
        toast.error(t('profile.pushNotSupported'))
        hadError = true
      } else if (outcome.status === 'success') {
        toast.success(t('profile.pushUnsubscribed'))
        disableToastShown = true
      }
    }

    updateSettings({ notificationsEnabled: next })

    if (next) {
      resetPushError()
      toast.success(t('common.success'))
    } else if (!hadError && !disableToastShown) {
      toast.success(t('common.success'))
    }
  }

  const handlePushToggle = async () => {
    const wasEnabled = settings.pushNotifications
    const outcome = await togglePush()

    switch (outcome.status) {
      case 'unsupported':
        toast.error(t('profile.pushNotSupported'))
        return
      case 'notifications_disabled':
        toast.error(t('profile.notificationsDisabledHint'))
        return
      case 'permission_blocked':
        toast.error(t('profile.pushPermissionDeniedHint'))
        return
      case 'subscribed':
        toast.success(t('profile.pushSubscribed'))
        return
      case 'unsubscribed':
        toast.success(t('profile.pushUnsubscribed'))
        return
      case 'error': {
        const fallback = wasEnabled
          ? String(t('profile.pushUnsubscribeError'))
          : String(t('profile.pushSubscribeError'))
        toast.error(outcome.error || fallback)
        return
      }
      default:
        return
    }
  }

  const handleSendTestNotification = async () => {
    const outcome = await sendTest()

    switch (outcome.status) {
      case 'unsupported':
        toast.error(t('profile.pushNotSupported'))
        return
      case 'busy':
        return
      case 'not_enabled': {
        const message = !settings.notificationsEnabled
          ? String(t('profile.notificationsDisabledHint'))
          : settings.pushNotifications
            ? String(t('profile.pushPermissionPrompt'))
            : String(t('profile.pushEnableNotifications'))
        toast.error(message)
        return
      }
      case 'permission_blocked':
        toast.error(t('profile.pushPermissionDeniedHint'))
        return
      case 'sent':
        toast.success(t('profile.pushTestSuccess'))
        return
      case 'error':
        toast.error(outcome.error || String(t('profile.pushTestError')))
        return
    }
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

  const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const
  const themeLabels = {
    light: t('profile.themeLight'),
    dark: t('profile.themeDark'),
    system: t('profile.themeSystem'),
  } as const

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
            className="absolute top-10 right-10 h-32 w-32 rounded-full bg-white blur-2xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
            className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-primary-300 blur-2xl"
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
                  <span className="text-xs">{themeLabels[theme]}</span>
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
              onClick={() => {
                if (isPushProcessing || isPushStateLoading) return
                handleNotificationsMasterToggle()
              }}
              role="switch"
              aria-checked={!!settings.notificationsEnabled}
              aria-label={String(t('profile.notificationsEnabled'))}
              disabled={isPushProcessing || isPushStateLoading}
              title={
                isPushProcessing || isPushStateLoading ? String(t('common.loading')) : undefined
              }
              className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${
                settings.notificationsEnabled ? 'bg-primary-500' : 'bg-dark-300 dark:bg-dark-600'
              } ${isPushProcessing || isPushStateLoading ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <motion.div
                animate={{ x: settings.notificationsEnabled ? 28 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg"
              />
            </motion.button>
          </div>

          {isPushStateLoading ? (
            <div className="space-y-3">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="flex animate-pulse items-center justify-between rounded-xl bg-dark-50/70 px-4 py-3 dark:bg-dark-700/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-dark-200 dark:bg-dark-600" />
                    <div className="h-3 w-28 rounded-full bg-dark-200 dark:bg-dark-600" />
                  </div>
                  <div className="h-5 w-12 rounded-full bg-dark-200 dark:bg-dark-600" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {[
                {
                  key: 'pushNotifications' as const,
                  label: t('profile.pushNotifications'),
                  icon: Bell,
                  onToggle: () => handlePushToggle(),
                  disabled:
                    !settings.notificationsEnabled ||
                    !pushSupported ||
                    isPushProcessing ||
                    isPushStateLoading,
                },
                {
                  key: 'emailNotifications' as const,
                  label: t('profile.emailNotifications'),
                  icon: Mail,
                  onToggle: () => handleToggle('emailNotifications'),
                  disabled: !settings.notificationsEnabled,
                },
              ].map((channel) => {
                const Icon = channel.icon as LucideIcon
                const isActive = settings[channel.key]
                const isDisabled = channel.disabled
                let disabledTitle: string | undefined
                if (isDisabled) {
                  if (channel.key === 'pushNotifications') {
                    if (!settings.notificationsEnabled) {
                      disabledTitle = String(t('profile.notificationsDisabledHint'))
                    } else if (!pushSupported) {
                      disabledTitle = String(t('profile.pushNotSupported'))
                    } else if (isPushProcessing) {
                      disabledTitle = String(t('common.loading'))
                    }
                  } else {
                    disabledTitle = String(t('profile.notificationsDisabledHint'))
                  }
                }

                return (
                  <motion.div
                    key={channel.key}
                    whileHover={{ x: 5 }}
                    className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-dark-50 dark:hover:bg-dark-700"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-dark-600 dark:text-dark-400" />
                      <span className="font-medium text-dark-900 dark:text-dark-50">
                        {channel.label}
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (isDisabled) return
                        channel.onToggle()
                      }}
                      role="switch"
                      aria-checked={!!isActive}
                      aria-label={String(channel.label)}
                      disabled={isDisabled}
                      title={disabledTitle}
                      className={`relative h-7 w-14 rounded-full transition-colors duration-300 ${
                        isActive ? 'bg-primary-500' : 'bg-dark-300 dark:bg-dark-600'
                      } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <motion.div
                        animate={{ x: isActive ? 28 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg"
                      />
                    </motion.button>
                  </motion.div>
                )
              })}

              <div className="space-y-2 text-sm">
                {!pushSupported && (
                  <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t('profile.pushNotSupported')}</span>
                  </p>
                )}
                {pushSupported && notificationPermission === 'denied' && (
                  <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t('profile.pushPermissionDeniedHint')}</span>
                  </p>
                )}
                {pushError && (
                  <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{pushError}</span>
                  </p>
                )}
                {pushSupported &&
                  notificationPermission === 'default' &&
                  !settings.pushNotifications &&
                  !pushError && (
                    <p className="flex items-center gap-2 text-dark-600 dark:text-dark-300">
                      <Info className="h-4 w-4" />
                      <span>{t('profile.pushPermissionPrompt')}</span>
                    </p>
                  )}
                {pushSupported &&
                  settings.pushNotifications &&
                  notificationPermission === 'granted' &&
                  !pushError && (
                    <p className="flex items-center gap-2 text-green-600 dark:text-green-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t('profile.pushActiveStatus')}</span>
                    </p>
                  )}
              </div>

              {pushSupported &&
                settings.pushNotifications &&
                notificationPermission === 'granted' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => handleSendTestNotification()}
                    disabled={isSendingTest}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-4 py-2 font-medium text-primary-700 transition-colors hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:hover:bg-primary-900/50"
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.loading')}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t('profile.pushTest')}
                      </>
                    )}
                  </motion.button>
                )}
            </>
          )}
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

        {/* Account Settings Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <Link
            to="/profile/settings"
            className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white shadow-blue-500/20 shadow-lg transition-all hover:shadow-blue-500/30 hover:shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white/20 p-3">
                <SettingsIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('neonAuth.accountSettings')}</h3>
                <p className="text-sm text-white/80">
                  {t('neonAuth.changePassword')}, {t('neonAuth.exportData')}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Link>
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

// ⭐ OPTIMIZED: Memoize component to prevent unnecessary re-renders
export default memo(ProfilePage)
