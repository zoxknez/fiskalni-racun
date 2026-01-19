import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  Clock,
  Crown,
  FileText,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { memo, useState } from 'react'

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

interface AdminUserCardProps {
  user: AdminUser
  currentUserId?: string
  isLoading: boolean
  onToggleAdmin: () => void
  onToggleActive: () => void
  onDelete: () => void
  formatDate: (date?: string) => string
}

export const AdminUserCard = memo(function AdminUserCard({
  user,
  currentUserId,
  isLoading,
  onToggleAdmin,
  onToggleActive,
  onDelete,
  formatDate,
}: AdminUserCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isCurrentUser = user.id === currentUserId

  // Generate avatar gradient based on email
  const getAvatarGradient = (email: string) => {
    const gradients = [
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500',
      'from-violet-500 to-purple-500',
    ]
    const index = email.charCodeAt(0) % gradients.length
    return gradients[index]
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-xl border transition-all duration-200 ${
        expanded
          ? 'border-purple-200 bg-white shadow-lg dark:border-purple-800 dark:bg-gray-800'
          : 'border-gray-100 bg-white/50 hover:border-gray-200 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'
      }
      `}
    >
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(user.email)}font-semibold text-lg text-white shadow-md`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.email}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (user.email?.[0]?.toUpperCase() ?? '?')
              )}
            </div>
            {/* Online indicator */}
            {user.is_active && (
              <div className="-bottom-0.5 -right-0.5 absolute h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-800" />
            )}
          </div>

          {/* User info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-gray-900 dark:text-white">
                {user.full_name || user.email?.split('@')[0] || 'Unknown'}
              </p>

              {/* Badges */}
              {user.is_admin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-2.5 py-0.5 font-semibold text-amber-700 text-xs dark:from-amber-900/40 dark:to-yellow-900/40 dark:text-amber-300">
                  <Crown className="h-3 w-3" />
                  Admin
                </span>
              )}
              {!user.is_active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-semibold text-red-700 text-xs dark:bg-red-900/30 dark:text-red-300">
                  <Ban className="h-3 w-3" />
                  Neaktivan
                </span>
              )}
              {user.email_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 text-xs dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {isCurrentUser && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
                  Ti
                </span>
              )}
            </div>
            <p className="truncate text-gray-500 text-sm dark:text-gray-400">{user.email}</p>
          </div>

          {/* Quick stats with enhanced badges */}
          <div className="hidden items-center gap-4 md:flex">
            <div
              className="flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 dark:bg-purple-900/30"
              title="Računi"
            >
              <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-purple-700 text-sm dark:text-purple-300">
                {user.receipt_count ?? 0}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 dark:bg-blue-900/30"
              title="Aktivne sesije"
            >
              <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-700 text-sm dark:text-blue-300">
                {user.active_sessions ?? 0}
              </span>
            </div>
          </div>

          {/* Expand button */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-gray-100 border-t px-4 pt-2 pb-4 dark:border-gray-700">
              {/* Details grid */}
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                <DetailItem
                  icon={Mail}
                  label="Email"
                  value={user.email_verified ? 'Verifikovan' : 'Neverifikovan'}
                  valueClass={
                    user.email_verified
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                />
                <DetailItem icon={Clock} label="Registrovan" value={formatDate(user.created_at)} />
                <DetailItem
                  icon={Clock}
                  label="Poslednja prijava"
                  value={formatDate(user.last_login_at) || '-'}
                />
                <DetailItem
                  icon={FileText}
                  label="Računi"
                  value={String(user.receipt_count ?? 0)}
                />
                <DetailItem
                  icon={Shield}
                  label="Aktivne sesije"
                  value={String(user.active_sessions ?? 0)}
                />
              </div>

              {/* ID */}
              <div className="mb-4 rounded-lg bg-gray-50 p-2 dark:bg-gray-900/50">
                <span className="text-gray-500 text-xs dark:text-gray-400">ID: </span>
                <code className="break-all font-mono text-gray-700 text-xs dark:text-gray-300">
                  {user.id}
                </code>
              </div>

              {/* Actions */}
              {showDeleteConfirm ? (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
                  <span className="flex-1 text-red-700 text-sm dark:text-red-300">
                    Da li ste sigurni da želite obrisati ovog korisnika?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isLoading}
                    className="rounded-lg px-3 py-1.5 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Otkaži
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete()
                      setShowDeleteConfirm(false)
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Obriši
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    onClick={onToggleAdmin}
                    disabled={isLoading || isCurrentUser}
                    variant={user.is_admin ? 'amber' : 'default'}
                    icon={isLoading ? Loader2 : Crown}
                    loading={isLoading}
                    title={isCurrentUser ? 'Ne možete menjati svoj admin status' : ''}
                  >
                    {user.is_admin ? 'Ukloni Admin' : 'Dodeli Admin'}
                  </ActionButton>

                  <ActionButton
                    onClick={onToggleActive}
                    disabled={isLoading || isCurrentUser}
                    variant={user.is_active ? 'red' : 'green'}
                    icon={isLoading ? Loader2 : user.is_active ? UserX : UserCheck}
                    loading={isLoading}
                    title={isCurrentUser ? 'Ne možete deaktivirati sebe' : ''}
                  >
                    {user.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                  </ActionButton>

                  <ActionButton
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading || isCurrentUser}
                    variant="danger"
                    icon={Trash2}
                    title={isCurrentUser ? 'Ne možete obrisati sebe' : ''}
                  >
                    Obriši
                  </ActionButton>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

// Helper components
function DetailItem({
  icon: Icon,
  label,
  value,
  valueClass = 'text-gray-900 dark:text-white',
}: {
  icon: typeof Clock
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
      <div>
        <p className="text-gray-500 text-xs dark:text-gray-400">{label}</p>
        <p className={`font-medium text-sm ${valueClass}`}>{value}</p>
      </div>
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  variant,
  icon: Icon,
  loading,
  title = '',
  children,
}: {
  onClick: () => void
  disabled?: boolean
  variant: 'default' | 'amber' | 'green' | 'red' | 'danger'
  icon: typeof Crown
  loading?: boolean
  title?: string
  children: React.ReactNode
}) {
  const variantClasses = {
    default:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
    amber:
      'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50',
    green:
      'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
    red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
    danger:
      'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-300',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]}`}
    >
      <Icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {children}
    </button>
  )
}

export default AdminUserCard
