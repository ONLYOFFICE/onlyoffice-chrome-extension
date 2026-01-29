import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { signal } from '@preact/signals';

interface FeedbackState {
  errorMessage: string | null;
  successMessage: string | null;
}

export interface FeedbackStore {
  state: ReturnType<typeof signal<FeedbackState>>;
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  clearError: () => void;
  clearSuccess: () => void;
  clearAll: () => void;
}

function createFeedbackStore(): FeedbackStore {
  const state = signal<FeedbackState>({
    errorMessage: null,
    successMessage: null,
  });

  let errorTimer: number | null = null;
  let successTimer: number | null = null;

  const showError = (message: string, duration = 5000) => {
    if (errorTimer) {
      clearTimeout(errorTimer);
    }

    state.value = { ...state.value, errorMessage: message };
    errorTimer = window.setTimeout(() => {
      state.value = { ...state.value, errorMessage: null };
      errorTimer = null;
    }, duration);
  };

  const showSuccess = (message: string, duration = 3000) => {
    if (successTimer) {
      clearTimeout(successTimer);
    }

    state.value = { ...state.value, successMessage: message };
    successTimer = window.setTimeout(() => {
      state.value = { ...state.value, successMessage: null };
      successTimer = null;
    }, duration);
  };

  const clearError = () => {
    if (errorTimer) {
      clearTimeout(errorTimer);
      errorTimer = null;
    }

    state.value = { ...state.value, errorMessage: null };
  };

  const clearSuccess = () => {
    if (successTimer) {
      clearTimeout(successTimer);
      successTimer = null;
    }

    state.value = { ...state.value, successMessage: null };
  };

  const clearAll = () => {
    clearError();
    clearSuccess();
  };

  return {
    state,
    showError,
    showSuccess,
    clearError,
    clearSuccess,
    clearAll,
  };
}

const store = createFeedbackStore();
const Context = createContext<FeedbackStore>(store);

interface ProviderProps {
  children: preact.ComponentChildren;
}

export function Provider({ children }: ProviderProps) {
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useFeedback(): FeedbackStore {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useFeedback must be used within Provider');
  }

  return context;
}
