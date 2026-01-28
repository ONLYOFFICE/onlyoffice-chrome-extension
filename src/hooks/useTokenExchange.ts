import { useCallback } from 'preact/hooks';

import { useAuth } from '@stores/index';
import { useFeedback } from '@stores/index';

import { Storage } from '@utils/storage';

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
                chrome.runtime.onMessage.removeListener(listener);
                removed = true;
            }
        };

        timeout = window.setTimeout(() => {
            clean();
            auth.state.value = { ...auth.state.value, signingIn: false, exchanging: false };
            storage.remove(['exchanging_tokens']);
            feedback.showError('Sign-in timed out. Please try again.');
        }, TOKEN_EXCHANGE_TIMEOUT);

        const listener = async (message: any) => {
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
                feedback.showError(message.error);
            }
        };

        chrome.runtime.onMessage.addListener(listener);
    }, [auth, feedback, storage, onSuccess]);

    return {
        exchange
    };
}
