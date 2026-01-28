import { FunctionalComponent } from 'preact';

import downloadIcon from '@icons/download.svg';
import pencilIcon from '@icons/pencil.svg';
import deleteIcon from '@icons/clear.svg';

import './file-item.css';

type FileItemActionVariant = 'default' | 'delete';

interface FileItemActionProps {
    readonly icon: string;
    readonly title: string;
    readonly ariaLabel: string;
    readonly disabled?: boolean;
    readonly variant?: FileItemActionVariant;
    readonly onClick: () => void;
}

const FileItemAction: FunctionalComponent<FileItemActionProps> = ({
    icon,
    title,
    ariaLabel,
    disabled = false,
    variant = 'default',
    onClick
}) => (
    <button
        type="button"
        class={`file-item__action ${variant === 'delete' ? 'file-item__action--delete' : ''}`}
        onClick={onClick}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
    >
        <img src={icon} alt="" width="16" height="16" />
    </button>
);

interface FileItemProps {
    readonly icon: string;
    readonly name: string;
    readonly extension: string;
    readonly isProcessing: boolean;
    readonly isAuthenticated: boolean;
    readonly isRemoving?: boolean;
    readonly onDownload: () => void;
    readonly onEdit: () => void;
    readonly onDelete?: () => void;
}

export const FileItem: FunctionalComponent<FileItemProps> = ({
    icon,
    name,
    extension,
    isProcessing,
    isAuthenticated,
    isRemoving = false,
    onDownload,
    onEdit,
    onDelete
}) => {
    const isDisabled = isProcessing || isRemoving;

    return (
        <li 
            class={`file-item ${isProcessing ? 'file-item--processing' : ''} ${isRemoving ? 'file-item--removing' : ''}`}
            aria-busy={isProcessing}
        >
            <div class="file-item__icon">
                <img src={icon} alt="" width="32" height="32" />
            </div>
            <div class="file-item__info">
                <span class="file-item__name">{name}</span>
                <span class="file-item__extension">.{extension}</span>
            </div>
            <div class="file-item__actions">
                {onDelete && (
                    <FileItemAction
                        icon={deleteIcon}
                        ariaLabel={`Delete ${name}.${extension}`}
                        title="Delete"
                        onClick={onDelete}
                        disabled={isDisabled}
                        variant="delete"
                    />
                )}
                <FileItemAction
                    icon={downloadIcon}
                    ariaLabel={`Download ${name}.${extension}`}
                    title="Download"
                    onClick={onDownload}
                    disabled={isDisabled}
                />
                <FileItemAction
                    icon={pencilIcon}
                    ariaLabel={`Edit ${name}.${extension}`}
                    title={isAuthenticated ? 'Edit in DocSpace' : 'Sign in to edit files'}
                    onClick={onEdit}
                    disabled={isDisabled || !isAuthenticated}
                />
            </div>
        </li>
    );
};
