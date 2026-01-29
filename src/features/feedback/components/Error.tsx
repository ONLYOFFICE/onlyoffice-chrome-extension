import { FunctionalComponent } from 'preact';

import { useNotification } from '@hooks/useNotification';

import { useI18n } from '@stores/i18n';

interface ErrorProps {
    readonly message: string | null;
    readonly onClose?: () => void;
}

export const Error: FunctionalComponent<ErrorProps> = ({ message, onClose }) => {
    const { t, locale } = useI18n();
    const _ = locale.value;
    
    const { Notification } = useNotification({
        message,
        onClose,
        title: t('common.error'),
        variant: 'error'
    });

    return <Notification />;
};
