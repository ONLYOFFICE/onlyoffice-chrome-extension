import { FunctionalComponent } from 'preact';
import { useCallback } from 'preact/hooks';

import { CloseButton } from '@components/CloseButton';

import { useI18n } from '@stores/i18n';

import { useModal } from '@hooks/useModal';

import './delete-confirm.css';

interface DeleteConfirmProps {
  readonly isOpen: boolean;
  readonly fileName?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export const DeleteConfirm: FunctionalComponent<DeleteConfirmProps> = ({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
}) => {
  const { t, locale } = useI18n();
  const _ = locale.value;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
      }
    },
    [onConfirm, onCancel],
  );

  const { render, closing, el } = useModal({
    isOpen,
    onClose: onCancel,
    onCustomKeyDown: handleKeyDown,
  });

  if (!render) return null;

  return (
    <div
      className={`delete-confirm__overlay ${closing ? 'delete-confirm__overlay--closing' : ''}`}
      onClick={onCancel}
      role="presentation"
    >
      <div className={`delete-confirm__container ${closing ? 'delete-confirm__container--closing' : ''}`}>
        <CloseButton onClick={onCancel} ariaLabel={t('common.close')} />

        <div
          ref={el}
          className="delete-confirm"
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          aria-describedby="delete-confirm-message"
        >
          <h3 id="delete-confirm-title" className="delete-confirm__title">
            {t('files.move_to_trash')}
            ?
          </h3>

          <p id="delete-confirm-message" className="delete-confirm__message">
            {fileName
              ? t('files.move_to_trash_confirm', { fileName })
              : t('files.move_to_trash_confirm_generic')}
          </p>

          <div className="delete-confirm__actions">
            <button
              type="button"
              className="delete-confirm__btn delete-confirm__btn--primary"
              onClick={onConfirm}
            >
              {t('files.move_to_trash')}
            </button>
            <button
              type="button"
              className="delete-confirm__btn delete-confirm__btn--secondary"
              onClick={onCancel}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
