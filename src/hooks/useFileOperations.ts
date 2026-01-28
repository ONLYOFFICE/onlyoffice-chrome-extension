import { useState, useCallback } from 'preact/hooks';

import { File as RecentFile } from '@stores/docs';
import { useAuth, useDocs, useFeedback } from '@stores/index';

import { DocspaceAPI } from '@utils/http';
import { calculate as calculateHash, download as downloadFile } from '@utils/hash';

interface UseFileOperationsReturn {
    processingFiles: Set<string>;
    processingRecentFiles: Set<number>;
    uploading: boolean;
    fileAction: (action: 'download' | 'edit', url: string, fileName?: string) => void;
    recentAction: (action: 'download' | 'edit' | 'delete', fileId: number, webUrl: string) => void;
    editDetected: (fileUrl: string, fileName: string) => Promise<void>;
    downloadRecent: (fileId: number) => Promise<void>;
    deleteFile: (fileId: number) => Promise<void>;
    upload: (files: FileList) => Promise<void>;
    setUploading: (uploading: boolean) => void;
}

export function useFileOperations(
    api: DocspaceAPI,
    onDelete: (fileId: number, fileName: string) => void
): UseFileOperationsReturn {
    const auth = useAuth();
    const docs = useDocs();
    const feedback = useFeedback();

    const [uploading, setUploading] = useState(false);
    const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
    const [processingRecentFiles, setProcessingRecentFiles] = useState<Set<number>>(new Set());

    const editDetected = useCallback(async (fileUrl: string, fileName: string) => {
        const key = fileUrl + fileName;

        if (!auth.state.value.client.accessToken || !auth.state.value.tenant) {
            feedback.showError('Please sign in to edit files');
            return;
        }

        try {
            setProcessingFiles(prev => new Set(prev).add(key));
            feedback.showError(null);

            const { accessToken } = auth.state.value.client;
            const { tenant } = auth.state.value;
            const blob = await downloadFile(fileUrl, fileName);
            const hash = await calculateHash(blob);

            const existing = await docs.findFileByHash(accessToken, tenant, hash);

            if (existing) {
                chrome.tabs.create({ url: existing.webUrl, active: true });
                feedback.showSuccess('File opened in new tab');
            } else {
                const uploaded = await docs.uploadFile(accessToken, tenant, blob, fileName, hash);
                chrome.tabs.create({ url: uploaded.webUrl, active: true });
                feedback.showSuccess('File uploaded and opened in new tab');
            }
        } catch (error) {
            console.error('Error editing detected file:', error);
            feedback.showError('Failed to open file: ' + (error as Error).message);
        } finally {
            setProcessingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    }, [auth, docs, feedback]);

    const fileAction = useCallback((action: 'download' | 'edit', url: string, fileName?: string) => {
        const key = url + fileName;

        if (processingFiles.has(key)) {
            return;
        }

        if (action === 'download') {
            chrome.downloads.download({ url }, () => {
                if (chrome.runtime.lastError) {
                    chrome.tabs.create({ url, active: true });
                }
            });
        } else if (action === 'edit') {
            if (!auth.isAuthenticated.value) {
                feedback.showError('Please sign in to edit files');
                return;
            }

            if (fileName) {
                editDetected(url, fileName);
            }
        }
    }, [processingFiles, auth.isAuthenticated.value, editDetected]);

    const downloadRecent = useCallback(async (fileId: number) => {
        if (!auth.state.value.client.accessToken || !auth.state.value.tenant) {
            feedback.showError('Not authenticated');
            return;
        }

        try {
            setProcessingRecentFiles(prev => new Set(prev).add(fileId));
            feedback.showError(null);

            const { accessToken } = auth.state.value.client;
            const { tenant } = auth.state.value;
            const url = await api.getDownloadUrl(accessToken, tenant, fileId, auth.refreshTokenIfNeeded);

            chrome.downloads.download({ url }, () => {
                if (chrome.runtime.lastError) {
                    chrome.tabs.create({ url, active: true });
                }
            });
        } catch (error) {
            console.error('Error downloading file:', error);
            feedback.showError('Failed to download file: ' + (error as Error).message);
        } finally {
            setProcessingRecentFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
            });
        }
    }, [auth, api, feedback]);

    const recentAction = useCallback((action: 'download' | 'edit' | 'delete', fileId: number, webUrl: string) => {
        if (processingRecentFiles.has(fileId)) {
            return;
        }

        if (action === 'download') {
            downloadRecent(fileId);
        } else if (action === 'edit') {
            chrome.tabs.create({ url: webUrl, active: true });
        } else if (action === 'delete') {
            const file = docs.state.value.files.find(f => f.id === fileId);
            onDelete(fileId, file?.title || 'this file');
        }
    }, [processingRecentFiles, docs.state.value.files, downloadRecent, onDelete]);

    const deleteFile = useCallback(async (fileId: number) => {
        if (!auth.state.value.client.accessToken || !auth.state.value.tenant) {
            feedback.showError('Not authenticated');
            return;
        }

        try {
            setProcessingRecentFiles(prev => new Set(prev).add(fileId));
            feedback.showError(null);

            const { accessToken } = auth.state.value.client;
            const { tenant } = auth.state.value;
            await api.deleteFile(accessToken, tenant, fileId, auth.refreshTokenIfNeeded);

            feedback.showSuccess('File deleted successfully');

            const page = docs.state.value.currentPage;
            await docs.fetchRecentFiles(accessToken, tenant, page, auth.refreshTokenIfNeeded);
        } catch (error) {
            console.error('Error deleting file:', error);
            feedback.showError('Failed to delete file: ' + (error as Error).message);
        } finally {
            setProcessingRecentFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
            });
        }
    }, [auth, docs, api, feedback]);

    const upload = useCallback(async (files: FileList) => {
        const { accessToken } = auth.state.value.client;
        const { tenant } = auth.state.value;

        try {
            feedback.showError(null);
            setUploading(true);

            let last: RecentFile | null = null;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const hash = await calculateHash(file);

                const existing = await docs.findFileByHash(accessToken, tenant, hash);
                if (existing) {
                    last = existing;
                } else {
                    const uploaded = await docs.uploadFile(accessToken, tenant, file, file.name, hash);
                    last = uploaded;
                }
            }

            feedback.showSuccess(`Successfully uploaded ${files.length} file(s)`);
            await docs.fetchRecentFiles(accessToken, tenant, 1, auth.refreshTokenIfNeeded);

            if (last) {
                chrome.tabs.create({ url: last.webUrl, active: true });
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            feedback.showError('Failed to upload files: ' + (error as Error).message);
        } finally {
            setUploading(false);
        }
    }, [auth, docs, feedback]);

    return {
        processingFiles,
        processingRecentFiles,
        uploading,
        fileAction,
        recentAction,
        editDetected,
        downloadRecent,
        deleteFile,
        upload,
        setUploading
    };
}
