import { useState, useEffect } from 'preact/hooks';

import { Layout } from '@pages/Layout';
import { AuthPage } from '@pages/Auth';
import { FilesPage } from '@pages/Files';

import { Spinner } from '@components/Spinner';

import { useAuth, useDocs, useFeedback, useProfile } from '@stores/index';

import { Format } from '@utils/formats';
import { Storage } from '@utils/storage';
import { DocspaceAPI } from '@utils/http';
import { Detector } from '@utils/detector';

import { useFileCreation } from '@hooks/useFileCreation';
import { useFileDetection } from '@hooks/useFileDetection';
import { useTokenExchange } from '@hooks/useTokenExchange';
import { useFileOperations } from '@hooks/useFileOperations';
import { useInitialization } from '@hooks/useInitialization';

import formats from '@vendor/document-formats/onlyoffice-docs-formats.json';

import '@styles/extension.css';

const VALID_FORMATS = (formats as Format[]).filter(f => f.actions.length > 0);
const ACCEPTED_FILE_TYPES = VALID_FORMATS.map(f => `.${f.name}`).join(',');

type FileType = 'document' | 'spreadsheet' | 'presentation' | 'pdf';

interface NewFileDialogState {
    isOpen: boolean;
    fileType: FileType | null;
}

interface ConfirmModalState {
    isOpen: boolean;
    fileId?: number;
    fileName?: string;
}

export function App() {
    const auth = useAuth();
    const docs = useDocs();
    const profile = useProfile();
    const feedback = useFeedback();

    const [createMenuOpen, setCreateMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [newFileDialog, setNewFileDialog] = useState<NewFileDialogState>({ isOpen: false, fileType: null });
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ isOpen: false });

    const [detector] = useState(() => new Detector());
    const [storage] = useState(() => new Storage());
    const [api] = useState(() => new DocspaceAPI(storage));

    const { files, detecting, detect } = useFileDetection(detector);
    const { loaded, init } = useInitialization(storage, detect);
    const { exchange } = useTokenExchange({ storage, onSuccess: init });

    useEffect(() => {
        storage.get(['exchanging_tokens']).then(result => {
            if (result.exchanging_tokens) {
                exchange();
            }
        });
    }, [storage, exchange]);

    const openNewFileDialog = (fileType: FileType) => {
        setNewFileDialog({ isOpen: true, fileType });
    };

    const closeNewFileDialog = () => {
        setNewFileDialog({ isOpen: false, fileType: null });
    };

    const openConfirmModal = (fileId: number, fileName: string) => {
        setConfirmModal({ isOpen: true, fileId, fileName });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false });
    };

    const {
        processingFiles,
        processingRecentFiles,
        uploading,
        fileAction,
        recentAction,
        deleteFile,
        upload,
        setUploading
    } = useFileOperations(api, openConfirmModal);

    const {
        dontAskFileName,
        createFile,
        createFileType,
        setDontAsk
    } = useFileCreation(storage, openNewFileDialog, () => setCreateMenuOpen(false));

    async function handleSignIn() {
        try {
            feedback.showError(null);
            await auth.startSignIn();
            
            if (auth.state.value.client.accessToken && auth.state.value.tenant) {
                const { accessToken } = auth.state.value.client;
                const { tenant } = auth.state.value;
                const refreshToken = auth.refreshTokenIfNeeded;

                await Promise.all([
                    docs.fetchMyDocumentsFolder(accessToken, tenant, refreshToken),
                    docs.fetchRecentFiles(accessToken, tenant, 1, refreshToken),
                    profile.fetchProfile(accessToken, tenant, refreshToken)
                ]);
            }
            
            await detect();
        } catch (error) {
            console.error('Sign-in error:', error);
            feedback.showError('Sign-in failed: ' + (error as Error).message);
        }
    }

    async function handleLogout() {
        try {
            setAccountMenuOpen(false);
            await auth.logout();
            await docs.clear();
            profile.clearProfile();
            await detect();
        } catch (error) {
            alert('Error logging out: ' + (error as Error).message);
        }
    }

    function handleNewFileDialogCreate(fileName: string) {
        if (newFileDialog.fileType) {
            createFile(newFileDialog.fileType, fileName);
        }
    }

    function handleCreateDocument() {
        createFileType('document', 'New document');
    }

    function handleCreateSpreadsheet() {
        createFileType('spreadsheet', 'New spreadsheet');
    }

    function handleCreatePresentation() {
        createFileType('presentation', 'New presentation');
    }

    function handleCreatePdf() {
        createFileType('pdf', 'New PDF');
    }

    function handleUploadFiles() {
        if (!auth.state.value.client.accessToken || !auth.state.value.tenant) {
            feedback.showError('Please sign in to upload files');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = ACCEPTED_FILE_TYPES;
        
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files || files.length === 0) return;
            await upload(files);
        };

        input.click();
    }

    async function handleConfirmDeleteClick() {
        const fileId = confirmModal.fileId;
        if (!fileId) return;

        closeConfirmModal();
        await deleteFile(fileId);
    }

    const isSigningIn = auth.isSigningIn.value;
    const isExchanging = auth.isExchanging.value;
    const isAuthenticated = auth.isAuthenticated.value;
    const isLoading = auth.isLoading.value;

    if (isLoading) {
        return (
            <div class="main-container">
                <div class="panel-content">
                    <div class="loading-container loading-container--full">
                        <Spinner />
                    </div>
                </div>
            </div>
        );
    }

    const isDisabled = detecting || docs.state.value.fetching || !loaded;
    const currentPage = isAuthenticated ? (
        <FilesPage
            detectedFiles={files}
            recentFiles={docs.state.value.files || []}
            detector={detector}
            processingFiles={processingFiles}
            processingRecentFiles={processingRecentFiles}
            isAuthenticated={auth.isAuthenticated.value}
            isFetching={docs.state.value.fetching || false}
            hasMore={docs.state.value.hasMore || false}
            loadingMore={false}
            initialLoadComplete={loaded}
            detectingFiles={detecting}
            onDetectedFileAction={fileAction}
            onRecentFileAction={recentAction}
            onRefresh={detect}
        />
    ) : (
        <AuthPage
            isSigningIn={isSigningIn}
            isExchanging={isExchanging}
            detectedFiles={files}
            detector={detector}
            processingFiles={processingFiles}
            onSignIn={handleSignIn}
            onDetectedFileAction={fileAction}
            onRefresh={detect}
        />
    );

    return (
            <Layout
            isAuthenticated={isAuthenticated}
            tenantUrl={auth.state.value.tenant}
            accountMenuOpen={accountMenuOpen}
            createMenuOpen={createMenuOpen}
            newFileDialog={newFileDialog}
            confirmModal={confirmModal}
            errorMessage={feedback.state.value.errorMessage}
            successMessage={feedback.state.value.successMessage}
            isProfileDisabled={isDisabled}
            isFabDisabled={isDisabled}
            isUploading={uploading}
            onProfileClick={() => setAccountMenuOpen(true)}
            onAccountMenuClose={() => setAccountMenuOpen(false)}
            onLogout={handleLogout}
            onCreateMenuToggle={() => setCreateMenuOpen(!createMenuOpen)}
            onCreateMenuClose={() => setCreateMenuOpen(false)}
            onCreateDocument={handleCreateDocument}
            onCreateSpreadsheet={handleCreateSpreadsheet}
            onCreatePresentation={handleCreatePresentation}
            onCreatePdf={handleCreatePdf}
            onUploadFiles={handleUploadFiles}
            onNewFileDialogClose={closeNewFileDialog}
            onNewFileDialogCreate={handleNewFileDialogCreate}
            onNewFileDialogSavePreference={setDontAsk}
            onConfirmModalConfirm={handleConfirmDeleteClick}
            onConfirmModalCancel={closeConfirmModal}
            onErrorDismiss={feedback.clearError}
            onSuccessDismiss={feedback.clearSuccess}
        >
            {currentPage}
        </Layout>
    );
}
