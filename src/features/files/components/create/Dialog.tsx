import { FunctionalComponent } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';

import { CloseButton } from '@components/CloseButton';
import { Checkbox } from '@components/Checkbox';
import { Button } from '@components/Button';
import { Input } from '@components/Input';

import { useModal } from '@hooks/useModal';

import './dialog.css';

type FileType = 'document' | 'spreadsheet' | 'presentation' | 'pdf';

interface CreateDialogProps {
    readonly isOpen: boolean;
    readonly fileType: FileType | null;
    readonly onClose: () => void;
    readonly onCreate: (name: string) => void;
    readonly onSavePreference: (skip: boolean) => void;
}

const DEFAULTS: Record<FileType, string> = {
    document: 'Document',
    spreadsheet: 'Spreadsheet',
    presentation: 'Presentation',
    pdf: 'PDF Form'
};

export const CreateDialog: FunctionalComponent<CreateDialogProps> = ({
    isOpen,
    fileType,
    onClose,
    onCreate,
    onSavePreference
}) => {
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
        onCustomKeyDown: handleKeyDown
    });

    useEffect(() => {
        if (isOpen && fileType) {
            setActiveFileType(fileType);
            setName(DEFAULTS[fileType]);
        } else if (!isOpen) {
            setActiveFileType(null);
            setName('');
            setSkip(false);
        }
    }, [isOpen, fileType]);

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
    children
}) => {
    return (
        <div 
            class={`create-dialog__overlay ${isClosing ? 'create-dialog__overlay--closing' : ''}`}
            onClick={onClose}
            role="presentation"
        >
            <div class={`create-dialog__container ${isClosing ? 'create-dialog__container--closing' : ''}`}>
                <CloseButton onClick={onClose} ariaLabel="Close" />
                {children}
            </div>
        </div>
    );
};

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
    onClose
}) => {
    return (
        <div 
            ref={el}
            class="create-dialog" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-dialog-title"
        >
            <h3 id="create-dialog-title" class="create-dialog__title">
                New {activeFileType}
            </h3>
            
            <Input
                type="text"
                className="create-dialog__input"
                value={name}
                onChange={onNameChange}
                autoFocus
                placeholder="Enter file name"
            />
            
            <Checkbox
                className="create-dialog__checkbox"
                checked={skip}
                onChange={onSkipChange}
                label="Don't ask file name again on creation"
            />
            
            <div class="create-dialog__actions">
                <Button
                    variant="primary"
                    onClick={onCreate}
                    disabled={!canCreate}
                >
                    Create
                </Button>
                <Button
                    variant="secondary"
                    onClick={onClose}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
};
