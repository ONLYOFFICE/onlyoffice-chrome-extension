import { FunctionalComponent } from 'preact';

import { useI18n } from '@stores/i18n';

import './logout-button.css';

interface LogoutButtonProps {
    readonly onLogout: () => void;
}

export const LogoutButton: FunctionalComponent<LogoutButtonProps> = ({ onLogout }) => {
    const { t, locale } = useI18n();
    const _ = locale.value;
    
    return (
        <button 
            type="button"
            class="account-menu__logout" 
            onClick={onLogout}
            aria-label={t('menu.log_out')}
        >
            {t('menu.log_out')}
        </button>
    );
};
