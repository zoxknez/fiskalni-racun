/**
 * OnboardingWizard Component
 *
 * First-time user onboarding flow with step-by-step introduction
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bell,
  Camera,
  CheckCircle,
  ChevronRight,
  Globe,
  type LucideIcon,
  Receipt,
  Shield,
  Sparkles,
  X,
} from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'

interface OnboardingStep {
  id: string
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
  color: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    titleKey: 'onboarding.welcome.title',
    descriptionKey: 'onboarding.welcome.description',
    color: 'from-primary-500 to-purple-600',
  },
  {
    id: 'receipts',
    icon: Receipt,
    titleKey: 'onboarding.receipts.title',
    descriptionKey: 'onboarding.receipts.description',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'scan',
    icon: Camera,
    titleKey: 'onboarding.scan.title',
    descriptionKey: 'onboarding.scan.description',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'warranties',
    icon: Shield,
    titleKey: 'onboarding.warranties.title',
    descriptionKey: 'onboarding.warranties.description',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'notifications',
    icon: Bell,
    titleKey: 'onboarding.notifications.title',
    descriptionKey: 'onboarding.notifications.description',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'language',
    icon: Globe,
    titleKey: 'onboarding.language.title',
    descriptionKey: 'onboarding.language.description',
    color: 'from-indigo-500 to-violet-500',
  },
]

interface OnboardingWizardProps {
  onComplete: () => void
}

function OnboardingWizardComponent({ onComplete }: OnboardingWizardProps) {
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const { setLanguage, updateSettings } = useAppStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<'sr' | 'en' | 'hr' | 'sl'>(
    (i18n.language as 'sr' | 'en' | 'hr' | 'sl') || 'sr'
  )

  const step = ONBOARDING_STEPS[currentStep]!
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  const handleNext = useCallback(() => {
    if (isLastStep) {
      // Save language preference and mark onboarding complete
      setLanguage(selectedLanguage)
      updateSettings({ onboardingCompleted: true })
      onComplete()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [isLastStep, onComplete, setLanguage, selectedLanguage, updateSettings])

  const handleSkip = useCallback(() => {
    updateSettings({ onboardingCompleted: true })
    onComplete()
  }, [onComplete, updateSettings])

  const handleLanguageSelect = useCallback(
    (lang: 'sr' | 'en') => {
      setSelectedLanguage(lang)
      // Immediately change language for preview
      i18n.changeLanguage(lang)
    },
    [i18n]
  )

  const StepIcon = step.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={prefersReducedMotion ? {} : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={prefersReducedMotion ? {} : { scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
      >
        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-dark-400 transition-colors hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-700 dark:hover:text-dark-200"
          aria-label={t('common.skip', 'Skip')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {ONBOARDING_STEPS.map((s, index) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-white'
                  : index < currentStep
                    ? 'w-2 bg-white/70'
                    : 'w-2 bg-white/30'
              }`}
              aria-label={`Step ${index + 1}`}
            />
          ))}
        </div>

        {/* Header with gradient */}
        <div className={`bg-gradient-to-br ${step.color} px-8 pt-16 pb-12 text-white`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={prefersReducedMotion ? {} : { x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? {} : { x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        scale: [1, 1.1, 1],
                      }
                }
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
                className="mb-6 rounded-2xl bg-white/20 p-4"
              >
                <StepIcon className="h-12 w-12" />
              </motion.div>
              <h2 className="mb-2 font-bold text-2xl">{t(step.titleKey, step.id)}</h2>
              <p className="text-white/80">{t(step.descriptionKey, '')}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content area */}
        <div className="p-6">
          {/* Language selection on last step */}
          {step.id === 'language' && (
            <div className="mb-6 space-y-3">
              <button
                type="button"
                onClick={() => handleLanguageSelect('sr')}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  selectedLanguage === 'sr'
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                    : 'border-dark-200 hover:border-dark-300 dark:border-dark-600 dark:hover:border-dark-500'
                }`}
              >
                <span className="text-2xl">🇷🇸</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-dark-900 dark:text-dark-50">Srpski</p>
                  <p className="text-dark-500 text-sm">Serbian</p>
                </div>
                {selectedLanguage === 'sr' && <CheckCircle className="h-5 w-5 text-primary-500" />}
              </button>

              <button
                type="button"
                onClick={() => handleLanguageSelect('en')}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  selectedLanguage === 'en'
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                    : 'border-dark-200 hover:border-dark-300 dark:border-dark-600 dark:hover:border-dark-500'
                }`}
              >
                <span className="text-2xl">🇬🇧</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-dark-900 dark:text-dark-50">English</p>
                  <p className="text-dark-500 text-sm">Engleski</p>
                </div>
                {selectedLanguage === 'en' && <CheckCircle className="h-5 w-5 text-primary-500" />}
              </button>
            </div>
          )}

          {/* Feature highlights for other steps */}
          {step.id !== 'language' && step.id !== 'welcome' && (
            <div className="mb-6 space-y-2">
              {[1, 2, 3].map((num) => {
                const featureKey = `onboarding.${step.id}.feature${num}`
                const feature = t(featureKey, '')
                if (!feature) return null
                return (
                  <div
                    key={num}
                    className="flex items-center gap-2 text-dark-600 text-sm dark:text-dark-400"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex-1 rounded-xl bg-dark-100 px-6 py-3 font-semibold text-dark-700 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600"
              >
                {t('common.back', 'Back')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${step.color} px-6 py-3 font-semibold text-white shadow-lg transition-all hover:opacity-90`}
            >
              {isLastStep ? t('onboarding.getStarted', 'Get Started') : t('common.next', 'Next')}
              {!isLastStep && <ChevronRight className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export const OnboardingWizard = memo(OnboardingWizardComponent)
export default OnboardingWizard
