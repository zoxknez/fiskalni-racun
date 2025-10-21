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
    { name: 'React', icon: '⚛️', category: 'Frontend', url: 'https://react.dev/' },
    {
      name: 'TypeScript',
      icon: '📘',
      category: 'Language',
      url: 'https://www.typescriptlang.org/',
    },
    { name: 'Vite', icon: '⚡', category: 'Build Tool', url: 'https://vitejs.dev/' },
    { name: 'Tailwind CSS', icon: '🎨', category: 'Styling', url: 'https://tailwindcss.com/' },
    {
      name: 'Framer Motion',
      icon: '🎬',
      category: 'Animations',
      url: 'https://www.framer.com/motion/',
    },
    {
      name: 'React Query',
      icon: '🔄',
      category: 'Data Fetching',
      url: 'https://tanstack.com/query/latest',
    },
    { name: 'Supabase', icon: '🗄️', category: 'Backend', url: 'https://supabase.com/' },
    {
      name: 'PWA',
      icon: '📱',
      category: 'Progressive Web App',
      url: 'https://web.dev/progressive-web-apps/',
    },
  ]

  const features = [
    { icon: Code2, text: t('about.features.modern') },
    { icon: Palette, text: t('about.features.design') },
    { icon: Database, text: t('about.features.database') },
    { icon: Smartphone, text: t('about.features.mobile') },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pb-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-10 text-white shadow-2xl"
      >
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-sm tracking-wide">
            <Sparkles className="h-5 w-5" />
            <span>{t('about.features.modern')}</span>
          </div>
          <h1 className="mb-4 font-bold text-4xl leading-tight sm:text-5xl">{t('about.title')}</h1>
          <p className="max-w-2xl text-lg text-primary-100 leading-relaxed">
            {t('about.description')}
          </p>
          <div className="mt-6 flex gap-3 overflow-x-auto text-primary-50 text-sm sm:gap-4 md:justify-center md:gap-6">
            {features.map((feature, index) => (
              <div key={feature.text} className="flex items-center gap-3 md:gap-4">
                <div className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur-sm transition-all duration-200 hover:bg-white/20 md:px-4 md:py-2.5">
                  <feature.icon className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap md:text-base">{feature.text}</span>
                </div>
                {index < features.length - 1 && (
                  <div className="hidden h-6 w-px bg-white/20 md:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Decorative orbs - optimized */}
        <div className="absolute top-[-60px] right-[-40px] h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-[-80px] left-[-40px] h-72 w-72 rounded-full bg-white/5 blur-xl" />
      </motion.div>

      {/* Technologies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="mb-6 flex flex-col gap-3 text-center">
          <h2 className="section-title mb-0">{t('about.technologies.title')}</h2>
          <p className="text-dark-500 text-sm dark:text-dark-400">{t('about.description')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {technologies.map((tech) => (
            <a
              key={tech.name}
              href={tech.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group hover:-translate-y-1 flex flex-col items-center gap-2 rounded-xl border border-dark-100 bg-dark-50/80 p-4 text-center transition-all duration-200 hover:border-primary-200 hover:bg-white dark:border-dark-700 dark:bg-dark-800/60 dark:hover:border-primary-500/40 dark:hover:bg-dark-700"
              aria-label={`${tech.name} website`}
            >
              <span className="text-3xl">{tech.icon}</span>
              <span className="font-semibold text-dark-900 dark:text-dark-50">{tech.name}</span>
              <span className="text-dark-500 text-xs dark:text-dark-400">{tech.category}</span>
              <span className="font-medium text-primary-500 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                visit ↗
              </span>
            </a>
          ))}
        </div>
      </motion.div>

      {/* Developer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card text-center"
      >
        <h2 className="section-title">{t('about.developer.title')}</h2>
        <div className="space-y-6">
          <p className="mx-auto max-w-2xl text-dark-600 dark:text-dark-300">
            {t('about.developer.description')}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://mojportfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex min-w-[220px] items-center justify-center gap-2"
            >
              <Globe className="h-5 w-5" />
              <span>{t('about.developer.portfolio')}</span>
            </a>
            <a
              href="https://github.com/zoxknez"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex min-w-[220px] items-center justify-center gap-2"
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
        className="card flex flex-col items-center border border-blue-200 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 text-center shadow-lg dark:border-blue-800/60 dark:from-blue-900/20 dark:via-purple-900/10 dark:to-indigo-900/10"
      >
        <div className="rounded-2xl bg-blue-100/80 p-4 dark:bg-blue-900/30">
          <Heart className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mt-4 flex items-center justify-center gap-2 font-semibold text-dark-900 text-xl dark:text-dark-50">
          {t('about.donate.title')}
          <Sparkles className="h-5 w-5 text-primary-500" />
        </h2>
        <p className="mx-auto mb-5 max-w-2xl text-dark-600 dark:text-dark-300">
          {t('about.donate.description')}
        </p>
        <a
          href="https://www.paypal.com/paypalme/o0o0o0o0o0o0o"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          <DollarSign className="h-5 w-5" />
          <span>{t('about.donate.button')}</span>
        </a>
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
