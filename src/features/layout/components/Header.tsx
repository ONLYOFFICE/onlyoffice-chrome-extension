import { FunctionalComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { Logo } from '@features/layout/components/Logo';

import { useProfile } from '@stores/profile';
import { useI18n } from '@stores/i18n';
import { useFeedback } from '@stores/feedback';

import { sidePanel } from '@utils/browser';

import userpicLight from '@icons/userpic.svg';
import userpicDark from '@icons/userpic-dark.svg';
import chatIcon from '@icons/chat.svg';

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
  const { t } = useI18n();
  const profile = useProfile();
  const feedback = useFeedback();
  const [windowId, setWindowId] = useState<number | null>(null);

  useEffect(() => {
    if (sidePanel.supported) sidePanel.getWindowId().then(setWindowId);
  }, []);

  const openChat = () => {
    if (windowId === null) return;
    sidePanel.open(windowId)
      .then(() => window.close())
      .catch((error) => feedback.showError((error as Error).message));
  };

  const prefersDark = typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const fallbackUserpic = prefersDark ? userpicDark : userpicLight;
  const userPicture = profile.state.value.avatar;
  return (
    <header className="header" role="banner">
      <Logo />
      {isAuthenticated && windowId !== null && (
        <button
          type="button"
          className="header__chat-btn"
          onClick={openChat}
          aria-label={t('menu.ai_agent')}
          title={t('menu.ai_agent')}
          disabled={isProfileDisabled}
        >
          <img src={chatIcon} alt="" width="20" height="20" aria-hidden="true" />
        </button>
      )}
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
