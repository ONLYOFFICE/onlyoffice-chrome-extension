import { FunctionalComponent } from 'preact';

import { MenuItem } from './MenuItem';

import { useModal } from '@hooks/useModal';

import documentIcon from '@icons/document.svg';
import spreadsheetIcon from '@icons/spreadsheet.svg';
import presentationIcon from '@icons/presentation.svg';
import pdfIcon from '@icons/form.svg';
import uploadIcon from '@icons/upload.svg';
import minusIcon from '@icons/minus.svg';

import './menu.css';

interface CreateMenuProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onCreateDocument: () => void;
    readonly onCreateSpreadsheet: () => void;
    readonly onCreatePresentation: () => void;
    readonly onCreatePdf: () => void;
    readonly onUploadFiles: () => void;
}

interface MenuItem {
    readonly icon: string;
    readonly label: string;
    readonly onClick: () => void;
}

export const CreateMenu: FunctionalComponent<CreateMenuProps> = ({
    isOpen,
    onClose,
    onCreateDocument,
    onCreateSpreadsheet,
    onCreatePresentation,
    onCreatePdf,
    onUploadFiles
}) => {
    const { render, closing, el } = useModal({ isOpen, onClose });

    if (!render) return null;

    const menuItems: readonly MenuItem[] = [
        {
            label: 'Document',
            onClick: onCreateDocument,
            icon: documentIcon
        },
        {
            label: 'Spreadsheet',
            onClick: onCreateSpreadsheet,
            icon: spreadsheetIcon
        },
        {
            label: 'Presentation',
            onClick: onCreatePresentation,
            icon: presentationIcon
        },
        {
            label: 'PDF Form',
            onClick: onCreatePdf,
            icon: pdfIcon
        }
    ];

    return (
        <div 
            class={`create-menu__overlay ${closing ? 'create-menu__overlay--closing' : ''}`}
            onClick={onClose}
            role="presentation"
        >
            <div class={`create-menu__container ${closing ? 'create-menu__container--closing' : ''}`}>
                <div 
                    ref={el}
                    class="create-menu" 
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                >
                    <div class="create-menu__options">
                        {menuItems.map((item) => (
                            <MenuItem
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                onClick={item.onClick}
                            />
                        ))}
                    </div>
                    
                    <div class="create-menu__divider" />
                    
                    <button 
                        type="button"
                        class="create-menu__upload"
                        onClick={onUploadFiles}
                        role="menuitem"
                    >
                        <img src={uploadIcon} alt="" class="create-menu__upload-icon" />
                        <span class="create-menu__upload-label">Upload files</span>
                    </button>
                </div>
                
                <button 
                    type="button"
                    class="create-menu__fab" 
                    onClick={onClose}
                    aria-label="Close menu"
                >
                    <img src={minusIcon} alt="Close" width="48" height="48" />
                </button>
            </div>
        </div>
    );
};
