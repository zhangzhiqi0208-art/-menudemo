import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import pt from './locales/pt.json';

const SUPPORTED = ['zh', 'en', 'pt'] as const;

function readStoredLng(): (typeof SUPPORTED)[number] {
  try {
    const v = localStorage.getItem('i18nextLng');
    if (v && (SUPPORTED as readonly string[]).includes(v)) {
      return v as (typeof SUPPORTED)[number];
    }
  } catch {
    /* ignore */
  }
  return 'zh';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      pt: { translation: pt },
    },
    lng: readStoredLng(),
    fallbackLng: 'zh',
    supportedLngs: [...SUPPORTED],
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  try {
    if ((SUPPORTED as readonly string[]).includes(lng)) {
      localStorage.setItem('i18nextLng', lng);
    }
  } catch {
    /* ignore */
  }
});

export default i18n;
