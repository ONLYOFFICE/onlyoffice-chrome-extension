import { useState, useEffect, useCallback } from 'preact/hooks';
import { Storage } from '@utils/storage';
import { useAuth, useDocs, useProfile, useFeedback } from '@stores/index';

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
        } catch (error) {
            console.error('Initialization error:', error);
        } finally {
            setLoaded(true);
        }
    }, [auth, docs, profile, detect]);

    useEffect(() => {
        const checkStorage = async () => {
            const result = await storage.get(['pending_auth_error', 'exchanging_tokens']);
            
            if (result.pending_auth_error) {
                feedback.showError(result.pending_auth_error);
                storage.remove(['pending_auth_error']);
            }
        };

        init();
        checkStorage();
    }, []);

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
            feedback.showError(auth.state.value.error);
        }
    }, [auth.state.value.error, feedback]);

    return {
        loaded,
        init
    };
}
