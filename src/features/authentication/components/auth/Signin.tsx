import { FunctionalComponent } from 'preact';

import { Spinner } from '@components/Spinner';

import { useI18n } from '@stores/i18n';

import onlyofficeIcon from '@icons/onlyoffice.svg';

import './signin.css';

interface SigninProps {
    readonly isSigningIn: boolean;
    readonly onSignIn: () => void;
    readonly className?: string;
}

export const Signin: FunctionalComponent<SigninProps> = ({
    isSigningIn,
    onSignIn,
    className
}) => {
    const { t, locale } = useI18n();
    const _ = locale.value;
    
    const containerClass = ['signin', className].filter(Boolean).join(' ');
    
    return (
        <div class={containerClass}>
            {isSigningIn ? (
                <div class="signin__loading">
                    <Spinner size="small" />
                    <p class="signin__loading-text">{t('auth.signing_in')}</p>
                </div>
            ) : (
                <button class="signin__btn" onClick={onSignIn}>
                    <img src={onlyofficeIcon} alt="" class="signin__icon" />
                    <span>{t('auth.sign_in_with_doc_space')}</span>
                </button>
            )}
        </div>
    );
};
