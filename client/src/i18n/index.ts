import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import ar from './locales/ar';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    detection: {
      // Check localStorage first, then browser language
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'kids-lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
