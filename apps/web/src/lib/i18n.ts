import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translation files
import koCommon from '@/locales/ko/common.json'
import koAuth from '@/locales/ko/auth.json'
import koOnboarding from '@/locales/ko/onboarding.json'
import koEvidence from '@/locales/ko/evidence.json'
import koReadiness from '@/locales/ko/readiness.json'
import koInspection from '@/locales/ko/inspection.json'

const resources = {
  ko: {
    common: koCommon,
    auth: koAuth,
    onboarding: koOnboarding,
    evidence: koEvidence,
    readiness: koReadiness,
    inspection: koInspection,
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // Default language
    fallbackLng: 'ko',
    defaultNS: 'common',
    ns: ['common', 'auth', 'onboarding', 'evidence', 'readiness', 'inspection'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
