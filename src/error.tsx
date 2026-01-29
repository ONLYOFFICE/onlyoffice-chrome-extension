import { Component } from 'preact';

import { Title } from '@components/Title';

import { useI18n } from '@stores/i18n';

import errorIcon from '@icons/error.svg';

import '@styles/error.css';

function ErrorMessage() {
  const { t } = useI18n();

  return (
    <div className="error">
      <img src={errorIcon} alt={t('common.error')} className="error__icon" />
      <Title>{t('error.something_went_wrong')}</Title>
    </div>
  );
}

interface ErrorBoundaryProps {
  readonly children: preact.ComponentChildren;
}

interface ErrorBoundaryState {
  error: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error: error.message };
  }

  render() {
    const { error } = this.state;
    const { children } = this.props;
    if (error) return <ErrorMessage />;
    return children;
  }
}
