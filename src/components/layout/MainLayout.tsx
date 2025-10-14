import { Outlet, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Home, 
  Receipt, 
  Shield, 
  PlusCircle, 
  Search, 
  User,
  Menu,
  X,
  BarChart3
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const navigation = [
  { name: 'home', href: '/', icon: Home },
  { name: 'receipts', href: '/receipts', icon: Receipt },
  { name: 'warranties', href: '/warranties', icon: Shield },
  { name: 'analytics', href: '/analytics', icon: BarChart3 },
  { name: 'search', href: '/search', icon: Search },
  { name: 'profile', href: '/profile', icon: User },
]

export default function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-50 dark:bg-dark-950">
      {/* Top App Bar - Mobile */}
      <header className="sticky top-0 z-40 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-800 lg:hidden">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          
          <h1 className="text-lg font-semibold">
            {t(`nav.${navigation.find(n => isActive(n.href))?.name || 'home'}`)}
          </h1>
          
          <Link
            to="/add"
            className="p-2 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            <PlusCircle className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-dark-900 border-r border-dark-200 dark:border-dark-800 transition-transform duration-300',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-dark-200 dark:border-dark-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
              Fiskalni
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all',
                    active
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{t(`nav.${item.name}`)}</span>
                </Link>
              )
            })}
          </nav>

          {/* Add Button - Desktop */}
          <div className="p-4 border-t border-dark-200 dark:border-dark-800 hidden lg:block">
            <Link
              to="/add"
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{t('nav.add')}</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="container-app py-6 pb-20 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800 lg:hidden safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navigation.slice(0, 4).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-0',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-dark-600 dark:text-dark-400'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium truncate">
                  {t(`nav.${item.name}`)}
                </span>
              </Link>
            )
          })}
          <Link
            to="/profile"
            className={clsx(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-0',
              isActive('/profile')
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-dark-600 dark:text-dark-400'
            )}
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium truncate">
              {t('nav.profile')}
            </span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
