import { FunctionalComponent } from 'preact';

import { useNotification } from '@hooks/useNotification';

interface SuccessProps {
    readonly message: string | null;
    readonly onClose?: () => void;
}

export const Success: FunctionalComponent<SuccessProps> = ({ message, onClose }) => {
    const { Notification } = useNotification({
        message,
        onClose,
        title: 'Success',
        variant: 'success'
    });

    return <Notification />;
};
