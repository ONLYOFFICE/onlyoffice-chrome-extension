import { useCallback } from 'preact/hooks';

import { tabs } from '@utils/browser';

interface UseOpenTabOptions {
  readonly onClose?: () => void;
}

export function useOpenTab({ onClose }: UseOpenTabOptions = {}) {
  const openTab = useCallback((url: string) => {
    tabs.create({ url, active: true });
    onClose?.();
  }, [onClose]);

  return openTab;
}
