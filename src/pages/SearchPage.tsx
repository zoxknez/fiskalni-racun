import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Receipt as ReceiptIcon, Shield, X, Clock, Sparkles, ArrowRight } from 'lucide-react'
import { useReceiptSearch, useDeviceSearch } from '@/hooks/useDatabase'
import { formatCurrency } from '@/lib'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition, StaggerContainer, StaggerItem } from '../components/common/PageTransition'

export default function SearchPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'receipts' | 'devices'>('all')
  
  // Real-time search with live queries
  const receipts = useReceiptSearch(query)
  const devices = useDeviceSearch(query)
  
  const hasResults = (receipts && receipts.length > 0) || (devices && devices.length > 0)
  
  // Recent searches (mock data - can be stored in localStorage)
  const recentSearches = ['Samsung', 'Račun', 'Aparat']

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Search Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 p-8 text-white"
        >
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>

          {/* Floating particles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [-20, 20, -20],
                x: [-10, 10, -10],
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 0.5,
              }}
              className={`absolute w-24 h-24 bg-white rounded-full blur-3xl`}
              style={{
                top: `${20 + i * 25}%`,
                left: `${30 + i * 20}%`,
              }}
            />
          ))}

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                <SearchIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Pretraživanje</h1>
                <p className="text-white/80">Pronađi račune i uređaje brzo</p>
              </div>
            </motion.div>

            {/* Search Input */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-dark-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pretraži po nazivu, brendu, kategoriji..."
                className="w-full pl-16 pr-16 py-5 bg-white text-dark-900 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-white/30 transition-all duration-300 shadow-2xl"
                autoFocus
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setQuery('')}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-dark-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-dark-400" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* Empty State - No query */}
        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/20 dark:to-purple-900/20 flex items-center justify-center"
            >
              <Sparkles className="w-12 h-12 text-primary-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-dark-900 dark:text-dark-50 mb-2">
              Započni pretragu
            </h3>
            <p className="text-dark-600 dark:text-dark-400 mb-8">
              Unesi pojam za pretragu računa ili uređaja
            </p>

            {/* Recent searches */}
            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3 flex items-center gap-2 justify-center">
                <Clock className="w-4 h-4" />
                Nedavne pretrage
              </h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {recentSearches.map((term, index) => (
                  <motion.button
                    key={term}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuery(term)}
                    className="px-4 py-2 bg-white dark:bg-dark-800 rounded-xl text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors shadow-sm"
                  >
                    {term}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* No Results */}
        {query && !hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
              <SearchIcon className="w-10 h-10 text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50 mb-2">
              Nema rezultata
            </h3>
            <p className="text-dark-600 dark:text-dark-400">
              Nije pronađen nijedan rezultat za "{query}"
            </p>
          </motion.div>
        )}

        {/* Results */}
        {query && hasResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Result Tabs */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === 'all'
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700'
                }`}
              >
                Sve ({(receipts?.length || 0) + (devices?.length || 0)})
              </motion.button>
              {receipts && receipts.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('receipts')}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'receipts'
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700'
                  }`}
                >
                  Računi ({receipts.length})
                </motion.button>
              )}
              {devices && devices.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('devices')}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'devices'
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700'
                  }`}
                >
                  Uređaji ({devices.length})
                </motion.button>
              )}
            </div>

            {/* Receipts Results */}
            {receipts && receipts.length > 0 && (activeTab === 'all' || activeTab === 'receipts') && (
              <StaggerContainer className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                    <ReceiptIcon className="w-6 h-6 text-primary-500" />
                    Računi
                  </h2>
                  <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-semibold">
                    {receipts.length} {receipts.length === 1 ? 'rezultat' : 'rezultata'}
                  </span>
                </div>

                {receipts.map((receipt) => (
                  <StaggerItem key={receipt.id}>
                    <motion.div whileHover={{ scale: 1.01, x: 5 }}>
                      <Link
                        to={`/receipts/${receipt.id}`}
                        className="block relative group"
                      >
                        {/* Hover gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center shrink-0 shadow-lg"
                          >
                            <ReceiptIcon className="w-6 h-6 text-white" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-dark-900 dark:text-dark-50 truncate mb-1">
                              {receipt.merchantName}
                            </p>
                            <p className="text-sm text-dark-600 dark:text-dark-400">
                              {formatCurrency(receipt.totalAmount)}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-dark-400 group-hover:text-primary-500 transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}

            {/* Devices Results */}
            {devices && devices.length > 0 && (activeTab === 'all' || activeTab === 'devices') && (
              <StaggerContainer className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-amber-500" />
                    Uređaji
                  </h2>
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-semibold">
                    {devices.length} {devices.length === 1 ? 'rezultat' : 'rezultata'}
                  </span>
                </div>

                {devices.map((device) => (
                  <StaggerItem key={device.id}>
                    <motion.div whileHover={{ scale: 1.01, x: 5 }}>
                      <Link
                        to={`/warranties/${device.id}`}
                        className="block relative group"
                      >
                        {/* Hover gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-orange-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg"
                          >
                            <Shield className="w-6 h-6 text-white" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-dark-900 dark:text-dark-50 truncate mb-1">
                              {device.brand} {device.model}
                            </p>
                            <p className="text-sm text-dark-600 dark:text-dark-400">
                              {t(`categories.${device.category}`)}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-dark-400 group-hover:text-amber-500 transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
