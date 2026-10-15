import { FunctionalComponent } from 'preact';

import { useI18n } from '@stores/i18n';

import personIcon from '@icons/person.svg';
import personDarkIcon from '@icons/person-dark.svg';

import './user-info.css';

interface UserInfoProps {
  readonly name: string;
  readonly email: string;
  readonly avatar?: string;
}

export const UserInfo: FunctionalComponent<UserInfoProps> = ({ name, email, avatar }) => {
  const { t } = useI18n();
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentPersonIcon = isDarkMode ? personDarkIcon : personIcon;

  return (
    <div className="account-menu__user" aria-label={t('menu.user_information')}>
      <div className="account-menu__user-icon" aria-hidden="true">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="account-menu__user-avatar"
          />
        ) : (
          <img
            src={currentPersonIcon}
            alt=""
            className="account-menu__user-avatar-placeholder"
          />
        )}
      </div>
      <div className="account-menu__user-info">
        <div className="account-menu__user-name">{name}</div>
        <div className="account-menu__user-email">{email}</div>
      </div>
    </div>
  );
};
