import { FunctionalComponent } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

import { CloseButton } from '@components/CloseButton';
import { Checkbox } from '@components/Checkbox';
import { Button } from '@components/Button';
import { Input } from '@components/Input';

import { useModal } from '@hooks/useModal';

import { useI18n } from '@stores/i18n';

import './dialog.css';

type FileType = 'document' | 'spreadsheet' | 'presentation' | 'pdf';

interface CreateDialogProps {
  readonly isOpen: boolean;
  readonly fileType: FileType | null;
  readonly onClose: () => void;
  readonly onCreate: (name: string) => void;
  readonly onSavePreference: (skip: boolean) => void;
}

export const CreateDialog: FunctionalComponent<CreateDialogProps> = ({
  isOpen,
  fileType,
  onClose,
  onCreate,
  onSavePreference,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [skip, setSkip] = useState(false);
  const [activeFileType, setActiveFileType] = useState<FileType | null>(null);

  const sanitizedName = name.trim();
  const canCreate = Boolean(sanitizedName);

  const handleCreate = useCallback(() => {
    if (!sanitizedName) {
      return;
    }

    onCreate(sanitizedName);
    onSavePreference(skip);

    setName('');
    setSkip(false);
    onClose();
  }, [sanitizedName, skip, onCreate, onSavePreference, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && canCreate) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [canCreate, handleCreate, onClose]);

  const { render, closing, el } = useModal({
    isOpen,
    onClose,
    onCustomKeyDown: handleKeyDown,
  });

  useEffect(() => {
    if (isOpen && fileType) {
      setActiveFileType(fileType);
      const defaults: Record<FileType, string> = {
        document: t('files.document'),
        spreadsheet: t('files.spreadsheet'),
        presentation: t('files.presentation'),
        pdf: t('files.pdf_form'),
      };
      setName(defaults[fileType]);
    } else if (!isOpen) {
      setActiveFileType(null);
      setName('');
      setSkip(false);
    }
  }, [isOpen, fileType, t]);

  if (!render || !activeFileType) return null;

  return (
    <CreateDialogOverlay isClosing={closing} onClose={onClose}>
      <CreateDialogContent
        el={el}
        activeFileType={activeFileType}
        name={name}
        skip={skip}
        canCreate={canCreate}
        onNameChange={setName}
        onSkipChange={setSkip}
        onCreate={handleCreate}
        onClose={onClose}
      />
    </CreateDialogOverlay>
  );
};

interface CreateDialogOverlayProps {
  readonly isClosing: boolean;
  readonly onClose: () => void;
  readonly children: preact.ComponentChildren;
}

const CreateDialogOverlay: FunctionalComponent<CreateDialogOverlayProps> = ({
  isClosing,
  onClose,
  children,
}) => (
  <div
    className={`create-dialog__overlay ${isClosing ? 'create-dialog__overlay--closing' : ''}`}
    onClick={onClose}
    role="presentation"
  >
    <div className={`create-dialog__container ${isClosing ? 'create-dialog__container--closing' : ''}`}>
      <CloseButton onClick={onClose} ariaLabel="Close" />
      {children}
    </div>
  </div>
);

interface CreateDialogContentProps {
  readonly el: preact.RefObject<HTMLDivElement>;
  readonly activeFileType: FileType;
  readonly name: string;
  readonly skip: boolean;
  readonly canCreate: boolean;
  readonly onNameChange: (value: string) => void;
  readonly onSkipChange: (value: boolean) => void;
  readonly onCreate: () => void;
  readonly onClose: () => void;
}

const CreateDialogContent: FunctionalComponent<CreateDialogContentProps> = ({
  el,
  activeFileType,
  name,
  skip,
  canCreate,
  onNameChange,
  onSkipChange,
  onCreate,
  onClose,
}) => {
  const { t } = useI18n();
  const inputClassName = canCreate
    ? 'create-dialog__input'
    : 'create-dialog__input input--error';

  const titleMap: Record<FileType, string> = {
    document: t('files.new_document'),
    spreadsheet: t('files.new_spreadsheet'),
    presentation: t('files.new_presentation'),
    pdf: t('files.new_pdf_form'),
  };

  return (
    <div
      ref={el}
      className="create-dialog"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-dialog-title"
    >
      <h3 id="create-dialog-title" className="create-dialog__title">
        {titleMap[activeFileType]}
      </h3>

      <Input
        type="text"
        className={inputClassName}
        value={name}
        onChange={onNameChange}
        autoFocus
        placeholder={t('files.enter_file_name')}
      />

      <Checkbox
        className="create-dialog__checkbox"
        checked={skip}
        onChange={onSkipChange}
        label={t('files.dont_ask_file_name')}
      />

      <div className="create-dialog__actions">
        <Button
          variant="primary"
          onClick={onCreate}
          disabled={!canCreate}
        >
          {t('common.create')}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
};
