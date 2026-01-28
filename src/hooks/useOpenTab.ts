import { useCallback } from 'preact/hooks';

interface UseOpenTabOptions {
    readonly onClose?: () => void;
}

export function useOpenTab({ onClose }: UseOpenTabOptions = {}) {
    const openTab = useCallback((url: string) => {
        chrome.tabs.create({ url, active: true });
        onClose?.();
    }, [onClose]);

    return openTab;
}
