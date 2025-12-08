import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  Crown,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { useAppStore } from '@/store/useAppStore'

interface AdminUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  email_verified: boolean
  is_active: boolean
  is_admin: boolean
  created_at: string
  updated_at?: string
  last_login_at?: string
  receipt_count?: number
  active_sessions?: number
}

interface AdminStats {
  users: {
    total_users: number
    active_users: number
    admin_users: number
    verified_users: number
    new_users_7d: number
    new_users_30d: number
  }
  receipts: {
    total_receipts: number
    receipts_7d: number
    receipts_30d: number
    total_amount: number
  }
  sessions: {
    active_sessions: number
  }
  activeToday: {
    active_today: number
  }
}

function AdminPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAppStore()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview')

  const token = localStorage.getItem('neon_auth_token')

  // Check admin access
  useEffect(() => {
    if (!user?.is_admin) {
      toast.error(t('admin.accessDenied', 'Access denied. Admin privileges required.'))
      navigate('/')
    }
  }, [user, navigate, t])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return

    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data.stats)
      setRecentUsers(data.recentUsers || [])
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
      toast.error(t('admin.fetchError', 'Failed to load admin data'))
    } finally {
      setLoading(false)
    }
  }, [token, t])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!token) return

    setUsersLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error(t('admin.fetchUsersError', 'Failed to load users'))
    } finally {
      setUsersLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      fetchUsers()
    }
  }, [activeTab, users.length, fetchUsers])

  // User actions
  const handleUserAction = useCallback(
    async (userId: string, action: 'toggle_admin' | 'activate' | 'deactivate') => {
      if (!token) return

      setActionLoading(userId)
      try {
        const response = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, action }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Action failed')
        }

        const data = await response.json()

        // Update local state
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === userId) {
              if (action === 'toggle_admin') {
                return { ...u, is_admin: !u.is_admin }
              } else if (action === 'activate') {
                return { ...u, is_active: true }
              } else if (action === 'deactivate') {
                return { ...u, is_active: false }
              }
            }
            return u
          })
        )

        const actionMessages: Record<string, string> = {
          toggle_admin: data.user.is_admin
            ? t('admin.adminGranted', 'Admin privileges granted')
            : t('admin.adminRevoked', 'Admin privileges revoked'),
          activate: t('admin.userActivated', 'User activated'),
          deactivate: t('admin.userDeactivated', 'User deactivated'),
        }

        toast.success(actionMessages[action] || 'Action completed')
        fetchStats() // Refresh stats
      } catch (error) {
        console.error('User action failed:', error)
        toast.error(
          error instanceof Error ? error.message : t('admin.actionFailed', 'Action failed')
        )
      } finally {
        setActionLoading(null)
      }
    },
    [token, t, fetchStats]
  )

  // Delete user
  const handleDeleteUser = useCallback(
    async (userId: string) => {
      if (!token) return

      setActionLoading(userId)
      try {
        const response = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Delete failed')
        }

        // Remove from local state
        setUsers((prev) => prev.filter((u) => u.id !== userId))
        setShowDeleteConfirm(null)
        toast.success(t('admin.userDeleted', 'User deleted successfully'))
        fetchStats() // Refresh stats
      } catch (error) {
        console.error('Delete user failed:', error)
        toast.error(
          error instanceof Error ? error.message : t('admin.deleteFailed', 'Delete failed')
        )
      } finally {
        setActionLoading(null)
      }
    },
    [token, t, fetchStats]
  )

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users

    const query = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  // Format date
  const formatDate = useCallback(
    (dateStr?: string) => {
      if (!dateStr) return '-'
      return new Date(dateStr).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [i18n.language]
  )

  // Format currency
  const formatCurrency = useCallback(
    (value: number) => {
      const currency = t('common.currency', 'RSD')
      return new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: /^[A-Z]{3}$/.test(currency) ? currency : 'RSD',
        maximumFractionDigits: 0,
      }).format(value)
    },
    [i18n.language, t]
  )

  if (!user?.is_admin) {
    return null
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-8 text-white">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8" />
              <div>
                <h1 className="font-bold text-2xl">{t('admin.title', 'Admin Dashboard')}</h1>
                <p className="text-purple-100 text-sm">
                  {t('admin.subtitle', 'Manage users and view system statistics')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="-mt-4 mx-auto max-w-4xl px-4">
          <div className="flex gap-2 rounded-lg bg-white p-1 shadow-lg dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              {t('admin.overview', 'Overview')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="h-4 w-4" />
              {t('admin.users', 'Users')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto mt-6 max-w-4xl px-4">
          {activeTab === 'overview' && stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                  icon={Users}
                  label={t('admin.totalUsers', 'Total Users')}
                  value={stats.users.total_users}
                  color="blue"
                />
                <StatCard
                  icon={UserCheck}
                  label={t('admin.activeUsers', 'Active Users')}
                  value={stats.users.active_users}
                  color="green"
                />
                <StatCard
                  icon={ShieldCheck}
                  label={t('admin.verifiedUsers', 'Verified')}
                  value={stats.users.verified_users}
                  color="purple"
                />
                <StatCard
                  icon={Crown}
                  label={t('admin.admins', 'Admins')}
                  value={stats.users.admin_users}
                  color="amber"
                />
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <Activity className="h-5 w-5 text-blue-500" />
                    {t('admin.userActivity', 'User Activity')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.activeToday', 'Active Today')}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.activeToday.active_today}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.activeSessions', 'Active Sessions')}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.sessions.active_sessions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.newUsers7d', 'New (7 days)')}
                      </span>
                      <span className="font-semibold text-green-600">
                        +{stats.users.new_users_7d}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.newUsers30d', 'New (30 days)')}
                      </span>
                      <span className="font-semibold text-green-600">
                        +{stats.users.new_users_30d}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <FileText className="h-5 w-5 text-green-500" />
                    {t('admin.receiptStats', 'Receipt Statistics')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.totalReceipts', 'Total Receipts')}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.receipts.total_receipts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.totalAmount', 'Total Amount')}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(Number(stats.receipts.total_amount) || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.receipts7d', 'Receipts (7 days)')}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {stats.receipts.receipts_7d}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.receipts30d', 'Receipts (30 days)')}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {stats.receipts.receipts_30d}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Users */}
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <UserPlus className="h-5 w-5 text-purple-500" />
                  {t('admin.recentUsers', 'Recent Users')}
                </h3>
                <div className="space-y-3">
                  {recentUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between border-gray-100 border-b py-2 last:border-0 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 font-semibold text-white">
                          {u.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                            {u.full_name || u.email?.split('@')[0] || 'Unknown'}
                            {u.is_admin && <Crown className="h-4 w-4 text-amber-500" />}
                          </p>
                          <p className="text-gray-500 text-sm dark:text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <span className="text-gray-500 text-sm dark:text-gray-400">
                        {formatDate(u.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Search and Refresh */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.searchUsers', 'Search users by email or name...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pr-4 pl-10 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="rounded-xl bg-purple-100 px-4 py-3 text-purple-700 transition-colors hover:bg-purple-200 disabled:opacity-50 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                >
                  <RefreshCw className={`h-5 w-5 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Users List */}
              {usersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredUsers.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        currentUserId={user?.id}
                        isLoading={actionLoading === u.id}
                        showDeleteConfirm={showDeleteConfirm === u.id}
                        onToggleAdmin={() => handleUserAction(u.id, 'toggle_admin')}
                        onToggleActive={() =>
                          handleUserAction(u.id, u.is_active ? 'deactivate' : 'activate')
                        }
                        onDelete={() => handleDeleteUser(u.id)}
                        onShowDeleteConfirm={() => setShowDeleteConfirm(u.id)}
                        onCancelDelete={() => setShowDeleteConfirm(null)}
                        formatDate={formatDate}
                      />
                    ))}

                    {filteredUsers.length === 0 && (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery
                          ? t('admin.noUsersFound', 'No users found matching your search')
                          : t('admin.noUsers', 'No users')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User Count */}
              <div className="text-center text-gray-500 text-sm dark:text-gray-400">
                {t('admin.showingUsers', 'Showing {{count}} users', {
                  count: filteredUsers.length,
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

// Stat Card Component
const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: number | string
  color: 'blue' | 'green' | 'purple' | 'amber'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className={`inline-flex rounded-lg p-2 ${colorClasses[color]} mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-bold text-2xl text-gray-900 dark:text-white">{value}</p>
      <p className="text-gray-500 text-sm dark:text-gray-400">{label}</p>
    </div>
  )
})

// User Row Component
const UserRow = memo(function UserRow({
  user,
  currentUserId,
  isLoading,
  showDeleteConfirm,
  onToggleAdmin,
  onToggleActive,
  onDelete,
  onShowDeleteConfirm,
  onCancelDelete,
  formatDate,
}: {
  user: AdminUser
  currentUserId?: string
  isLoading: boolean
  showDeleteConfirm: boolean
  onToggleAdmin: () => void
  onToggleActive: () => void
  onDelete: () => void
  onShowDeleteConfirm: () => void
  onCancelDelete: () => void
  formatDate: (date?: string) => string
}) {
  const { t } = useTranslation()
  const isCurrentUser = user.id === currentUserId
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 font-semibold text-lg text-white">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              {user.full_name || user.email?.split('@')[0] || 'Unknown'}
              {user.is_admin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                  <Crown className="h-3 w-3" />
                  Admin
                </span>
              )}
              {!user.is_active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-300">
                  <Ban className="h-3 w-3" />
                  {t('admin.inactive', 'Inactive')}
                </span>
              )}
              {isCurrentUser && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
                  {t('admin.you', 'You')}
                </span>
              )}
            </p>
            <p className="text-gray-500 text-sm dark:text-gray-400">{user.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronDown
            className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 border-gray-100 border-t pt-4 dark:border-gray-700"
        >
          {/* User Details */}
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('admin.userId', 'User ID')}:
              </span>
              <p className="break-all font-mono text-gray-700 text-xs dark:text-gray-300">
                {user.id}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('admin.verified', 'Verified')}:
              </span>
              <p className="flex items-center gap-1">
                {user.email_verified ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                {user.email_verified ? t('admin.yes', 'Yes') : t('admin.no', 'No')}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('admin.created', 'Created')}:
              </span>
              <p className="text-gray-700 dark:text-gray-300">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('admin.lastLogin', 'Last Login')}:
              </span>
              <p className="text-gray-700 dark:text-gray-300">{formatDate(user.last_login_at)}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('admin.receipts', 'Receipts')}:
              </span>
              <p className="text-gray-700 dark:text-gray-300">{user.receipt_count ?? '-'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('admin.sessions', 'Sessions')}:
              </span>
              <p className="text-gray-700 dark:text-gray-300">{user.active_sessions ?? '-'}</p>
            </div>
          </div>

          {/* Actions */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <span className="flex-1 text-red-700 text-sm dark:text-red-300">
                {t(
                  'admin.confirmDelete',
                  'Are you sure you want to delete this user? This cannot be undone.'
                )}
              </span>
              <button
                type="button"
                onClick={onCancelDelete}
                disabled={isLoading}
                className="rounded-lg px-3 py-1.5 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isLoading}
                className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t('common.delete', 'Delete')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleAdmin}
                disabled={isLoading || isCurrentUser}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-colors disabled:opacity-50 ${
                  user.is_admin
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
                title={
                  isCurrentUser
                    ? t('admin.cantModifySelf', "Can't modify your own admin status")
                    : ''
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                {user.is_admin
                  ? t('admin.removeAdmin', 'Remove Admin')
                  : t('admin.makeAdmin', 'Make Admin')}
              </button>

              <button
                type="button"
                onClick={onToggleActive}
                disabled={isLoading || isCurrentUser}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-colors disabled:opacity-50 ${
                  user.is_active
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                }`}
                title={
                  isCurrentUser ? t('admin.cantDeactivateSelf', "Can't deactivate yourself") : ''
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user.is_active ? (
                  <UserX className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                {user.is_active
                  ? t('admin.deactivate', 'Deactivate')
                  : t('admin.activate', 'Activate')}
              </button>

              <button
                type="button"
                onClick={onShowDeleteConfirm}
                disabled={isLoading || isCurrentUser}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 font-medium text-gray-700 text-sm transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                title={isCurrentUser ? t('admin.cantDeleteSelf', "Can't delete yourself") : ''}
              >
                <Trash2 className="h-4 w-4" />
                {t('common.delete', 'Delete')}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
})

export default AdminPage
