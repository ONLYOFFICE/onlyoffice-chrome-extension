import { FunctionalComponent } from 'preact';

import { Button } from './Button';

import { useI18n } from '@stores/i18n';

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
    const { t, locale } = useI18n();
    const _ = locale.value;
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
                ariaLabel={t('menu.go_to_doc_space')}
                icon={currentPersonIcon}
                text={t('menu.go_to_doc_space')}
            />
            <Button 
                onClick={() => onOpenTab(HELP_LINK)}
                ariaLabel={t('menu.help_center')}
                icon={currentHelpIcon}
                text={t('menu.help_center')}
            />
            <Button 
                onClick={() => onOpenTab(FEEDBACK_LINK)}
                ariaLabel={t('menu.feedback_support')}
                icon={currentSupportIcon}
                text={t('menu.feedback_support')}
            />
            <Button 
                onClick={() => onOpenTab(ABOUT_LINK)}
                ariaLabel={t('menu.about_program')}
                icon={currentInfoIcon}
                text={t('menu.about_program')}
            />
        </nav>
    );
};
