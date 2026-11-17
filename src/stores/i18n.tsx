import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { signal, type Signal } from '@preact/signals';

import {
  LOCALES, Locale, Translate, detectLocale, getTranslation,
} from '@i18n/translations';

import { Storage } from '@utils/storage';

import { LOCALE_KEY } from '@config';

interface I18nStore {
  locale: Signal<Locale>;
  t: Translate;
  setLocale: (locale: Locale) => Promise<void>;
}

function createI18nStore(): I18nStore {
  const storage = new Storage();
  const locale = signal<Locale>('en');

  const t: Translate = (key, params) => getTranslation(locale.value, key, params);

  const setLocale = async (newLocale: Locale): Promise<void> => {
    locale.value = newLocale;
    await storage.set({ [LOCALE_KEY]: newLocale });
  };

  (async () => {
    try {
      const { [LOCALE_KEY]: saved } = await storage.get<Record<string, Locale>>([LOCALE_KEY]);
      if (saved && LOCALES.includes(saved)) {
        locale.value = saved;
      } else {
        const detected = detectLocale();
        locale.value = detected;
        await storage.set({ [LOCALE_KEY]: locale.value });
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
