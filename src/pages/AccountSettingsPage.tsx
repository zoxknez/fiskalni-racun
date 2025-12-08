/**
 * Account Settings Page
 *
 * User profile management with:
 * - Profile editing
 * - Password change
 * - Account deletion
 * - Data export
 *
 * @module pages/AccountSettingsPage
 */

import { db } from '@lib/db'
import { cn } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Lock,
  Save,
  Settings,
  Shield,
  Trash2,
  User,
} from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useNeonAuth } from '@/hooks/useNeonAuth'
import { useTheme } from '@/store/useAppStore'

type TabType = 'profile' | 'password' | 'danger'

export default function AccountSettingsPage() {
  const { t } = useTranslation()
  const { user, changePassword, deleteAccount, updateProfile } = useNeonAuth()
  const theme = useTheme()
  const isDark = theme === 'dark'

  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [isLoading, setIsLoading] = useState(false)

  // Form IDs
  const formId = useId()
  const fullNameId = `${formId}-fullName`
  const currentPasswordId = `${formId}-currentPassword`
  const newPasswordId = `${formId}-newPassword`
  const confirmPasswordId = `${formId}-confirmPassword`
  const deletePasswordId = `${formId}-deletePassword`

  // Profile form state
  const [fullName, setFullName] = useState(user?.fullName ?? '')

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await updateProfile({ fullName })

    if (result.success) {
      toast.success(t('neonAuth.updateProfileSuccess'))
    } else {
      toast.error(result.error ?? t('neonAuth.updateProfileError'))
    }

    setIsLoading(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmNewPassword) {
      toast.error(t('neonAuth.passwordsDoNotMatch'))
      return
    }

    if (newPassword.length < 8) {
      toast.error(t('neonAuth.passwordTooShort'))
      return
    }

    setIsLoading(true)

    const result = await changePassword(currentPassword, newPassword)

    if (result.success) {
      toast.success(t('neonAuth.changePasswordSuccess'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } else {
      toast.error(result.error ?? t('neonAuth.changePasswordError'))
    }

    setIsLoading(false)
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!confirmDelete) {
      toast.error(t('neonAuth.deleteAccountConfirm'))
      return
    }

    setIsLoading(true)

    const result = await deleteAccount(deletePassword)

    if (result.success) {
      toast.success(t('neonAuth.deleteAccountSuccess'))
      // Navigation handled by hook
    } else {
      toast.error(result.error ?? t('neonAuth.deleteAccountError'))
    }

    setIsLoading(false)
  }

  const handleExportData = async () => {
    setIsLoading(true)

    try {
      // Get all user data from IndexedDB
      const receipts = await db.receipts.toArray()
      const devices = await db.devices.toArray()
      const householdBills = await db.householdBills.toArray()
      const documents = await db.documents.toArray()

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          email: user?.email,
          fullName: user?.fullName,
        },
        data: {
          receipts,
          devices,
          householdBills,
          documents,
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fiskalni-racun-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(t('neonAuth.exportDataSuccess'))
    } catch {
      toast.error('Failed to export data')
    }

    setIsLoading(false)
  }

  const tabs = [
    { id: 'profile' as const, icon: User, label: t('neonAuth.updateProfile') },
    { id: 'password' as const, icon: Lock, label: t('neonAuth.changePassword') },
    { id: 'danger' as const, icon: AlertTriangle, label: t('neonAuth.deleteAccount') },
  ]

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col',
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      )}
    >
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-50 border-b px-4 py-4',
          isDark ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Link
            to="/profile"
            className={cn(
              'rounded-lg p-2 transition-colors',
              isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            )}
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <h1 className="font-semibold text-lg">{t('neonAuth.accountSettings')}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {/* Tabs */}
          <div
            className={cn(
              'mb-6 flex gap-2 overflow-x-auto rounded-xl p-1',
              isDark ? 'bg-gray-800' : 'bg-gray-200'
            )}
          >
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 font-medium text-xs transition-all sm:gap-2 sm:px-4 sm:text-sm',
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-gray-700 text-white shadow'
                      : 'bg-white text-gray-900 shadow'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={cn(
                    'rounded-2xl border p-6',
                    isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-white'
                  )}
                >
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-xl">{user?.fullName || user?.email}</h2>
                      <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label
                        htmlFor={fullNameId}
                        className={cn(
                          'mb-1 block font-medium text-sm',
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        )}
                      >
                        {t('neonAuth.fullNameLabel')}
                      </label>
                      <input
                        id={fullNameId}
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={cn(
                          'w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                          isDark
                            ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                        )}
                        placeholder={t('neonAuth.fullNamePlaceholder')}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? t('common.loading') : t('common.save')}
                    </button>
                  </form>

                  {/* Export Data */}
                  <div className="mt-6 border-gray-700 border-t pt-6">
                    <h3 className="mb-2 font-medium">{t('neonAuth.exportData')}</h3>
                    <p className={cn('mb-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      {t('neonAuth.exportDataDescription')}
                    </p>
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={isLoading}
                      className={cn(
                        'flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 font-medium transition-colors',
                        isDark
                          ? 'border-gray-700 hover:bg-gray-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <Download className="h-4 w-4" />
                      {t('neonAuth.exportDataButton')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={cn(
                    'rounded-2xl border p-6',
                    isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-white'
                  )}
                >
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                      <Shield className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{t('neonAuth.changePassword')}</h2>
                      <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {t('neonAuth.passwordTooShort')}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {/* Current Password */}
                    <div>
                      <label
                        htmlFor={currentPasswordId}
                        className={cn(
                          'mb-1 block font-medium text-sm',
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        )}
                      >
                        {t('neonAuth.currentPassword')}
                      </label>
                      <div className="relative">
                        <input
                          id={currentPasswordId}
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={cn(
                            'w-full rounded-lg border px-4 py-3 pr-12 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                            isDark
                              ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500'
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                          )}
                          placeholder={t('neonAuth.currentPasswordPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400"
                          aria-label={
                            showCurrentPassword
                              ? t('neonAuth.hidePassword')
                              : t('neonAuth.showPassword')
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label
                        htmlFor={newPasswordId}
                        className={cn(
                          'mb-1 block font-medium text-sm',
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        )}
                      >
                        {t('neonAuth.newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          id={newPasswordId}
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={cn(
                            'w-full rounded-lg border px-4 py-3 pr-12 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                            isDark
                              ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500'
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                          )}
                          placeholder={t('neonAuth.newPasswordPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400"
                          aria-label={
                            showNewPassword
                              ? t('neonAuth.hidePassword')
                              : t('neonAuth.showPassword')
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label
                        htmlFor={confirmPasswordId}
                        className={cn(
                          'mb-1 block font-medium text-sm',
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        )}
                      >
                        {t('neonAuth.confirmNewPassword')}
                      </label>
                      <input
                        id={confirmPasswordId}
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className={cn(
                          'w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                          isDark
                            ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                        )}
                        placeholder={t('neonAuth.confirmNewPasswordPlaceholder')}
                      />
                    </div>

                    {/* Password Match Indicator */}
                    {newPassword && confirmNewPassword && (
                      <div className="flex items-center gap-2 text-sm">
                        {newPassword === confirmNewPassword ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-green-500">Passwords match</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-red-500">
                              {t('neonAuth.passwordsDoNotMatch')}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        isLoading || !currentPassword || !newPassword || !confirmNewPassword
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Lock className="h-4 w-4" />
                      {isLoading ? t('common.loading') : t('neonAuth.changePassword')}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <motion.div
                key="danger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg text-red-500">
                        {t('neonAuth.deleteAccountTitle')}
                      </h2>
                      <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {t('neonAuth.deleteAccountWarning')}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <div>
                      <label
                        htmlFor={deletePasswordId}
                        className={cn(
                          'mb-1 block font-medium text-sm',
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        )}
                      >
                        {t('neonAuth.deleteAccountConfirm')}
                      </label>
                      <div className="relative">
                        <input
                          id={deletePasswordId}
                          type={showDeletePassword ? 'text' : 'password'}
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          className={cn(
                            'w-full rounded-lg border px-4 py-3 pr-12 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500',
                            isDark
                              ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500'
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                          )}
                          placeholder={t('neonAuth.passwordPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowDeletePassword(!showDeletePassword)}
                          className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400"
                          aria-label={
                            showDeletePassword
                              ? t('neonAuth.hidePassword')
                              : t('neonAuth.showPassword')
                          }
                        >
                          {showDeletePassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={confirmDelete}
                        onChange={(e) => setConfirmDelete(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm">{t('neonAuth.deleteAccountWarning')}</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoading || !deletePassword || !confirmDelete}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isLoading ? t('common.loading') : t('neonAuth.deleteAccountButton')}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
