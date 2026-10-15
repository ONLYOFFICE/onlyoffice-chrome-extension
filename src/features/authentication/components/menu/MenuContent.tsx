import { FunctionalComponent } from 'preact';

import { useI18n } from '@stores/i18n';

import { UserInfo } from './UserInfo';
import { MenuOptions } from './MenuOptions';
import { LogoutButton } from './LogoutButton';

import './menu-content.css';

interface MenuContentProps {
  readonly el: preact.RefObject<HTMLDivElement>;
  readonly name: string;
  readonly email: string;
  readonly avatar?: string;
  readonly tenant: string | null;
  readonly onGoTo: () => void;
  readonly onOpenTab: (url: string) => void;
  readonly onLogout: () => void;
}

export const MenuContent: FunctionalComponent<MenuContentProps> = ({
  el,
  name,
  email,
  avatar,
  tenant,
  onGoTo,
  onOpenTab,
  onLogout,
}) => {
  const { t } = useI18n();

  return (
    <div
      className="account-menu"
      ref={el}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={t('menu.account_menu')}
    >
      <UserInfo name={name} email={email} avatar={avatar} />
      <MenuOptions tenant={tenant} onGoTo={onGoTo} onOpenTab={onOpenTab} />
      <div className="account-menu__logout-container">
        <LogoutButton onLogout={onLogout} />
      </div>
    </div>
  );
};
