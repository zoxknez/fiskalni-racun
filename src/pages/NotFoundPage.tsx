/**
 * NotFoundPage - 404 Error Page
 *
 * Displays a friendly 404 page with navigation options
 */

import { motion, useReducedMotion } from 'framer-motion'
import { FileQuestion, Home, Receipt, Search, Shield } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'

function NotFoundPageComponent() {
  const { t } = useTranslation()
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Track mouse for parallax effect
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 50,
        y: (e.clientY - window.innerHeight / 2) / 50,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [prefersReducedMotion])

  const quickLinks = [
    { to: '/', icon: Home, label: t('notFound.home', 'Go Home') },
    { to: '/receipts', icon: Receipt, label: t('notFound.receipts', 'Receipts') },
    { to: '/warranties', icon: Shield, label: t('notFound.warranties', 'Warranties') },
    { to: '/search', icon: Search, label: t('notFound.search', 'Search') },
  ]

  return (
    <PageTransition>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
        {/* Animated 404 */}
        <motion.div
          initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
          style={
            prefersReducedMotion
              ? {}
              : {
                  transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
                }
          }
          className="relative mb-8"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 blur-3xl">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-primary-400/30 to-purple-400/30" />
          </div>

          {/* 404 Text */}
          <div className="relative">
            <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-clip-text font-black text-[120px] text-transparent sm:text-[180px]">
              404
            </span>
          </div>

          {/* Floating icon */}
          <motion.div
            animate={
              prefersReducedMotion
                ? {}
                : {
                    y: [-10, 10, -10],
                    rotate: [-5, 5, -5],
                  }
            }
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
            className="-translate-x-1/2 absolute bottom-0 left-1/2"
          >
            <div className="rounded-2xl bg-white p-4 shadow-2xl dark:bg-dark-800">
              <FileQuestion className="h-12 w-12 text-primary-500" />
            </div>
          </motion.div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 text-center"
        >
          <h1 className="mb-2 font-bold text-2xl text-dark-900 sm:text-3xl dark:text-dark-50">
            {t('notFound.title', 'Page Not Found')}
          </h1>
          <p className="max-w-md text-dark-600 dark:text-dark-400">
            {t(
              'notFound.description',
              "The page you're looking for doesn't exist or has been moved."
            )}
          </p>
          {location.pathname !== '/' && (
            <p className="mt-2 font-mono text-dark-400 text-sm dark:text-dark-500">
              {location.pathname}
            </p>
          )}
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:bg-dark-800"
            >
              <link.icon className="h-6 w-6 text-primary-500" />
              <span className="text-dark-700 text-sm dark:text-dark-300">{link.label}</span>
            </Link>
          ))}
        </motion.div>

        {/* Back button */}
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-dark-500 text-sm transition-colors hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
          >
            ← {t('notFound.goBack', 'Go back to previous page')}
          </button>
        </motion.div>
      </div>
    </PageTransition>
  )
}

export const NotFoundPage = memo(NotFoundPageComponent)
export default NotFoundPage
