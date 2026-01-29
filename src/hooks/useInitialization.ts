import { useState, useEffect, useCallback } from 'preact/hooks';

import { useAuth, useDocs, useProfile, useFeedback, useI18n } from '@stores/index';

import { Storage } from '@utils/storage';

interface UseInitializationReturn {
    loaded: boolean;
    init: () => Promise<void>;
}

export function useInitialization(
    storage: Storage,
    detect: () => Promise<void>
): UseInitializationReturn {
    const auth = useAuth();
    const docs = useDocs();
    const profile = useProfile();
    const feedback = useFeedback();
    const { t, locale } = useI18n();
    const _ = locale.value;

    const [loaded, setLoaded] = useState(false);

    const init = useCallback(async () => {
        try {
            const authenticated = await auth.checkAuthentication();

            if (authenticated && auth.state.value.client.accessToken && auth.state.value.tenant) {
                const { accessToken } = auth.state.value.client;
                const { tenant } = auth.state.value;
                const refresh = auth.refreshTokenIfNeeded;

                await Promise.all([
                    docs.fetchMyDocumentsFolder(accessToken, tenant, refresh),
                    docs.fetchRecentFiles(accessToken, tenant, 1, refresh),
                    profile.fetchProfile(accessToken, tenant, refresh)
                ]);
            }

            await detect();
        } finally {
            setLoaded(true);
        }
    }, [auth, docs, profile, detect]);

    useEffect(() => {
        const checkStorage = async () => {
            const result = await storage.get(['pending_auth_error', 'exchanging_tokens']);
            
            if (result.pending_auth_error) {
                const errorLower = (result.pending_auth_error || '').toLowerCase().trim();
                let translatedError = result.pending_auth_error;
                if (errorLower.includes("not approve") || 
                    errorLower.includes("access not approved") ||
                    errorLower.includes("didn't approve") || 
                    errorLower.includes("did not approve") ||
                    errorLower.includes("user did not approve") ||
                    errorLower.includes("user didn't approve") ||
                    (errorLower.includes("approve") && errorLower.includes("access"))) {
                    translatedError = t('error.access_not_approved');
                } else if (errorLower.includes('cancel') || errorLower.includes('cancelled')) {
                    translatedError = t('error.authentication_cancelled');
                }
                
                feedback.showError(translatedError);
                storage.remove(['pending_auth_error']);
            }
        };

        init();
        checkStorage();
    }, [t, locale, storage, feedback, init]);

    useEffect(() => {
        const hasFiles = Array.isArray(docs.state.value.files);
        const shouldComplete = auth.isAuthenticated.value &&
            !docs.state.value.fetching &&
            hasFiles &&
            !loaded;

        if (shouldComplete) {
            setLoaded(true);
        }
    }, [
        auth.isAuthenticated.value,
        docs.state.value.fetching,
        docs.state.value.files?.length,
        loaded
    ]);

    useEffect(() => {
        if (auth.state.value.error) {
            const errorLower = (auth.state.value.error || '').toLowerCase().trim();
            let translatedError = auth.state.value.error;
            
            if (errorLower.includes("not approve") || 
                errorLower.includes("access not approved") ||
                errorLower.includes("didn't approve") || 
                errorLower.includes("did not approve") ||
                errorLower.includes("user did not approve") ||
                errorLower.includes("user didn't approve") ||
                (errorLower.includes("approve") && errorLower.includes("access"))) {
                translatedError = t('error.access_not_approved');
            } else if (errorLower.includes('cancel') || errorLower.includes('cancelled')) {
                translatedError = t('error.authentication_cancelled');
            }
            
            feedback.showError(translatedError);
        }
    }, [auth.state.value.error, feedback, t, locale]);

    return {
        loaded,
        init
    };
}
