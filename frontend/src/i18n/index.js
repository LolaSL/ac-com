import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/common.json';
import es from './locales/es/common.json';
import fr from './locales/fr/common.json';
import de from './locales/de/common.json';
import it from './locales/it/common.json';
import pt from './locales/pt/common.json';
import he from './locales/he/common.json';
import ru from './locales/ru/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'he', 'ru'];
export const RTL_LANGUAGES = ['he'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      es: { common: es },
      fr: { common: fr },
      de: { common: de },
      it: { common: it },
      pt: { common: pt },
      he: { common: he },
      ru: { common: ru },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'appLanguage',
    },
  });

i18n.on('languageChanged', (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('lang', lng);
  document.documentElement.setAttribute('dir', dir);
});

export default i18n;
