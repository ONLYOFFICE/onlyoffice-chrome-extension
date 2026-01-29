import { FunctionalComponent } from 'preact';

import { Button } from './Button';

import helpIcon from '@icons/help.svg';
import helpDarkIcon from '@icons/help-dark.svg';
import infoIcon from '@icons/info.svg';
import infoDarkIcon from '@icons/info-dark.svg';
import personIcon from '@icons/person.svg';
import personDarkIcon from '@icons/person-dark.svg';
import supportIcon from '@icons/support.svg';
import supportDarkIcon from '@icons/support-dark.svg';

import { HELP_LINK, FEEDBACK_LINK, ABOUT_LINK } from '@config';

import './menu-options.css';

interface MenuOptionsProps {
    readonly tenant: string | null;
    readonly onGoTo: () => void;
    readonly onOpenTab: (url: string) => void;
}

export const MenuOptions: FunctionalComponent<MenuOptionsProps> = ({ tenant, onGoTo, onOpenTab }) => {
    const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentPersonIcon = isDarkMode ? personDarkIcon : personIcon;
    const currentHelpIcon = isDarkMode ? helpDarkIcon : helpIcon;
    const currentSupportIcon = isDarkMode ? supportDarkIcon : supportIcon;
    const currentInfoIcon = isDarkMode ? infoDarkIcon : infoIcon;

    return (
        <nav class="account-menu__options" aria-label="Account options">
            <Button 
                onClick={onGoTo}
                disabled={!tenant}
                ariaLabel="Go to DocSpace"
                icon={currentPersonIcon}
                text="Go to DocSpace"
            />
            <Button 
                onClick={() => onOpenTab(HELP_LINK)}
                ariaLabel="Open Help Center"
                icon={currentHelpIcon}
                text="Help Center"
            />
            <Button 
                onClick={() => onOpenTab(FEEDBACK_LINK)}
                ariaLabel="Open Feedback & Support"
                icon={currentSupportIcon}
                text="Feedback & Support"
            />
            <Button 
                onClick={() => onOpenTab(ABOUT_LINK)}
                ariaLabel="About this program"
                icon={currentInfoIcon}
                text="About this program"
            />
        </nav>
    );
};
