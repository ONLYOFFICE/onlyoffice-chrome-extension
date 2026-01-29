import { FunctionalComponent } from 'preact';

import './menu-item.css';

interface MenuItemProps {
  readonly icon: string;
  readonly label: string;
  readonly onClick: () => void;
}

export const MenuItem: FunctionalComponent<MenuItemProps> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    type="button"
    className="create-menu__item"
    onClick={onClick}
    role="menuitem"
  >
    <img src={icon} alt="" className="create-menu__icon" />
    <span className="create-menu__label">{label}</span>
  </button>
);
