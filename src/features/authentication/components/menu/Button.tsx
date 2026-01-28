import { FunctionalComponent } from 'preact';

import './button.css';

interface ButtonProps {
    readonly onClick: () => void;
    readonly disabled?: boolean;
    readonly ariaLabel: string;
    readonly icon: string;
    readonly text: string;
}

export const Button: FunctionalComponent<ButtonProps> = ({
    onClick,
    disabled = false,
    ariaLabel,
    icon,
    text
}) => {
    return (
        <button 
            type="button"
            class="account-menu__button"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            <img src={icon} alt="" class="account-menu__button-icon" />
            <span class="account-menu__button-text">{text}</span>
        </button>
    );
};
