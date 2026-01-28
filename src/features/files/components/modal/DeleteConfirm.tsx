import { FunctionalComponent } from 'preact';
import { useCallback } from 'preact/hooks';

import { CloseButton } from '@components/CloseButton';

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
    onCancel
}) => {
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
        [onConfirm, onCancel]
    );

    const { render, closing, el } = useModal({ 
        isOpen, 
        onClose: onCancel,
        onCustomKeyDown: handleKeyDown
    });

    if (!render) return null;

    return (
        <div 
            class={`delete-confirm__overlay ${closing ? 'delete-confirm__overlay--closing' : ''}`}
            onClick={onCancel}
            role="presentation"
        >
            <div class={`delete-confirm__container ${closing ? 'delete-confirm__container--closing' : ''}`}>
                <CloseButton onClick={onCancel} ariaLabel="Close" />
                
                <div 
                    ref={el}
                    class="delete-confirm" 
                    onClick={(e) => e.stopPropagation()}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-confirm-title"
                    aria-describedby="delete-confirm-message"
                >
                    <h3 id="delete-confirm-title" class="delete-confirm__title">
                        Move to Trash?
                    </h3>
                    
                    <p id="delete-confirm-message" class="delete-confirm__message">
                        {fileName
                            ? `Are you sure you want to move "${fileName}" to the trash?`
                            : 'Are you sure you want to continue?'}
                    </p>
                    
                    <div class="delete-confirm__actions">
                        <button 
                            type="button"
                            class="delete-confirm__btn delete-confirm__btn--primary"
                            onClick={onConfirm}
                        >
                            Move to Trash
                        </button>
                        <button 
                            type="button"
                            class="delete-confirm__btn delete-confirm__btn--secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
