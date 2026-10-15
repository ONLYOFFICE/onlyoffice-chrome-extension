import { FunctionalComponent } from "preact";

import type { ToastData } from "@features/agents/hooks/useToast";

import "./toast.css";

export const Toast: FunctionalComponent<{
  readonly toast: ToastData | null;
}> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div
      className={`toast toast--${toast.state}${toast.exiting ? " toast--exiting" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast__icon" aria-hidden="true" />
      <span>{toast.message}</span>
    </div>
  );
};
