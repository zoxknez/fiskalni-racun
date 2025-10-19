import { formatCurrency } from '@lib/utils'
import { format } from 'date-fns'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Camera,
  Clock,
  PenSquare,
  QrCode,
  Scan,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { useDashboardStats, useExpiringDevices, useRecentReceipts } from '@/hooks/useDatabase'

export default function HomePage() {
  const { t } = useTranslation()

  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 300], [0, -50])
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  const heroYSpring = useSpring(heroY, springConfig)

  // Use live queries for real-time updates
  const stats = useDashboardStats()
  const recentReceipts = useRecentReceipts(5)
  const expiringDevices = useExpiringDevices(30)

  const loading = !stats || !recentReceipts || !expiringDevices
  const monthSpending = stats?.monthSpending || 0

  const quickActions = [
    {
      name: t('home.scanQR'),
      description: t('home.scanQRDescription'),
      icon: QrCode,
      href: '/add?mode=qr',
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      iconBg: 'from-blue-400 to-indigo-500',
      particles: '✨',
    },
    {
      name: t('home.photoReceipt'),
      description: t('home.photoReceiptDescription'),
      icon: Camera,
      href: '/add?mode=photo',
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      iconBg: 'from-purple-400 to-pink-500',
      particles: '📸',
    },
    {
      name: t('home.addManual'),
      description: t('home.addManualDescription'),
      icon: PenSquare,
      href: '/add?mode=manual',
      gradient: 'from-green-500 via-green-600 to-emerald-600',
      iconBg: 'from-green-400 to-emerald-500',
      particles: '✍️',
    },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-primary-600 border-t-transparent"
        />
      </div>
    )
  }

  return (
    <PageTransition className="space-y-8 pb-8">
      {/* Hero Section - Glassmorphism + Parallax */}
      <motion.div
        style={{ y: heroYSpring, opacity: heroOpacity }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 text-white shadow-2xl md:p-12"
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
              backgroundSize: '100px 100px',
            }}
          />
        </div>

        {/* Floating Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
          className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
          className="-bottom-32 -left-32 absolute h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex items-center gap-2"
          >
            <Zap className="h-6 w-6 animate-pulse" />
            <span className="font-bold text-sm uppercase tracking-widest opacity-90">
              {format(new Date(), 'EEEE, d MMMM yyyy')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 font-black text-4xl leading-tight md:text-5xl"
          >
            {t('home.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl font-medium text-lg text-primary-100 md:text-xl"
          >
            {t('home.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <Link
              to="/add"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-primary-600 shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-50 dark:bg-dark-800 dark:text-primary-300 dark:hover:bg-dark-700"
            >
              <Sparkles className="h-5 w-5" />
              {t('receipts.addReceipt')}
            </Link>
          </motion.div>

          {/* Quick Stats in Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 grid grid-cols-3 gap-2 sm:gap-4"
          >
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
              <div className="truncate font-black text-2xl sm:text-3xl">
                {stats?.monthReceiptsCount || 0}
              </div>
              <div className="mt-1 text-[10px] text-primary-100 uppercase leading-tight tracking-wide sm:text-xs">
                <span className="hidden sm:inline">{t('home.receiptsThisMonth')}</span>
                <span className="sm:hidden">{t('home.receiptsShort')}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
              <div className="truncate font-black text-2xl sm:text-3xl">
                {stats?.totalDevicesCount || 0}
              </div>
              <div className="mt-1 truncate text-[10px] text-primary-100 uppercase tracking-wide sm:text-xs">
                {t('home.devices')}
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
              <div className="truncate font-black text-2xl sm:text-3xl">
                {stats?.activeWarranties || 0}
              </div>
              <div className="mt-1 text-[10px] text-primary-100 uppercase leading-tight tracking-wide sm:text-xs">
                <span className="xs:inline hidden">{t('home.activeWarranties')}</span>
                <span className="xs:hidden">{t('home.activeShort')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions - 3D Cards with Hover Effects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="mb-6 flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
          <Sparkles className="h-6 w-6 text-primary-600" />
          {t('home.quickActions')}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link to={action.href}>
                <div
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-6 shadow-xl transition-all duration-300 hover:shadow-2xl`}
                >
                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    <div
                      className={`mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br ${action.iconBg} flex transform items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110`}
                    >
                      <action.icon className="h-8 w-8 text-white" />
                    </div>

                    <h3 className="mb-2 font-bold text-white text-xl">{action.name}</h3>
                    <p className="text-sm text-white/80">{action.description}</p>

                    {/* Particle Effect */}
                    <div className="absolute top-4 right-4 transform text-3xl opacity-20 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100">
                      {action.particles}
                    </div>
                  </div>

                  {/* Glow Effect */}
                  <div className="-inset-1 absolute bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Advanced Stats Cards - Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/receipts">
            <div className="group relative overflow-hidden rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-blue-700/50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20">
              <div className="relative z-10">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-14 w-14 transform items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                    <Wallet className="h-7 w-7 text-white" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </motion.div>
                </div>

                <div className="mb-1 font-black text-3xl text-dark-900 md:text-4xl dark:text-dark-50">
                  {formatCurrency(monthSpending)}
                </div>
                <div className="font-medium text-dark-600 text-sm dark:text-dark-400">
                  {t('home.monthSpending')}
                </div>
                <div className="mt-2 text-dark-500 text-xs dark:text-dark-500">
                  {stats?.monthReceiptsCount || 0} računa ovog meseca
                </div>
              </div>

              {/* Decorative gradient */}
              <div className="absolute right-0 bottom-0 h-32 w-32 translate-x-16 translate-y-16 transform rounded-full bg-gradient-to-tl from-blue-400/20 to-transparent blur-2xl transition-transform duration-500 group-hover:scale-150" />
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/warranties?filter=expiring">
            <div className="group relative overflow-hidden rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-amber-700/50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20">
              <div className="relative z-10">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-14 w-14 transform items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  {(expiringDevices?.length || 0) > 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 font-bold text-white text-xs"
                    >
                      !
                    </motion.div>
                  )}
                </div>

                <div className="mb-1 font-black text-3xl text-dark-900 md:text-4xl dark:text-dark-50">
                  {expiringDevices?.length || 0}
                </div>
                <div className="font-medium text-dark-600 text-sm dark:text-dark-400">
                  {t('home.expiringWarranties')}
                </div>
                <div className="mt-2 text-dark-500 text-xs dark:text-dark-500">
                  {t('home.expiringSoonHint')}
                </div>
              </div>

              <div className="absolute right-0 bottom-0 h-32 w-32 translate-x-16 translate-y-16 transform rounded-full bg-gradient-to-tl from-amber-400/20 to-transparent blur-2xl transition-transform duration-500 group-hover:scale-150" />
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/warranties">
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-emerald-700/50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20">
              <div className="relative z-10">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-14 w-14 transform items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                    <Activity className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-dark-600 text-xs dark:text-dark-400">
                      {t('home.newBadge')}
                    </span>
                  </div>
                </div>

                <div className="mb-1 font-black text-3xl text-dark-900 md:text-4xl dark:text-dark-50">
                  {stats?.activeWarranties || 0}
                </div>
                <div className="font-medium text-dark-600 text-sm dark:text-dark-400">
                  {t('home.activeWarrantiesCard')}
                </div>
                <div className="mt-2 text-dark-500 text-xs dark:text-dark-500">
                  {t('home.totalDevicesLabel', { count: stats?.totalDevicesCount ?? 0 })}
                </div>
              </div>

              <div className="absolute right-0 bottom-0 h-32 w-32 translate-x-16 translate-y-16 transform rounded-full bg-gradient-to-tl from-emerald-400/20 to-transparent blur-2xl transition-transform duration-500 group-hover:scale-150" />
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Recent Receipts - Advanced List with Micro-interactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
            <Clock className="h-6 w-6 text-primary-600" />
            {t('home.recentlyAdded')}
          </h2>
          <Link
            to="/receipts"
            className="group flex items-center gap-1 font-semibold text-primary-600 text-sm hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {t('home.viewAll')}
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </Link>
        </div>

        {recentReceipts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-dark-300 border-dashed bg-gradient-to-br from-dark-50 to-dark-100 px-6 py-16 text-center dark:border-dark-600 dark:from-dark-800 dark:to-dark-900"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600"
            >
              <Scan className="h-10 w-10 text-white" />
            </motion.div>
            <p className="mb-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
              {t('home.emptyState')}
            </p>
            <p className="text-dark-600 text-sm dark:text-dark-400">
              Klikni na bilo koju akciju iznad da dodaš prvi račun
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {recentReceipts.map((receipt, index) => (
              <motion.div
                key={receipt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.05 }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to={`/receipts/${receipt.id}`}>
                  <div className="group relative overflow-hidden rounded-2xl border border-dark-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800">
                    {/* Hover gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-primary-900/10 dark:to-purple-900/10" />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-md"
                        >
                          <span className="font-bold text-lg text-white">
                            {receipt.merchantName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </motion.div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-dark-900 transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
                            {receipt.merchantName}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Clock className="h-3 w-3 text-dark-400" />
                            <p className="text-dark-600 text-sm dark:text-dark-400">
                              {format(receipt.date, 'dd.MM.yyyy')} • {receipt.time}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 shrink-0 text-right">
                        <p className="font-bold text-dark-900 text-xl transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
                          {formatCurrency(receipt.totalAmount)}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-primary-100 px-2 py-0.5 font-medium text-primary-700 text-xs dark:bg-primary-900/30 dark:text-primary-300">
                          {receipt.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Expiring Warranties Alert - If Any */}
      {expiringDevices && expiringDevices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 shadow-2xl">
            {/* Animated background pattern */}
            <motion.div
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)',
                backgroundSize: '60px 60px',
              }}
            />

            <div className="relative z-10 flex items-start gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
              >
                <AlertCircle className="h-8 w-8 text-white" />
              </motion.div>

              <div className="flex-1">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-white text-xl">
                  {t('home.expiringWarranties')}
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white font-black text-red-600 text-sm"
                  >
                    {expiringDevices.length}
                  </motion.span>
                </h3>
                <p className="mb-4 text-sm text-white/90">
                  {t('home.expiringWarrantiesAlert', {
                    count: expiringDevices.length,
                  })}
                </p>

                <Link
                  to="/warranties"
                  className="inline-flex transform items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-bold text-orange-600 shadow-lg transition-all hover:scale-105 hover:bg-orange-50 hover:shadow-xl"
                >
                  <Wrench className="h-5 w-5" />
                  {t('home.manageWarranties')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </PageTransition>
  )
}
