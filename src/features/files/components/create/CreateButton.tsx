import { FunctionalComponent } from 'preact';

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
}) => (
  <button
    type="button"
    className={`create-button ${isOpen ? 'create-button--open' : ''}`}
    onClick={onClick}
    disabled={disabled}
    aria-label={isOpen ? 'Close creation menu' : 'Create new file'}
    aria-expanded={isOpen}
    aria-haspopup="menu"
    title="Create new file"
  >
    {isOpen ? (
      <span className="create-button__close" aria-hidden="true">×</span>
    ) : (
      <img src={fabIcon} alt="" width="48" height="48" />
    )}
  </button>
);
