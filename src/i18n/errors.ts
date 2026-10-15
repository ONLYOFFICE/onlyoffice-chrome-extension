import { getTranslation, Translate, TranslationKey } from '@i18n/translations';

export class LocalizedError extends Error {
  readonly key: TranslationKey;

  readonly params?: Record<string, string>;

  constructor(key: TranslationKey, params?: Record<string, string>) {
    super(getTranslation('en', key, params));
    this.name = 'LocalizedError';
    this.key = key;
    this.params = params;
  }
}

export function errorMessage(error: unknown, t: Translate): string {
  if (error instanceof LocalizedError) return t(error.key, error.params);
  return error instanceof Error ? error.message : String(error);
}
