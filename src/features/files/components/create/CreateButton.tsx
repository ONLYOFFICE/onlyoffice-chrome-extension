import { FunctionalComponent } from 'preact';

import { useI18n } from '@stores/i18n';

import fabIcon from '@icons/fab.svg';

import './create-button.css';

interface CreateButtonProps {
  readonly isOpen: boolean;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

export const CreateButton: FunctionalComponent<CreateButtonProps> = ({
  isOpen,
  onClick,
  disabled,
}) => {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className={`create-button ${isOpen ? 'create-button--open' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isOpen ? t('files.close_creation_menu') : t('files.create_new_file')}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      title={t('files.create_new_file')}
    >
      {isOpen ? (
        <span className="create-button__close" aria-hidden="true">×</span>
      ) : (
        <img src={fabIcon} alt="" width="48" height="48" />
      )}
    </button>
  );
};
