import { Filter, Search, X } from 'lucide-react'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export type RoleFilter = 'all' | 'admin' | 'user'
export type StatusFilter = 'all' | 'active' | 'inactive'
export type VerifiedFilter = 'all' | 'verified' | 'unverified'

interface AdminFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  roleFilter: RoleFilter
  onRoleChange: (role: RoleFilter) => void
  statusFilter: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  verifiedFilter: VerifiedFilter
  onVerifiedChange: (verified: VerifiedFilter) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export const AdminFilters = memo(function AdminFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleChange,
  statusFilter,
  onStatusChange,
  verifiedFilter,
  onVerifiedChange,
  onClearFilters,
  hasActiveFilters,
}: AdminFiltersProps) {
  const { t } = useTranslation()

  const handleSearchClear = useCallback(() => {
    onSearchChange('')
  }, [onSearchChange])

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('admin.searchUsers', 'Pretraži korisnike po email-u ili imenu...')}
          aria-label={t('admin.searchUsers', 'Pretraži korisnike')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white/80 py-3.5 pr-10 pl-12 text-gray-900 placeholder-gray-500 backdrop-blur-sm transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white dark:placeholder-gray-400 dark:focus:border-purple-400 dark:focus:ring-purple-400/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleSearchClear}
            className="-translate-y-1/2 absolute top-1/2 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-sm">Filteri:</span>
        </div>

        {/* Role filter */}
        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['all', 'admin', 'user'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onRoleChange(role)}
              className={`rounded-md px-3 py-1.5 font-medium text-sm transition-all duration-200 ${
                roleFilter === role
                  ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-purple-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {role === 'all' ? 'Svi' : role === 'admin' ? 'Admini' : 'Korisnici'}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={`rounded-md px-3 py-1.5 font-medium text-sm transition-all duration-200 ${
                statusFilter === status
                  ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-purple-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {status === 'all' ? 'Svi' : status === 'active' ? 'Aktivni' : 'Neaktivni'}
            </button>
          ))}
        </div>

        {/* Verified filter */}
        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['all', 'verified', 'unverified'] as const).map((verified) => (
            <button
              key={verified}
              type="button"
              onClick={() => onVerifiedChange(verified)}
              className={`rounded-md px-3 py-1.5 font-medium text-sm transition-all duration-200 ${
                verifiedFilter === verified
                  ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-purple-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {verified === 'all'
                ? 'Svi'
                : verified === 'verified'
                  ? 'Verifikovani'
                  : 'Neverifikovani'}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 font-medium text-rose-600 text-sm transition-colors hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30"
          >
            <X className="h-4 w-4" />
            Obriši filtere
          </button>
        )}
      </div>
    </div>
  )
})

export default AdminFilters
