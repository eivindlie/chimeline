import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import nb from '../locales/nb.json';

// Type augmentation: t('nonExistent.key') is a TypeScript error; autocomplete works
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}

// Type check: TypeScript will error if nb.json is missing any key present in en.json
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _nbCheck: typeof en = nb;

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('chimeline_lang') : null;

i18next.use(initReactI18next).init({
  lng: savedLang ?? 'nb',
  fallbackLng: 'nb',
  resources: {
    en: { translation: en },
    nb: { translation: nb },
  },
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18next;
