import { FunctionalComponent } from 'preact';

import { CloseButton } from '@components/CloseButton';

import { useAuth } from '@stores/auth';
import { useProfile } from '@stores/profile';

import { useModal } from '@hooks/useModal';
import { useOpenTab } from '@hooks/useOpenTab';
import { MenuContent } from './MenuContent';

import './account.css';

interface AccountMenuProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onLogout: () => void;
}

export const AccountMenu: FunctionalComponent<AccountMenuProps> = ({
  isOpen,
  onClose,
  onLogout,
}) => {
  const auth = useAuth();
  const profile = useProfile();
  const openTab = useOpenTab({ onClose });
  const { render, visible, el } = useModal({ isOpen, onClose });

  const { name, email, avatar } = profile.state.value;
  const { tenant } = auth.state.value;

  if (!render) return null;

  const handleGoTo = () => {
    if (tenant) {
      openTab(tenant);
    }
  };

  return (
    <div
      className={`account-menu__overlay ${visible ? 'account-menu__overlay--open' : ''}`}
      onClick={onClose}
      role="presentation"
      aria-hidden="true"
    >
      <div className={`account-menu__container ${visible ? 'account-menu__container--open' : ''}`}>
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
