import { FunctionalComponent } from 'preact';

import { Button } from './Button';

import helpIcon from '@icons/help.svg';
import infoIcon from '@icons/info.svg';
import personIcon from '@icons/person.svg';
import supportIcon from '@icons/support.svg';

import { HELP_LINK, FEEDBACK_LINK, ABOUT_LINK } from '@config';

import './menu-options.css';

interface MenuOptionsProps {
    readonly tenant: string | null;
    readonly onGoTo: () => void;
    readonly onOpenTab: (url: string) => void;
}

export const MenuOptions: FunctionalComponent<MenuOptionsProps> = ({ tenant, onGoTo, onOpenTab }) => {
    return (
        <nav class="account-menu__options" aria-label="Account options">
            <Button 
                onClick={onGoTo}
                disabled={!tenant}
                ariaLabel="Go to DocSpace"
                icon={personIcon}
                text="Go to DocSpace"
            />
            <Button 
                onClick={() => onOpenTab(HELP_LINK)}
                ariaLabel="Open Help Center"
                icon={helpIcon}
                text="Help Center"
            />
            <Button 
                onClick={() => onOpenTab(FEEDBACK_LINK)}
                ariaLabel="Open Feedback & Support"
                icon={supportIcon}
                text="Feedback & Support"
            />
            <Button 
                onClick={() => onOpenTab(ABOUT_LINK)}
                ariaLabel="About this program"
                icon={infoIcon}
                text="About this program"
            />
        </nav>
    );
};
