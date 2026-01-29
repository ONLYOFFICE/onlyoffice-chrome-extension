import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { signal } from '@preact/signals';

import {
  Locale, detectLocale, getTranslation, TranslationKey,
} from '@i18n/translations';

import { Storage } from '@utils/storage';

const STORAGE_KEY = 'locale';

interface I18nStore {
  locale: ReturnType<typeof signal<Locale>>;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
  setLocale: (locale: Locale) => Promise<void>;
}

function createI18nStore(): I18nStore {
  const storage = new Storage();
  const locale = signal<Locale>('en');

  const t = (key: TranslationKey, params?: Record<string, string>): string => {
    const currentLocale = locale.value;
    const result = getTranslation(currentLocale, key, params);
    return result;
  };

  const setLocale = async (newLocale: Locale): Promise<void> => {
    locale.value = newLocale;
    await storage.set({ [STORAGE_KEY]: newLocale });
  };

  (async () => {
    try {
      const saved = await storage.get<{ locale: Locale }>([STORAGE_KEY]);
      const supportedLocales: Locale[] = ['en', 'ru', 'de', 'es', 'fr', 'zh'];
      if (saved.locale && supportedLocales.includes(saved.locale)) {
        locale.value = saved.locale;
      } else {
        const detected = detectLocale();
        locale.value = detected;
        await storage.set({ [STORAGE_KEY]: locale.value });
      }
    } catch {
      const detected = detectLocale();
      locale.value = detected;
    }
  })();

  return { locale, t, setLocale };
}

const I18nContext = createContext<I18nStore | null>(null);

export function useI18n(): I18nStore {
  const store = useContext(I18nContext);
  if (!store) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return store;
}

export function I18nProvider({ children }: { children: preact.ComponentChildren }) {
  const store = createI18nStore();

  return (
    <I18nContext.Provider value={store}>
      {children}
    </I18nContext.Provider>
  );
}
