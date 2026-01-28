import { FunctionalComponent } from 'preact';

import { Spinner } from '@components';

import './exchanging.css';

export const Exchanging: FunctionalComponent = () => {
    return (
        <div class="exchanging">
            <Spinner size="large" color="darker" />
            <p class="exchanging__text">Completing sign-in...</p>
        </div>
    );
};
