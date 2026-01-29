import { FunctionalComponent, ComponentChildren } from 'preact';

import { Spinner } from '@components/Spinner';

import { Header } from '@features/layout';
import { Error, Success } from '@features/feedback';
import { AccountMenu } from '@features/authentication';
import {
  CreateMenu, CreateDialog, DeleteConfirm, CreateButton,
} from '@features/files';

import { useI18n } from '@stores/i18n';

interface LayoutProps {
  readonly children: ComponentChildren;
  readonly isAuthenticated: boolean;
  readonly tenantUrl: string | null;
  readonly accountMenuOpen: boolean;
  readonly createMenuOpen: boolean;
  readonly newFileDialog: {
    isOpen: boolean;
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf' | null;
  };
  readonly confirmModal: {
    isOpen: boolean;
    fileId?: number;
    fileName?: string;
  };
  readonly errorMessage: string | null;
  readonly successMessage: string | null;
  readonly isProfileDisabled?: boolean;
  readonly isFabDisabled?: boolean;
  readonly isUploading?: boolean;
  readonly onProfileClick: () => void;
  readonly onAccountMenuClose: () => void;
  readonly onLogout: () => void;
  readonly onCreateMenuToggle: () => void;
  readonly onCreateMenuClose: () => void;
  readonly onCreateDocument: () => void;
  readonly onCreateSpreadsheet: () => void;
  readonly onCreatePresentation: () => void;
  readonly onCreatePdf: () => void;
  readonly onUploadFiles: () => void;
  readonly onNewFileDialogClose: () => void;
  readonly onNewFileDialogCreate: (name: string) => void;
  readonly onNewFileDialogSavePreference: (skip: boolean) => void;
  readonly onConfirmModalConfirm: () => void;
  readonly onConfirmModalCancel: () => void;
  readonly onErrorDismiss?: () => void;
  readonly onSuccessDismiss?: () => void;
}

export const Layout: FunctionalComponent<LayoutProps> = ({
  children,
  isAuthenticated,
  tenantUrl,
  accountMenuOpen,
  createMenuOpen,
  newFileDialog,
  confirmModal,
  errorMessage,
  successMessage,
  isProfileDisabled,
  isFabDisabled,
  isUploading,
  onProfileClick,
  onAccountMenuClose,
  onLogout,
  onCreateMenuToggle,
  onCreateMenuClose,
  onCreateDocument,
  onCreateSpreadsheet,
  onCreatePresentation,
  onCreatePdf,
  onUploadFiles,
  onNewFileDialogClose,
  onNewFileDialogCreate,
  onNewFileDialogSavePreference,
  onConfirmModalConfirm,
  onConfirmModalCancel,
  onErrorDismiss,
  onSuccessDismiss,
}) => {
  const { t } = useI18n();
  const showCreateButton = isAuthenticated && !createMenuOpen;
  return (
    <div className="main-container">
      <Header
        isAuthenticated={isAuthenticated}
        onProfileClick={onProfileClick}
        isProfileDisabled={isProfileDisabled}
      />

      <div className="notifications-overlay">
        <Error message={errorMessage} onClose={onErrorDismiss} />
        <Success message={successMessage} onClose={onSuccessDismiss} />
      </div>

      {isUploading && (
        <div className="uploading-overlay">
          <div className="uploading-overlay__content">
            <Spinner />
            <p className="uploading-overlay__text">{t('files.uploading_files')}</p>
          </div>
        </div>
      )}

      <div className="panel-content">
        {children}
        {showCreateButton && (
        <div className="create-button__section">
          <CreateButton
            onClick={onCreateMenuToggle}
            isOpen={createMenuOpen}
            disabled={isFabDisabled}
          />
        </div>
        )}
      </div>

      <DeleteConfirm
        isOpen={confirmModal.isOpen}
        fileName={confirmModal.fileName}
        onConfirm={onConfirmModalConfirm}
        onCancel={onConfirmModalCancel}
      />

      {isAuthenticated && (
        <AccountMenu
          isOpen={accountMenuOpen}
          onClose={onAccountMenuClose}
          onLogout={onLogout}
        />
      )}

      {isAuthenticated && (
        <>
          <CreateMenu
            isOpen={createMenuOpen}
            onClose={onCreateMenuClose}
            onCreateDocument={onCreateDocument}
            onCreateSpreadsheet={onCreateSpreadsheet}
            onCreatePresentation={onCreatePresentation}
            onCreatePdf={onCreatePdf}
            onUploadFiles={onUploadFiles}
          />
          <CreateDialog
            isOpen={newFileDialog.isOpen}
            fileType={newFileDialog.fileType}
            onClose={onNewFileDialogClose}
            onCreate={onNewFileDialogCreate}
            onSavePreference={onNewFileDialogSavePreference}
          />
        </>
      )}
    </div>
  );
};
