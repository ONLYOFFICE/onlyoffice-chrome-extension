import { FunctionalComponent } from 'preact';

import { Spinner } from '@components/Spinner';

import onlyofficeIcon from '@icons/onlyoffice.svg';

import './signin.css';

interface SigninProps {
    readonly isSigningIn: boolean;
    readonly onSignIn: () => void;
}

export const Signin: FunctionalComponent<SigninProps> = ({
    isSigningIn,
    onSignIn
}) => {
    return (
        <div class="signin">
            {isSigningIn ? (
                <div class="signin__loading">
                    <Spinner size="small" />
                    <p class="signin__loading-text">Signing in...</p>
                </div>
            ) : (
                <button class="signin__btn" onClick={onSignIn}>
                    <img src={onlyofficeIcon} alt="" class="signin__icon" />
                    <span>Sign in with DocSpace</span>
                </button>
            )}
        </div>
    );
};
