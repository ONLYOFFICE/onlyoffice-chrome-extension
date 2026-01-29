import { FunctionalComponent } from 'preact';

import { Logo } from '@features/layout/components/Logo';

import { useProfile } from '@stores/profile';
import { useI18n } from '@stores/i18n';

import userpicLight from '@icons/userpic.svg';
import userpicDark from '@icons/userpic-dark.svg';

import './header.css';

interface HeaderProps {
  readonly isAuthenticated: boolean;
  readonly onProfileClick: () => void;
  readonly isProfileDisabled?: boolean;
}

export const Header: FunctionalComponent<HeaderProps> = ({
  isAuthenticated,
  onProfileClick,
  isProfileDisabled = false,
}) => {
  const profile = useProfile();
  const { t } = useI18n();
  const prefersDark = typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const fallbackUserpic = prefersDark ? userpicDark : userpicLight;
  const userPicture = profile.state.value.avatar;
  return (
    <header className="header" role="banner">
      <Logo />
      {isAuthenticated && (
        <button
          type="button"
          className="header__profile-btn"
          onClick={onProfileClick}
          aria-label="Open account menu"
          title={t('menu.account')}
          disabled={isProfileDisabled}
        >
          <img
            src={userPicture || fallbackUserpic}
            alt=""
            className="header__profile-icon"
            aria-hidden="true"
          />
        </button>
      )}
    </header>
  );
};
