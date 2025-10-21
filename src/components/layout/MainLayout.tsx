import clsx from 'clsx'
import {
  BarChart3,
  Database,
  FileText,
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
  { name: 'home', href: '/', icon: Home, labelKey: 'nav.home' as const },
  { name: 'receipts', href: '/receipts', icon: Receipt, labelKey: 'nav.receipts' as const },
  { name: 'warranties', href: '/warranties', icon: Shield, labelKey: 'nav.warranties' as const },
  { name: 'analytics', href: '/analytics', icon: BarChart3, labelKey: 'nav.analytics' as const },
  { name: 'documents', href: '/documents', icon: FileText, labelKey: 'nav.documents' as const },
  {
    name: 'import-export',
    href: '/import-export',
    icon: Database,
    labelKey: 'nav.importExport' as const,
  },
  { name: 'search', href: '/search', icon: Search, labelKey: 'nav.search' as const },
  { name: 'profile', href: '/profile', icon: User, labelKey: 'nav.profile' as const },
  { name: 'about', href: '/about', icon: Info, labelKey: 'nav.about' as const },
] as const

type NavigationItem = (typeof navigation)[number]

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
    <div className="flex min-h-screen flex-col bg-dark-50 dark:bg-dark-950">
      {/* Top App Bar - Mobile */}
      <header className="sticky top-0 z-40 border-dark-200 border-b bg-white lg:hidden dark:border-dark-800 dark:bg-dark-900">
        <div className="flex h-16 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 p-2.5 shadow-sm transition-all hover:from-primary-200 hover:to-primary-300 hover:shadow-md dark:from-primary-900/30 dark:to-primary-800/30 dark:hover:from-primary-800/40 dark:hover:to-primary-700/40"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-primary-700 dark:text-primary-300" />
            ) : (
              <>
                <Menu className="h-6 w-6 animate-pulse text-primary-700 dark:text-primary-300" />
                <span className="absolute top-0 right-0 h-2 w-2 animate-ping rounded-full bg-primary-500" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary-500" />
              </>
            )}
          </button>

          <h1 className="font-semibold text-lg">
            {t(navigation.find((n) => isActive(n.href))?.labelKey ?? 'nav.home')}
          </h1>

          <Link
            to="/add"
            className="rounded-lg p-2 text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            <PlusCircle className="h-6 w-6" />
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
          'fixed top-0 left-0 z-50 h-full w-56 border-dark-200 border-r bg-white transition-transform duration-300 dark:border-dark-800 dark:bg-dark-900',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-dark-200 border-b px-6 dark:border-dark-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text font-bold text-transparent text-xl">
              Fiskalni
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 font-medium transition-all',
                    active
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-dark-700 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-800'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </nav>

          {/* Donate CTA - Footer */}
          <div className="border-dark-200 border-t p-4 dark:border-dark-800">
            <a
              href="https://www.paypal.com/paypalme/o0o0o0o0o0o0o"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-lg border border-blue-500 px-3 py-2.5 font-medium text-blue-600 text-sm transition-colors hover:bg-blue-50 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/30"
            >
              <span>{t('about.donate.button')}</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="flex-1 lg:ml-56">
        <div className="container-app py-6 pb-20 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="safe-bottom fixed right-0 bottom-0 left-0 z-30 border-dark-200 border-t bg-white lg:hidden dark:border-dark-800 dark:bg-dark-900">
        <div className="flex items-center justify-around px-2 py-2">
          {(
            [
              navigation[0], // Home
              navigation[1], // Receipts
              navigation[2], // Warranties
              navigation[4], // Search
              navigation[5], // Profile
            ] as NavigationItem[]
          ).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex min-w-0 flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-dark-600 dark:text-dark-400'
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="truncate font-medium text-xs">{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
