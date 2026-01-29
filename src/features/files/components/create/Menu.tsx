import { FunctionalComponent } from 'preact';

import { MenuItem } from './MenuItem';

import { useModal } from '@hooks/useModal';

import { useI18n } from '@stores/i18n';

import documentIcon from '@icons/document.svg';
import documentIconDark from '@icons/document-dark.svg';
import spreadsheetIcon from '@icons/spreadsheet.svg';
import spreadsheetIconDark from '@icons/spreadsheet-dark.svg';
import presentationIcon from '@icons/presentation.svg';
import presentationIconDark from '@icons/presentation-dark.svg';
import pdfIcon from '@icons/form.svg';
import pdfIconDark from '@icons/form-dark.svg';
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
    const { t, locale } = useI18n();
    const _ = locale.value;
    const { render, closing, el } = useModal({ isOpen, onClose });
    const isDarkMode =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (!render) return null;

    const menuItems: readonly MenuItem[] = [
        {
            label: t('files.document'),
            onClick: onCreateDocument,
            icon: isDarkMode ? documentIconDark : documentIcon
        },
        {
            label: t('files.spreadsheet'),
            onClick: onCreateSpreadsheet,
            icon: isDarkMode ? spreadsheetIconDark : spreadsheetIcon
        },
        {
            label: t('files.presentation'),
            onClick: onCreatePresentation,
            icon: isDarkMode ? presentationIconDark : presentationIcon
        },
        {
            label: t('files.pdf_form'),
            onClick: onCreatePdf,
            icon: isDarkMode ? pdfIconDark : pdfIcon
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
                        <span class="create-menu__upload-label">{t('files.upload_files')}</span>
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
