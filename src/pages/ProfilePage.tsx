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
  Mail
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { settings, updateSettings, setLanguage, setTheme, user, logout } = useAppStore()

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          {t('profile.title')}
        </h1>
      </div>

      {/* Account Info */}
      <div className="card">
        <h2 className="section-title">{t('profile.account')}</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-dark-900 dark:text-dark-50">
              {user?.email || 'user@example.com'}
            </p>
            <p className="text-sm text-dark-600 dark:text-dark-400">
              {t('profile.email')}
            </p>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-dark-600 dark:text-dark-400" />
          <h3 className="font-semibold text-dark-900 dark:text-dark-50">
            {t('profile.language')}
          </h3>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'sr', label: 'Srpski' },
            { key: 'en', label: 'English' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleLanguageChange(key as 'sr' | 'en')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                i18n.language === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="w-5 h-5 text-dark-600 dark:text-dark-400" />
          <h3 className="font-semibold text-dark-900 dark:text-dark-50">
            {t('profile.theme')}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'system'] as const).map((theme) => {
            const Icon = themeIcons[theme]
            return (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  settings.theme === theme
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{t(`profile.theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-dark-600 dark:text-dark-400" />
          <h3 className="font-semibold text-dark-900 dark:text-dark-50">
            {t('profile.notifications')}
          </h3>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-dark-600 dark:text-dark-400" />
            <span className="text-dark-900 dark:text-dark-50">
              {t('profile.pushNotifications')}
            </span>
          </div>
          <button
            onClick={() => handleToggle('pushNotifications')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.pushNotifications ? 'bg-primary-600' : 'bg-dark-300 dark:bg-dark-600'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.pushNotifications ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-dark-600 dark:text-dark-400" />
            <span className="text-dark-900 dark:text-dark-50">
              {t('profile.emailNotifications')}
            </span>
          </div>
          <button
            onClick={() => handleToggle('emailNotifications')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.emailNotifications ? 'bg-primary-600' : 'bg-dark-300 dark:bg-dark-600'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.emailNotifications ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-dark-600 dark:text-dark-400" />
          <h3 className="font-semibold text-dark-900 dark:text-dark-50">
            {t('profile.privacy')}
          </h3>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-dark-900 dark:text-dark-50">
            {t('profile.appLock')}
          </span>
          <button
            onClick={() => handleToggle('appLock')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.appLock ? 'bg-primary-600' : 'bg-dark-300 dark:bg-dark-600'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.appLock ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-dark-900 dark:text-dark-50">
            {t('profile.biometric')}
          </span>
          <button
            onClick={() => handleToggle('biometric')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.biometric ? 'bg-primary-600' : 'bg-dark-300 dark:bg-dark-600'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.biometric ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-dark-600 dark:text-dark-400" />
            <div>
              <h3 className="font-semibold text-dark-900 dark:text-dark-50">
                {t('profile.exportData')}
              </h3>
              <p className="text-sm text-dark-600 dark:text-dark-400">
                {t('profile.exportDescription')}
              </p>
            </div>
          </div>
          <button
            disabled
            className="btn-secondary opacity-50 cursor-not-allowed"
          >
            {t('profile.comingSoon')}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200 dark:border-red-900/30">
        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-5 h-5" />
          {t('profile.deleteAccount')}
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 btn-secondary"
      >
        <LogOut className="w-5 h-5" />
        {t('profile.logout')}
      </button>
    </div>
  )
}
