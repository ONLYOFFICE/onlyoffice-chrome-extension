import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

interface UseModalOptions {
    readonly isOpen: boolean;
    readonly duration?: number;
    readonly noClick?: boolean;
    readonly onClose: () => void;
    readonly onCustomKeyDown?: (event: KeyboardEvent) => void;
}

interface UseModalReturn {
    readonly render: boolean;
    readonly visible: boolean;
    readonly closing: boolean;
    readonly el: preact.RefObject<HTMLDivElement>;
}

export function useModal({
    isOpen, 
    duration = 300,
    noClick = false,
    onClose, 
    onCustomKeyDown
}: UseModalOptions): UseModalReturn {
    const ref = useRef<HTMLDivElement>(null);
    const [closing, setClosing] = useState(false);
    const [render, setRender] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            setClosing(false);
            setVisible(false);
            requestAnimationFrame(() => setVisible(true));
        } else if (render) {
            setClosing(true);
            setVisible(false);
            const timer = setTimeout(() => {
                setRender(false);
                setClosing(false);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, render, duration]);

    const onEscape = useCallback((event: KeyboardEvent) => {
        if (onCustomKeyDown) {
            onCustomKeyDown(event);
        } else if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose, onCustomKeyDown]);

    const onClick = useCallback((event: MouseEvent) => {
        if (!noClick && ref.current && !ref.current.contains(event.target as Node)) {
            onClose();
        }
    }, [onClose, noClick]);

    useEffect(() => {
        if (!isOpen || closing) return;

        document.addEventListener('keydown', onEscape);
        if (!noClick) {
            document.addEventListener('mousedown', onClick);
        }

        return () => {
            document.removeEventListener('keydown', onEscape);
            if (!noClick) {
                document.removeEventListener('mousedown', onClick);
            }
        };
    }, [isOpen, closing, onEscape, onClick, noClick]);

    return {
        render,
        visible,
        closing,
        el: ref
    };
}
