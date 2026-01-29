import en from '@i18n/locales/en.json';
import ru from '@i18n/locales/ru.json';
import de from '@i18n/locales/de.json';
import es from '@i18n/locales/es.json';
import fr from '@i18n/locales/fr.json';
import zh from '@i18n/locales/zh.json';

export type Locale = 'en' | 'ru' | 'de' | 'es' | 'fr' | 'zh';

type Translations = typeof en;

export type TranslationKey =
    | `common.${keyof Translations['common']}`
    | `auth.${keyof Translations['auth']}`
    | `menu.${keyof Translations['menu']}`
    | `files.${keyof Translations['files']}`
    | `error.${keyof Translations['error']}`;

const translations: Record<Locale, Translations> = {
  en,
  ru,
  de,
  es,
  fr,
  zh,
};

export function getTranslation(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string>,
): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  if (!value) value = translations.en;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      value = translations.en;
      for (const fallbackKey of keys) value = value?.[fallbackKey];
      break;
    }
  }

  if (typeof value !== 'string') return key;

  if (params) return value.replace(/\{(\w+)\}/g, (_, paramKey) => params[paramKey] || `{${paramKey}}`);

  return value;
}

export function detectLocale(): Locale {
  const supportedLocales: Locale[] = ['en', 'ru', 'de', 'es', 'fr', 'zh'];

  if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
    const uiLang = chrome.i18n.getUILanguage();
    const langCode = uiLang.split('-')[0].toLowerCase();
    if (supportedLocales.includes(langCode as Locale)) {
      return langCode as Locale;
    }
  }

  if (typeof navigator !== 'undefined') {
    const navLang = navigator.language || navigator.languages?.[0] || 'en';
    const langCode = navLang.split('-')[0].toLowerCase();
    if (supportedLocales.includes(langCode as Locale)) {
      return langCode as Locale;
    }
  }

  return 'en';
}
