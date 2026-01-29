import { useState, useCallback, useEffect } from 'preact/hooks';

import { useAuth, useDocs, useFeedback, useI18n } from '@stores/index';

import { Storage } from '@utils/storage';

type FileType = 'document' | 'spreadsheet' | 'presentation' | 'pdf';

interface UseFileCreationReturn {
    dontAskFileName: boolean;
    createFile: (fileType: FileType, fileName: string) => Promise<void>;
    createFileType: (fileType: FileType, defaultName: string) => void;
    setDontAsk: (checked: boolean) => void;
}

export function useFileCreation(
    storage: Storage,
    openNewFileDialog: (fileType: FileType) => void,
    closeCreateMenu: () => void
): UseFileCreationReturn {
    const auth = useAuth();
    const docs = useDocs();
    const feedback = useFeedback();
    const { t, locale } = useI18n();
    const _ = locale.value;
    
    const [dontAskFileName, setDontAskFileName] = useState(false);

    useEffect(() => {
        const loadPreference = async () => {
            const result = await storage.get(['dont_ask_file_name']);
            if (result.dont_ask_file_name) {
                setDontAskFileName(true);
            }
        };

        loadPreference();
    }, [storage]);

    const createFile = useCallback(async (fileType: FileType, fileName: string) => {
        if (!auth.state.value.client.accessToken || !auth.state.value.tenant) {
            feedback.showError(t('files.please_sign_in_to_create_files'));
            return;
        }

        try {
            feedback.showError(null);
            const { accessToken } = auth.state.value.client;
            const { tenant } = auth.state.value;

            const file = await docs.createFile(accessToken, tenant, fileName, fileType, auth.refreshTokenIfNeeded);

            feedback.showSuccess(t('files.file_created_successfully'));

            chrome.tabs.create({ url: file.webUrl, active: true });
        } catch (error) {
            feedback.showError(t('error.failed_to_create_file', { message: (error as Error).message }));
        }
    }, [auth, docs, feedback, t]);

    const setDontAsk = useCallback((checked: boolean) => {
        setDontAskFileName(checked);
        storage.set({ dont_ask_file_name: checked });
    }, [storage]);

    const createFileType = useCallback((fileType: FileType, defaultName: string) => {
        closeCreateMenu();
        if (dontAskFileName)
            createFile(fileType, defaultName);
        else
            openNewFileDialog(fileType);
    }, [dontAskFileName, createFile, openNewFileDialog, closeCreateMenu]);

    return {
        dontAskFileName,
        createFile,
        createFileType,
        setDontAsk
    };
}
