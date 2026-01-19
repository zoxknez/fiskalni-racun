import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  BarChart3,
  Crown,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AdminFilters,
  AdminStatCard,
  AdminUserCard,
  Pagination,
  type RoleFilter,
  type StatusFilter,
  type VerifiedFilter,
} from '@/components/admin'
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
  total_amount?: number
}

interface TopUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  is_admin: boolean
  created_at: string
  receipt_count: number
  total_amount: number
}

interface AdminStats {
  users: {
    total_users: number
    active_users: number
    admin_users: number
    verified_users: number
    new_users_7d: number
    new_users_30d: number
    growth_percentage: number
  }
  receipts: {
    total_receipts: number
    receipts_7d: number
    receipts_30d: number
    total_amount: number
    avg_per_user: number
    receipts_today: number
    amount_today: number
  }
  warranties: {
    total_warranties: number
    active_warranties: number
    expired_warranties: number
    expiring_soon: number
  }
  sessions: {
    active_sessions: number
  }
  activeToday: {
    active_today: number
  }
}

type TabType = 'overview' | 'users' | 'analytics'

function AdminPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAppStore()

  // State
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const token = localStorage.getItem('neon_auth_token')

  // Check admin access
  useEffect(() => {
    if (!user?.is_admin) {
      toast.error(t('admin.accessDenied', 'Pristup odbijen. Potrebne su admin privilegije.'))
      navigate('/')
    }
  }, [user, navigate, t])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        toast.error(t('admin.sessionExpired', 'Sesija je istekla. Prijavite se ponovo.'))
        localStorage.removeItem('neon_auth_token')
        navigate('/login')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data.stats)
      setTopUsers(data.topUsers || [])
      setRecentUsers(data.recentUsers || [])
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : t('admin.fetchError', 'Greška pri učitavanju admin podataka')
      )
    } finally {
      setLoading(false)
    }
  }, [token, t, navigate])

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

      if (response.status === 401 || response.status === 403) {
        toast.error(t('admin.sessionExpired', 'Sesija je istekla. Prijavite se ponovo.'))
        localStorage.removeItem('neon_auth_token')
        navigate('/login')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : t('admin.fetchUsersError', 'Greška pri učitavanju korisnika')
      )
    } finally {
      setUsersLoading(false)
    }
  }, [token, t, navigate])

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
            ? t('admin.adminGranted', 'Admin privilegije dodeljene')
            : t('admin.adminRevoked', 'Admin privilegije uklоnjene'),
          activate: t('admin.userActivated', 'Korisnik aktiviran'),
          deactivate: t('admin.userDeactivated', 'Korisnik deaktiviran'),
        }

        toast.success(actionMessages[action] || 'Akcija uspešna')
        fetchStats()
      } catch (error) {
        console.error('User action failed:', error)
        toast.error(
          error instanceof Error ? error.message : t('admin.actionFailed', 'Akcija neuspešna')
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

        setUsers((prev) => prev.filter((u) => u.id !== userId))
        toast.success(t('admin.userDeleted', 'Korisnik uspešno obrisan'))
        fetchStats()
      } catch (error) {
        console.error('Delete user failed:', error)
        toast.error(
          error instanceof Error ? error.message : t('admin.deleteFailed', 'Brisanje neuspešno')
        )
      } finally {
        setActionLoading(null)
      }
    },
    [token, t, fetchStats]
  )

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          u.email.toLowerCase().includes(query) ||
          u.full_name?.toLowerCase().includes(query) ||
          u.id.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Role filter
      if (roleFilter === 'admin' && !u.is_admin) return false
      if (roleFilter === 'user' && u.is_admin) return false

      // Status filter
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'inactive' && u.is_active) return false

      // Verified filter
      if (verifiedFilter === 'verified' && !u.email_verified) return false
      if (verifiedFilter === 'unverified' && u.email_verified) return false

      return true
    })
  }, [users, searchQuery, roleFilter, statusFilter, verifiedFilter])

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(start, start + itemsPerPage)
  }, [filteredUsers, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [])

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    verifiedFilter !== 'all'

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setRoleFilter('all')
    setStatusFilter('all')
    setVerifiedFilter('all')
  }, [])

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

  // Export users to CSV
  const exportUsers = useCallback(() => {
    const headers = ['Email', 'Ime', 'Admin', 'Aktivan', 'Verifikovan', 'Računi', 'Registrovan']
    const csvData = filteredUsers.map((u) => [
      u.email,
      u.full_name || '',
      u.is_admin ? 'Da' : 'Ne',
      u.is_active ? 'Da' : 'Ne',
      u.email_verified ? 'Da' : 'Ne',
      String(u.receipt_count ?? 0),
      formatDate(u.created_at),
    ])

    const csv = [headers, ...csvData].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `korisnici-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Korisnici izvezeni')
  }, [filteredUsers, formatDate])

  if (!user?.is_admin) {
    return null
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
            <p className="text-gray-500 dark:text-gray-400">Učitavanje admin panela...</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-purple-50/30 pb-24 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900/10">
        {/* Premium Header */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600" />

          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-32 w-32 rounded-full bg-white/10"
                initial={{ x: -100, y: Math.random() * 200 }}
                animate={{
                  x: ['-10%', '110%'],
                  y: [Math.random() * 200, Math.random() * 200],
                }}
                transition={{
                  duration: 15 + i * 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
                style={{
                  top: `${i * 15}%`,
                  filter: 'blur(40px)',
                }}
              />
            ))}
          </div>

          {/* Header content */}
          <div className="relative px-4 py-10 text-white">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-xl">
                    <Shield className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-bold text-3xl">{t('admin.title', 'Admin Panel')}</h1>
                      <Sparkles className="h-5 w-5 text-amber-300" />
                    </div>
                    <p className="text-purple-200">
                      {t('admin.subtitle', 'Upravljaj korisnicima i sistemom')}
                    </p>
                  </div>
                </div>

                {/* Quick stats in header */}
                {stats && (
                  <div className="hidden items-center gap-6 lg:flex">
                    <QuickStat icon={Users} value={stats.users.total_users} label="Korisnika" />
                    <QuickStat
                      icon={FileText}
                      value={stats.receipts.total_receipts}
                      label="Računa"
                    />
                    <QuickStat
                      icon={Activity}
                      value={stats.activeToday.active_today}
                      label="Aktivnih danas"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="-mt-6 mx-auto max-w-5xl px-4">
          <div className="flex gap-2 rounded-2xl border border-gray-200/50 bg-white/80 p-1.5 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={TrendingUp}
            >
              {t('admin.overview', 'Pregled')}
            </TabButton>
            <TabButton
              active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              icon={Users}
            >
              {t('admin.users', 'Korisnici')} ({users.length})
            </TabButton>
            <TabButton
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              icon={BarChart3}
            >
              {t('admin.analytics', 'Analitika')}
            </TabButton>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto mt-8 max-w-5xl px-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && stats && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <AdminStatCard
                    icon={Users}
                    label={t('admin.totalUsers', 'Ukupno korisnika')}
                    value={stats.users.total_users}
                    color="blue"
                    delay={0}
                  />
                  <AdminStatCard
                    icon={UserCheck}
                    label={t('admin.activeUsers', 'Aktivnih korisnika')}
                    value={stats.users.active_users}
                    color="green"
                    delay={1}
                  />
                  <AdminStatCard
                    icon={ShieldCheck}
                    label={t('admin.verifiedUsers', 'Verifikovanih')}
                    value={stats.users.verified_users}
                    color="purple"
                    delay={2}
                  />
                  <AdminStatCard
                    icon={Crown}
                    label={t('admin.admins', 'Admina')}
                    value={stats.users.admin_users}
                    color="amber"
                    delay={3}
                  />
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <StatsPanel
                    icon={Activity}
                    iconColor="text-blue-500"
                    title={t('admin.userActivity', 'Aktivnost korisnika')}
                  >
                    <StatRow
                      label={t('admin.activeToday', 'Aktivnih danas')}
                      value={stats.activeToday.active_today}
                    />
                    <StatRow
                      label={t('admin.activeSessions', 'Aktivnih sesija')}
                      value={stats.sessions.active_sessions}
                    />
                    <StatRow
                      label={t('admin.newUsers7d', 'Novih (7 dana)')}
                      value={`+${stats.users.new_users_7d}`}
                      valueColor="text-emerald-600 dark:text-emerald-400"
                    />
                    <StatRow
                      label={t('admin.newUsers30d', 'Novih (30 dana)')}
                      value={`+${stats.users.new_users_30d}`}
                      valueColor="text-emerald-600 dark:text-emerald-400"
                    />
                  </StatsPanel>

                  <StatsPanel
                    icon={FileText}
                    iconColor="text-emerald-500"
                    title={t('admin.receiptStats', 'Statistika računa')}
                  >
                    <StatRow
                      label={t('admin.totalReceipts', 'Ukupno računa')}
                      value={stats.receipts.total_receipts}
                    />
                    <StatRow
                      label={t('admin.totalAmount', 'Ukupan iznos')}
                      value={formatCurrency(Number(stats.receipts.total_amount) || 0)}
                    />
                    <StatRow
                      label={t('admin.receipts7d', 'Računa (7 dana)')}
                      value={stats.receipts.receipts_7d}
                      valueColor="text-blue-600 dark:text-blue-400"
                    />
                    <StatRow
                      label={t('admin.receipts30d', 'Računa (30 dana)')}
                      value={stats.receipts.receipts_30d}
                      valueColor="text-blue-600 dark:text-blue-400"
                    />
                  </StatsPanel>
                </div>

                {/* Recent Users */}
                <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 text-lg dark:text-white">
                    <UserPlus className="h-5 w-5 text-purple-500" />
                    {t('admin.recentUsers', 'Nedavni korisnici')}
                  </h3>
                  <div className="space-y-3">
                    {recentUsers.map((u, idx) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
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
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Filters */}
                <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80">
                  <AdminFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    roleFilter={roleFilter}
                    onRoleChange={setRoleFilter}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    verifiedFilter={verifiedFilter}
                    onVerifiedChange={setVerifiedFilter}
                    onClearFilters={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                  />
                </div>

                {/* Actions bar */}
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 dark:text-gray-400">
                    {filteredUsers.length} korisnika
                    {hasActiveFilters && ` (filtrirano od ${users.length})`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={exportUsers}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Download className="h-4 w-4" />
                      Izvezi CSV
                    </button>
                    <button
                      type="button"
                      onClick={fetchUsers}
                      disabled={usersLoading}
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
                      Osveži
                    </button>
                  </div>
                </div>

                {/* Users List */}
                {usersLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                      <p className="text-gray-500 dark:text-gray-400">Učitavanje korisnika...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {paginatedUsers.map((u) => (
                          <AdminUserCard
                            key={u.id}
                            user={u}
                            currentUserId={user?.id}
                            isLoading={actionLoading === u.id}
                            onToggleAdmin={() => handleUserAction(u.id, 'toggle_admin')}
                            onToggleActive={() =>
                              handleUserAction(u.id, u.is_active ? 'deactivate' : 'activate')
                            }
                            onDelete={() => handleDeleteUser(u.id)}
                            formatDate={formatDate}
                          />
                        ))}
                      </AnimatePresence>

                      {paginatedUsers.length === 0 && (
                        <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-12 text-center shadow-lg backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80">
                          <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400">
                            {hasActiveFilters
                              ? 'Nema korisnika koji odgovaraju filterima'
                              : 'Nema korisnika'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Pagination */}
                    {filteredUsers.length > 0 && (
                      <div className="rounded-2xl border border-gray-200/50 bg-white/80 shadow-lg backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={filteredUsers.length}
                          itemsPerPage={itemsPerPage}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={(items) => {
                            setItemsPerPage(items)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && stats && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Top Users Section */}
                <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 text-lg dark:text-white">
                    <Crown className="h-5 w-5 text-amber-500" />
                    {t('admin.topUsers', 'Top Korisnici po Računima')}
                  </h3>
                  {topUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-3 text-left text-gray-500 text-sm font-medium dark:text-gray-400">
                              #
                            </th>
                            <th className="pb-3 text-left text-gray-500 text-sm font-medium dark:text-gray-400">
                              Korisnik
                            </th>
                            <th className="pb-3 text-right text-gray-500 text-sm font-medium dark:text-gray-400">
                              Računi
                            </th>
                            <th className="pb-3 text-right text-gray-500 text-sm font-medium dark:text-gray-400">
                              Ukupan Iznos
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {topUsers.map((u, idx) => (
                            <motion.tr
                              key={u.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                            >
                              <td className="py-3 text-gray-500 dark:text-gray-400">
                                {idx === 0 && <span className="text-amber-500">🥇</span>}
                                {idx === 1 && <span className="text-gray-400">🥈</span>}
                                {idx === 2 && <span className="text-amber-600">🥉</span>}
                                {idx > 2 && (
                                  <span className="text-gray-400 text-sm">{idx + 1}</span>
                                )}
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-sm font-semibold text-white">
                                    {u.email?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {u.full_name || u.email?.split('@')[0]}
                                      {u.is_admin && (
                                        <Crown className="ml-1 inline h-3 w-3 text-amber-500" />
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {u.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-right">
                                <span className="rounded-full bg-purple-100 px-2.5 py-1 font-semibold text-purple-700 text-sm dark:bg-purple-900/30 dark:text-purple-400">
                                  {u.receipt_count}
                                </span>
                              </td>
                              <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(Number(u.total_amount) || 0)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                      <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
                      <p>Nema korisnika sa računima</p>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Warranty Stats */}
                  <StatsPanel
                    icon={ShieldAlert}
                    iconColor="text-orange-500"
                    title={t('admin.warrantyStats', 'Statistika Garancija')}
                  >
                    <StatRow
                      label={t('admin.totalWarranties', 'Ukupno garancija')}
                      value={stats.warranties?.total_warranties ?? 0}
                    />
                    <StatRow
                      label={t('admin.activeWarranties', 'Aktivne garancije')}
                      value={stats.warranties?.active_warranties ?? 0}
                      valueColor="text-emerald-600 dark:text-emerald-400"
                    />
                    <StatRow
                      label={t('admin.expiringSoon', 'Ističu uskoro (30 dana)')}
                      value={stats.warranties?.expiring_soon ?? 0}
                      valueColor="text-amber-600 dark:text-amber-400"
                    />
                    <StatRow
                      label={t('admin.expiredWarranties', 'Istekle garancije')}
                      value={stats.warranties?.expired_warranties ?? 0}
                      valueColor="text-rose-600 dark:text-rose-400"
                    />
                  </StatsPanel>

                  {/* Today's Activity */}
                  <StatsPanel
                    icon={Activity}
                    iconColor="text-cyan-500"
                    title={t('admin.todayActivity', 'Danas')}
                  >
                    <StatRow
                      label={t('admin.receiptsToday', 'Računa danas')}
                      value={stats.receipts?.receipts_today ?? 0}
                    />
                    <StatRow
                      label={t('admin.amountToday', 'Iznos danas')}
                      value={formatCurrency(Number(stats.receipts?.amount_today) || 0)}
                    />
                    <StatRow
                      label={t('admin.activeUsersToday', 'Aktivnih korisnika')}
                      value={stats.activeToday?.active_today ?? 0}
                      valueColor="text-emerald-600 dark:text-emerald-400"
                    />
                    <StatRow
                      label={t('admin.avgPerUser', 'Prosek računa po korisniku')}
                      value={stats.receipts?.avg_per_user ?? 0}
                    />
                  </StatsPanel>
                </div>

                {/* Growth Indicator */}
                <div className="rounded-2xl border border-gray-200/50 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-6 shadow-lg backdrop-blur-xl dark:border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-500/20 p-3">
                        <TrendingUp className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-600 dark:text-gray-400">
                          Rast korisnika (30 dana)
                        </p>
                        <p className="font-bold text-2xl text-gray-900 dark:text-white">
                          {stats.users?.new_users_30d ?? 0} novih korisnika
                        </p>
                      </div>
                    </div>
                    <div
                      className={`rounded-xl px-4 py-2 font-bold text-xl ${
                        (stats.users?.growth_percentage ?? 0) >= 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}
                    >
                      {(stats.users?.growth_percentage ?? 0) >= 0 ? '+' : ''}
                      {stats.users?.growth_percentage ?? 0}%
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  )
}

// Helper Components
const QuickStat = memo(function QuickStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: number
  label: string
}) {
  return (
    <div className="text-center">
      <div className="flex items-center gap-2 text-white/80">
        <Icon className="h-4 w-4" />
        <span className="font-bold text-xl">{value.toLocaleString()}</span>
      </div>
      <p className="text-purple-200 text-xs">{label}</p>
    </div>
  )
})

const TabButton = memo(function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Users
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all duration-200 ${
        active
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
})

const StatsPanel = memo(function StatsPanel({
  icon: Icon,
  iconColor,
  title,
  children,
}: {
  icon: typeof Activity
  iconColor: string
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80"
    >
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 text-lg dark:text-white">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </motion.div>
  )
})

const StatRow = memo(function StatRow({
  label,
  value,
  valueColor = 'text-gray-900 dark:text-white',
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
})

export default AdminPage
