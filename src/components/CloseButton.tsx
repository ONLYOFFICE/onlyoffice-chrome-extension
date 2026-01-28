import { FunctionalComponent } from 'preact';

import crossIcon from '@icons/cross.svg';

import './close-button.css';

interface CloseButtonProps {
    readonly onClick: () => void;
    readonly ariaLabel: string;
}

export const CloseButton: FunctionalComponent<CloseButtonProps> = ({
    onClick,
    ariaLabel
}) => {
    return (
        <button 
            type="button"
            class="close-button"
            onClick={onClick}
            aria-label={ariaLabel}
        >
            <img src={crossIcon} alt="Close" width="17" height="17" />
        </button>
    );
};

