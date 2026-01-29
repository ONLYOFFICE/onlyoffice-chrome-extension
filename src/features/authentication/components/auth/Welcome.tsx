import { FunctionalComponent } from 'preact';

import { Title } from '@components/Title';
import { Text } from '@components/Text';

import { useI18n } from '@stores/i18n';

import './welcome.css';

export const Welcome: FunctionalComponent = () => {
    const { t, locale } = useI18n();
    const _ = locale.value;

    return (
        <div class="welcome">
            <Title>{t('auth.welcome')}</Title>
            <Text>
                {t('auth.welcome_description')}
            </Text>
        </div>
    );
};
