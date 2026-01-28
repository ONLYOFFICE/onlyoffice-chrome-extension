import { FunctionalComponent } from 'preact';

import { Logo } from '@features/layout/components/Logo';

import { useProfile } from '@stores/profile';

import userpicIcon from '@icons/userpic.svg';

import './header.css';

interface HeaderProps {
    readonly isAuthenticated: boolean;
    readonly onProfileClick: () => void;
    readonly isProfileDisabled?: boolean;
}

export const Header: FunctionalComponent<HeaderProps> = ({ 
    isAuthenticated,
    onProfileClick,
    isProfileDisabled = false
}) => {
    const profile = useProfile();
    const userPicture = profile.state.value.avatar;
    return (
        <header class="header" role="banner">
            <Logo />
            {isAuthenticated && (
                <button 
                    type="button"
                    class="header__profile-btn" 
                    onClick={onProfileClick}
                    aria-label="Open account menu"
                    title="Account"
                    disabled={isProfileDisabled}
                >
                    <img 
                        src={userPicture || userpicIcon} 
                        alt=""
                        class="header__profile-icon"
                        aria-hidden="true"
                    />
                </button>
            )}
        </header>
    );
};
