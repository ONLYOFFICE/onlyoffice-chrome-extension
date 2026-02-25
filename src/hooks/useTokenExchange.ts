import { useCallback } from 'preact/hooks';

import { useAuth, useFeedback } from '@stores/index';
import { useI18n } from '@stores/i18n';

import { Storage } from '@utils/storage';
import { runtime } from '@utils/browser';

const TOKEN_EXCHANGE_TIMEOUT = 25000;

interface UseTokenExchangeOptions {
  storage: Storage;
  onSuccess?: () => Promise<void>;
}

interface UseTokenExchangeReturn {
  exchange: () => void;
}

export function useTokenExchange({ storage, onSuccess }: UseTokenExchangeOptions): UseTokenExchangeReturn {
  const auth = useAuth();
  const feedback = useFeedback();
  const { t } = useI18n();

  const exchange = useCallback(() => {
    auth.state.value = { ...auth.state.value, signingIn: true, exchanging: true };

    let timeout: number | null = null;
    let removed = false;

    const clean = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (!removed) {
        runtime.onMessage.removeListener(listener);
        removed = true;
      }
    };

    timeout = window.setTimeout(() => {
      clean();
      auth.state.value = { ...auth.state.value, signingIn: false, exchanging: false };
      storage.remove(['exchanging_tokens']);
      feedback.showError(t('error.sign_in_timed_out'));
    }, TOKEN_EXCHANGE_TIMEOUT);

    const listener = (message: any) => {
      (async () => {
        if (message.action === 'oauthSuccess') {
          clean();
          auth.state.value = { ...auth.state.value, signingIn: false, exchanging: false };
          await auth.checkAuthentication();
          if (onSuccess) {
            await onSuccess();
          }
        } else if (message.action === 'oauthError') {
          clean();
          auth.state.value = { ...auth.state.value, signingIn: false, exchanging: false };
          let translatedError = message.error;
          const errorLower = (message.error || '').toLowerCase().trim();

          if (errorLower.includes('not approve')
                      || errorLower.includes('access not approved')
                      || errorLower.includes("didn't approve")
                      || errorLower.includes('did not approve')
                      || errorLower.includes('user did not approve')
                      || errorLower.includes("user didn't approve")
                      || (errorLower.includes('approve') && errorLower.includes('access'))) {
            translatedError = t('error.access_not_approved');
          } else if (errorLower.includes('cancel') || errorLower.includes('cancelled')) {
            translatedError = t('error.authentication_cancelled');
          }

          feedback.showError(translatedError);
        }
      })();
    };

    runtime.onMessage.addListener(listener);
  }, [auth, feedback, storage, onSuccess, t]);

  return {
    exchange,
  };
}
