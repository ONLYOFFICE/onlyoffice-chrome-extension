import { FunctionalComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import './notification.css';

export type NotificationVariant = 'error' | 'success';

interface UseNotificationOptions {
  readonly message: string | null;
  readonly title: string;
  readonly variant: NotificationVariant;
  readonly onClose?: () => void;
}

interface UseNotificationResult {
  readonly Notification: FunctionalComponent;
}

export const useNotification = ({
  message,
  title,
  variant,
  onClose,
}: UseNotificationOptions): UseNotificationResult => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!message) {
      setIsVisible(false);
      setIsExiting(false);
      return;
    }

    setIsVisible(true);
    setIsExiting(false);

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 2700);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      if (onClose) {
        onClose();
      }
    }, 3000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [message, onClose]);

  const Notification: FunctionalComponent = () => {
    if (!isVisible || !message) {
      return null;
    }

    return (
      <div
        className={`notification notification--${variant} ${
          isExiting ? 'notification--exiting' : ''
        }`}
      >
        <div className="notification__content">
          <div className="notification__title">{title}</div>
          <div className="notification__message">{message}</div>
        </div>
      </div>
    );
  };

  return { Notification };
};
