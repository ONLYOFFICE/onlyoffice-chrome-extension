import { FunctionalComponent } from 'preact';

import { useI18n } from '@stores/i18n';

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
  onClick,
}) => (
  <button
    type="button"
    className={`file-item__action ${variant === 'delete' ? 'file-item__action--delete' : ''}`}
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
  onDelete,
}) => {
  const { t } = useI18n();
  const isDisabled = isProcessing || isRemoving;
  const fileName = `${name}.${extension}`;

  return (
    <li
      className={`file-item ${isProcessing ? 'file-item--processing' : ''} ${isRemoving ? 'file-item--removing' : ''}`}
      aria-busy={isProcessing}
    >
      <div className="file-item__icon">
        <img src={icon} alt="" width="32" height="32" />
      </div>
      <div className="file-item__info">
        <span className="file-item__name">{name}</span>
        <span className="file-item__extension">
          .
          {extension}
        </span>
      </div>
      <div className="file-item__actions">
        <FileItemAction
          icon={downloadIcon}
          ariaLabel={t('files.download_file', { fileName })}
          title={t('files.download')}
          onClick={onDownload}
          disabled={isDisabled}
        />
        <FileItemAction
          icon={pencilIcon}
          ariaLabel={t('files.edit_file', { fileName })}
          title={isAuthenticated ? t('files.edit_in_doc_space') : t('files.sign_in_to_edit_files')}
          onClick={onEdit}
          disabled={isDisabled || !isAuthenticated}
        />
        {onDelete && (
        <FileItemAction
          icon={deleteIcon}
          ariaLabel={t('files.delete_file', { fileName })}
          title={t('common.delete')}
          onClick={onDelete}
          disabled={isDisabled}
          variant="delete"
        />
        )}
      </div>
    </li>
  );
};
