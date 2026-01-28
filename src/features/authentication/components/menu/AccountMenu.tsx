import { FunctionalComponent } from 'preact';

import { CloseButton } from '@components/CloseButton';
import { MenuContent } from './MenuContent';

import { useAuth } from '@stores/auth';
import { useProfile } from '@stores/profile';

import { useModal } from '@hooks/useModal';
import { useOpenTab } from '@hooks/useOpenTab';

import './account.css';

interface AccountMenuProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onLogout: () => void;
}

export const AccountMenu: FunctionalComponent<AccountMenuProps> = ({
    isOpen,
    onClose,
    onLogout
}) => {
    const auth = useAuth();
    const profile = useProfile();
    const openTab = useOpenTab({ onClose });
    const { render, visible, el } = useModal({ isOpen, onClose });
    
    const { name, email, avatar } = profile.state.value;
    const tenant = auth.state.value.tenant;

    if (!render) return null;

    const handleGoTo = () => {
        if (tenant) {
            openTab(tenant);
        }
    };

    return (
        <div 
            class={`account-menu__overlay ${visible ? 'account-menu__overlay--open' : ''}`}
            onClick={onClose}
            role="presentation"
            aria-hidden="true"
        >
            <div class={`account-menu__container ${visible ? 'account-menu__container--open' : ''}`}>
                <CloseButton onClick={onClose} ariaLabel="Close menu" />
                <MenuContent
                    el={el}
                    name={name}
                    email={email}
                    avatar={avatar}
                    tenant={tenant}
                    onGoTo={handleGoTo}
                    onOpenTab={openTab}
                    onLogout={onLogout}
                />
            </div>
        </div>
    );
};
