import { FunctionalComponent } from 'preact';

import './logout-button.css';

interface LogoutButtonProps {
    readonly onLogout: () => void;
}

export const LogoutButton: FunctionalComponent<LogoutButtonProps> = ({ onLogout }) => {
    return (
        <button 
            type="button"
            class="account-menu__logout" 
            onClick={onLogout}
            aria-label="Log out"
        >
            Log out
        </button>
    );
};
