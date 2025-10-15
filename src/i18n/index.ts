import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translations } from './translations'

const savedLanguage = localStorage.getItem('language') || 'sr'

i18n.use(initReactI18next).init({
  resources: translations,
  lng: savedLanguage,
  fallbackLng: 'sr',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
