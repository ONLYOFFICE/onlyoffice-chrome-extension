import { FunctionalComponent } from 'preact';

import { Spinner } from '@components';

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
                    <Spinner size="small" color="dark" />
                    <p class="signin__loading-text">Signing in...</p>
                </div>
            ) : (
                <button class="signin__btn" onClick={onSignIn}>
                    Sign in
                </button>
            )}
        </div>
    );
};
