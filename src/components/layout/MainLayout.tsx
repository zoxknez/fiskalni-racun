import clsx from 'clsx'
import {
  BarChart3,
  Heart,
  Home,
  Info,
  Menu,
  PlusCircle,
  Receipt,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'

const navigation = [
  { name: 'home', href: '/', icon: Home },
  { name: 'receipts', href: '/receipts', icon: Receipt },
  { name: 'warranties', href: '/warranties', icon: Shield },
  { name: 'analytics', href: '/analytics', icon: BarChart3 },
  { name: 'search', href: '/search', icon: Search },
  { name: 'profile', href: '/profile', icon: User },
  { name: 'about', href: '/about', icon: Info },
]

export default function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const previousPathname = useRef(location.pathname)

  const pathname = location.pathname

  // Close mobile menu on route change
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname
      setMobileMenuOpen(false)
    }
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative p-2.5 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 hover:from-primary-200 hover:to-primary-300 dark:hover:from-primary-800/40 dark:hover:to-primary-700/40 transition-all shadow-sm hover:shadow-md"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-primary-700 dark:text-primary-300" />
            ) : (
              <>
                <Menu className="w-6 h-6 text-primary-700 dark:text-primary-300 animate-pulse" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary-500 rounded-full animate-ping" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary-500 rounded-full" />
              </>
            )}
          </button>

          <h1 className="text-lg font-semibold">
            {t(`nav.${navigation.find((n) => isActive(n.href))?.name || 'home'}`)}
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
        <button
          type="button"
          aria-label={t('nav.closeMenu') ?? 'Close navigation menu'}
          className="fixed inset-0 z-[45] bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-dark-900 border-r border-dark-200 dark:border-dark-800 transition-transform duration-300',
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

            {/* PayPal Donate - In Navigation */}
            <a
              href="https://www.paypal.com/paypalme/o0o0o0o0o0o0o"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 mt-2"
            >
              <Heart className="w-5 h-5 animate-pulse" />
              <span>{t('about.donate.button')}</span>
            </a>
          </nav>

          {/* Add Button - All Devices */}
          <div className="p-4 border-t border-dark-200 dark:border-dark-800">
            <Link to="/add" className="btn-primary w-full flex items-center justify-center gap-2">
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
          {[
            navigation[0], // Home
            navigation[1], // Receipts
            navigation[2], // Warranties
            navigation[4], // Search
            navigation[5], // Profile
          ].map((item) => {
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
                <span className="text-xs font-medium truncate">{t(`nav.${item.name}`)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
