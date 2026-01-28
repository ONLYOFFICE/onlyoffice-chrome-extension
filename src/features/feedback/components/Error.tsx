import { FunctionalComponent } from 'preact';

import { useNotification } from '@hooks/useNotification';

interface ErrorProps {
    readonly message: string | null;
    readonly onClose?: () => void;
}

export const Error: FunctionalComponent<ErrorProps> = ({ message, onClose }) => {
    const { Notification } = useNotification({
        message,
        onClose,
        title: 'Error',
        variant: 'error'
    });

    return <Notification />;
};
