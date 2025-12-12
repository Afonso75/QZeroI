import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptTranslation from './locales/pt/translation.json';
import enTranslation from './locales/en/translation.json';
import esTranslation from './locales/es/translation.json';
import frTranslation from './locales/fr/translation.json';
import deTranslation from './locales/de/translation.json';
import itTranslation from './locales/it/translation.json';
import nlTranslation from './locales/nl/translation.json';
import plTranslation from './locales/pl/translation.json';
import svTranslation from './locales/sv/translation.json';
import daTranslation from './locales/da/translation.json';
import noTranslation from './locales/no/translation.json';
import fiTranslation from './locales/fi/translation.json';
import csTranslation from './locales/cs/translation.json';
import elTranslation from './locales/el/translation.json';
import roTranslation from './locales/ro/translation.json';
import huTranslation from './locales/hu/translation.json';
import bgTranslation from './locales/bg/translation.json';
import hrTranslation from './locales/hr/translation.json';
import skTranslation from './locales/sk/translation.json';
import slTranslation from './locales/sl/translation.json';
import isTranslation from './locales/is/translation.json';
import jaTranslation from './locales/ja/translation.json';
import thTranslation from './locales/th/translation.json';

const resources = {
  pt: { translation: ptTranslation },
  en: { translation: enTranslation },
  es: { translation: esTranslation },
  fr: { translation: frTranslation },
  de: { translation: deTranslation },
  it: { translation: itTranslation },
  nl: { translation: nlTranslation },
  pl: { translation: plTranslation },
  sv: { translation: svTranslation },
  da: { translation: daTranslation },
  no: { translation: noTranslation },
  fi: { translation: fiTranslation },
  cs: { translation: csTranslation },
  el: { translation: elTranslation },
  ro: { translation: roTranslation },
  hu: { translation: huTranslation },
  bg: { translation: bgTranslation },
  hr: { translation: hrTranslation },
  sk: { translation: skTranslation },
  sl: { translation: slTranslation },
  is: { translation: isTranslation },
  ja: { translation: jaTranslation },
  th: { translation: thTranslation }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'sv', 'da', 'no', 'fi', 'cs', 'el', 'ro', 'hu', 'bg', 'hr', 'sk', 'sl', 'is', 'ja', 'th'],
    detection: {
      // ORDEM: querystring permite override manual (?lng=pt)
      // localStorage (escolhas manuais) tem prioridade sobre navigator
      // Navigator (idioma do sistema) é fallback final
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'qzero_language',
      lookupQuerystring: 'lng',
      convertDetectedLanguage: (lng) => {
        // Normalizar códigos de idioma (ex: en-US -> en, pt-BR -> pt)
        if (!lng) return 'pt';
        const normalized = lng.split('-')[0].toLowerCase();
        const supported = ['pt', 'en', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'sv', 'da', 'no', 'fi', 'cs', 'el', 'ro', 'hu', 'bg', 'hr', 'sk', 'sl', 'is', 'ja', 'th'];
        return supported.includes(normalized) ? normalized : 'pt';
      }
    },
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;

export const changeLanguage = (lng) => {
  return i18n.changeLanguage(lng);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'is', name: 'Íslenska', flag: '🇮🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' }
];
