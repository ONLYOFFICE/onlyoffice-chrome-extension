import { useCallback, useRef, useState } from "preact/hooks";

export type ToastState = "progress" | "done" | "error";

export interface ToastData {
  readonly message: string;
  readonly state: ToastState;
  readonly exiting?: boolean;
}

const DURATION = 3000;
const EXIT_DURATION = 300;

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number>();

  const showToast = useCallback((message: string, state: ToastState) => {
    clearTimeout(timer.current);
    setToast({ message, state });
    if (state !== "progress") {
      timer.current = window.setTimeout(
        () => {
          setToast((current) => current && { ...current, exiting: true });
          timer.current = window.setTimeout(
            () => setToast(null),
            EXIT_DURATION,
          );
        },
        state === "error" ? DURATION * 2 : DURATION,
      );
    }
  }, []);

  return { toast, showToast };
}
