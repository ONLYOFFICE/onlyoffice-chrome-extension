import { FunctionalComponent } from 'preact';

import { Spinner } from '@components/Spinner';

import { useI18n } from '@stores/i18n';

import './exchanging.css';

export const Exchanging: FunctionalComponent = () => {
    const { t, locale } = useI18n();
    const _ = locale.value;
    
    return (
        <div class="exchanging">
            <Spinner size="large" color="darker" />
            <p class="exchanging__text">{t('auth.exchanging_tokens')}</p>
        </div>
    );
};
