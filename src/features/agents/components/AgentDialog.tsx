import { FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';

import { Input } from '@components/Input';
import { Button } from '@components/Button';
import { CloseButton } from '@components/CloseButton';

import { useModal } from '@hooks/useModal';

import { useI18n } from '@stores/i18n';

import '@features/agents/components/dialog.css';
import '@features/files/components/create/dialog.css';

interface AgentDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCreate: (title: string, prompt: string) => Promise<boolean>;
}

export const AgentDialog: FunctionalComponent<AgentDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const canCreate = Boolean(title.trim());

  const create = async () => {
    if (!canCreate) return;
    onClose();
    if (await onCreate(title.trim(), prompt.trim())) {
      setTitle('');
      setPrompt('');
    }
  };

  const { render, closing, el } = useModal({
    isOpen,
    onClose,
    onCustomKeyDown: (event) => {
      if (event.key === 'Escape') onClose();
    },
  });

  if (!render) return null;

  return (
    <div
      className={`create-dialog__overlay ${closing ? 'create-dialog__overlay--closing' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`create-dialog__container ${closing ? 'create-dialog__container--closing' : ''}`}
      >
        <CloseButton onClick={onClose} ariaLabel={t('common.close')} />
        <div
          ref={el}
          className="create-dialog"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-dialog-title"
        >
          <h3 id="agent-dialog-title" className="create-dialog__title">
            {t('agents.new_agent')}
          </h3>

          <Input
            value={title}
            onChange={setTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') create();
            }}
            placeholder={t('agents.name_placeholder')}
            autoFocus
          />
          <textarea
            className="input agent-dialog__textarea"
            value={prompt}
            onInput={(event) => setPrompt((event.target as HTMLTextAreaElement).value)}
            placeholder={t('agents.instructions_placeholder')}
            rows={4}
          />

          <div className="create-dialog__actions">
            <Button variant="primary" onClick={create} disabled={!canCreate}>
              {t('common.create')}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
