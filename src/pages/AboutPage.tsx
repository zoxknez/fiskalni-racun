import { motion } from 'framer-motion'
import {
  Code2,
  Database,
  DollarSign,
  Github,
  Globe,
  Heart,
  Palette,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AboutPage() {
  const { t } = useTranslation()

  const technologies = [
    { name: 'React', icon: '⚛️', category: 'Frontend' },
    { name: 'TypeScript', icon: '📘', category: 'Language' },
    { name: 'Vite', icon: '⚡', category: 'Build Tool' },
    { name: 'Tailwind CSS', icon: '🎨', category: 'Styling' },
    { name: 'Framer Motion', icon: '🎬', category: 'Animations' },
    { name: 'React Query', icon: '🔄', category: 'Data Fetching' },
    { name: 'Supabase', icon: '🗄️', category: 'Backend' },
    { name: 'PWA', icon: '📱', category: 'Progressive Web App' },
  ]

  const features = [
    { icon: Code2, text: t('about.features.modern') },
    { icon: Palette, text: t('about.features.design') },
    { icon: Database, text: t('about.features.database') },
    { icon: Smartphone, text: t('about.features.mobile') },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-8 text-white"
      >
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <Sparkles className="h-8 w-8" />
            <h1 className="font-bold text-3xl">{t('about.title')}</h1>
          </div>
          <p className="text-lg text-primary-100 leading-relaxed">{t('about.description')}</p>
        </div>

        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h2 className="section-title">{t('about.features.title')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.text}
              className="flex items-start gap-3 rounded-lg bg-dark-50 p-4 dark:bg-dark-800/50"
            >
              <feature.icon className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary-600 dark:text-primary-400" />
              <span className="text-dark-700 dark:text-dark-300">{feature.text}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Technologies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="section-title">{t('about.technologies.title')}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="flex flex-col items-center gap-2 rounded-lg bg-dark-50 p-4 transition-colors hover:bg-dark-100 dark:bg-dark-800/50 dark:hover:bg-dark-800"
            >
              <span className="text-3xl">{tech.icon}</span>
              <span className="text-center font-medium text-dark-900 dark:text-dark-50">
                {tech.name}
              </span>
              <span className="text-dark-500 text-xs dark:text-dark-400">{tech.category}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Developer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h2 className="section-title">{t('about.developer.title')}</h2>
        <div className="space-y-4">
          <p className="text-dark-700 dark:text-dark-300">{t('about.developer.description')}</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="https://mojportfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Globe className="h-5 w-5" />
              <span>{t('about.developer.email')}</span>
            </a>
            <a
              href="https://github.com/zoxknez"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Github className="h-5 w-5" />
              <span>{t('about.developer.github')}</span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* Donate Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-900/10 dark:to-indigo-900/10"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-dark-900 text-xl dark:text-dark-50">
              {t('about.donate.title')}
              <Heart className="h-5 w-5 text-red-500" />
            </h2>
            <p className="mb-4 text-dark-700 dark:text-dark-300">{t('about.donate.description')}</p>
            <a
              href="https://www.paypal.com/paypalme/o0o0o0o0o0o0o"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <DollarSign className="h-5 w-5" />
              <span>{t('about.donate.button')}</span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* Version Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-dark-500 text-sm dark:text-dark-400"
      >
        <p>v1.0.0 • o0o0o0o</p>
      </motion.div>
    </div>
  )
}
