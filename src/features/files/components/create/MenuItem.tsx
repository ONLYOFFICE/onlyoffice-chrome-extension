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
    onClick
}) => (
    <button
        type="button"
        class="create-menu__item"
        onClick={onClick}
        role="menuitem"
    >
        <img src={icon} alt="" class="create-menu__icon" />
        <span class="create-menu__label">{label}</span>
    </button>
);


