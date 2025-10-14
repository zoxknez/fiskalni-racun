import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { 
  QrCode, 
  Camera, 
  PenSquare, 
  TrendingUp, 
  AlertCircle,
  Wrench,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Wallet,
  Scan,
  Star,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { sr, enUS } from 'date-fns/locale'
import { useDashboardStats, useRecentReceipts, useExpiringDevices } from '@/hooks/useDatabase'
import { formatCurrency } from '@/lib'
import { PageTransition } from '@/components/common/PageTransition'

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'sr' ? sr : enUS
  
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
      description: 'Brzo skeniranje QR koda',
      icon: QrCode,
      href: '/add?mode=qr',
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      iconBg: 'from-blue-400 to-indigo-500',
      particles: '✨',
    },
    {
      name: t('home.photoReceipt'),
      description: 'OCR automatska detekcija',
      icon: Camera,
      href: '/add?mode=photo',
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      iconBg: 'from-purple-400 to-pink-500',
      particles: '📸',
    },
    {
      name: t('home.addManual'),
      description: 'Ručni unos podataka',
      icon: PenSquare,
      href: '/add?mode=manual',
      gradient: 'from-green-500 via-green-600 to-emerald-600',
      iconBg: 'from-green-400 to-emerald-500',
      particles: '✍️',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <PageTransition className="space-y-8 pb-8">
      {/* Hero Section - Glassmorphism + Parallax */}
      <motion.div 
        style={{ y: heroYSpring, opacity: heroOpacity }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 md:p-12 text-white shadow-2xl"
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
            backgroundSize: '100px 100px'
          }} />
        </div>
        
        {/* Floating Orbs */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-3xl"
        />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-4"
          >
            <Zap className="w-6 h-6 animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-widest opacity-90">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale })}
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-black mb-4 leading-tight"
          >
            {t('home.title')}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-primary-100 max-w-2xl text-lg md:text-xl font-medium"
          >
            {t('home.subtitle')}
          </motion.p>

          {/* Quick Stats in Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 grid grid-cols-3 gap-4"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-3xl font-black">{stats?.monthReceiptsCount || 0}</div>
              <div className="text-xs text-primary-100 uppercase tracking-wide mt-1">Računa ovog meseca</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-3xl font-black">{stats?.totalDevicesCount || 0}</div>
              <div className="text-xs text-primary-100 uppercase tracking-wide mt-1">Uređaja</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-3xl font-black">{stats?.activeWarranties || 0}</div>
              <div className="text-xs text-primary-100 uppercase tracking-wide mt-1">Aktivnih garancija</div>
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
        <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50 mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-600" />
          {t('home.quickActions')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className={`relative group overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-6 shadow-xl hover:shadow-2xl transition-all duration-300`}>
                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                  />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br ${action.iconBg} shadow-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <action.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">
                      {action.name}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {action.description}
                    </p>

                    {/* Particle Effect */}
                    <div className="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-100 transform group-hover:scale-125 transition-all duration-300">
                      {action.particles}
                    </div>
                  </div>

                  {/* Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
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
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/receipts">
            <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 p-6 border border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                    <Wallet className="w-7 h-7 text-white" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </motion.div>
                </div>
                
                <div className="text-3xl md:text-4xl font-black text-dark-900 dark:text-dark-50 mb-1">
                  {formatCurrency(monthSpending)}
                </div>
                <div className="text-sm text-dark-600 dark:text-dark-400 font-medium">
                  {t('home.monthSpending')}
                </div>
                <div className="text-xs text-dark-500 dark:text-dark-500 mt-2">
                  {stats?.monthReceiptsCount || 0} računa ovog meseca
                </div>
              </div>
              
              {/* Decorative gradient */}
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-400/20 to-transparent rounded-full blur-2xl transform translate-x-16 translate-y-16 group-hover:scale-150 transition-transform duration-500" />
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/warranties?filter=expiring">
            <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 p-6 border border-amber-200/50 dark:border-amber-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  {(expiringDevices?.length || 0) > 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                    >
                      !
                    </motion.div>
                  )}
                </div>
                
                <div className="text-3xl md:text-4xl font-black text-dark-900 dark:text-dark-50 mb-1">
                  {expiringDevices?.length || 0}
                </div>
                <div className="text-sm text-dark-600 dark:text-dark-400 font-medium">
                  {t('home.expiringWarranties')}
                </div>
                <div className="text-xs text-dark-500 dark:text-dark-500 mt-2">
                  Ističu u narednih 30 dana
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-amber-400/20 to-transparent rounded-full blur-2xl transform translate-x-16 translate-y-16 group-hover:scale-150 transition-transform duration-500" />
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/warranties">
            <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 p-6 border border-emerald-200/50 dark:border-emerald-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-dark-600 dark:text-dark-400">Novo</span>
                  </div>
                </div>
                
                <div className="text-3xl md:text-4xl font-black text-dark-900 dark:text-dark-50 mb-1">
                  {stats?.activeWarranties || 0}
                </div>
                <div className="text-sm text-dark-600 dark:text-dark-400 font-medium">
                  Aktivne garancije
                </div>
                <div className="text-xs text-dark-500 dark:text-dark-500 mt-2">
                  Ukupno {stats?.totalDevicesCount || 0} uređaja
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-emerald-400/20 to-transparent rounded-full blur-2xl transform translate-x-16 translate-y-16 group-hover:scale-150 transition-transform duration-500" />
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-600" />
            {t('home.recentlyAdded')}
          </h2>
          <Link
            to="/receipts"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold flex items-center gap-1 group"
          >
            {t('home.viewAll')}
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </Link>
        </div>

        {recentReceipts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-6 rounded-2xl bg-gradient-to-br from-dark-50 to-dark-100 dark:from-dark-800 dark:to-dark-900 border border-dashed border-dark-300 dark:border-dark-600"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-4 mx-auto"
            >
              <Scan className="w-10 h-10 text-white" />
            </motion.div>
            <p className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">
              {t('home.emptyState')}
            </p>
            <p className="text-sm text-dark-600 dark:text-dark-400">
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
                  <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-dark-800 p-4 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-lg transition-all duration-300">
                    {/* Hover gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-md flex items-center justify-center shrink-0"
                        >
                          <span className="text-white text-lg font-bold">
                            {receipt.merchantName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-dark-900 dark:text-dark-50 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {receipt.merchantName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-dark-400" />
                            <p className="text-sm text-dark-600 dark:text-dark-400">
                              {format(receipt.date, 'dd.MM.yyyy', { locale })} • {receipt.time}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xl font-bold text-dark-900 dark:text-dark-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {formatCurrency(receipt.totalAmount)}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 mt-1">
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
              transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)',
                backgroundSize: '60px 60px',
              }}
            />
            
            <div className="relative z-10 flex items-start gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
              >
                <AlertCircle className="w-8 h-8 text-white" />
              </motion.div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  {t('home.expiringWarranties')}
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="inline-flex w-6 h-6 rounded-full bg-white text-red-600 text-sm font-black items-center justify-center"
                  >
                    {expiringDevices.length}
                  </motion.span>
                </h3>
                <p className="text-white/90 text-sm mb-4">
                  Imaš {expiringDevices.length} {expiringDevices.length === 1 ? 'uređaj' : 'uređaja'} sa garancijom koja ističe u narednih 30 dana!
                </p>
                
                <Link 
                  to="/warranties" 
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Wrench className="w-5 h-5" />
                  Upravljaj garancijama
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </PageTransition>
  )
}
