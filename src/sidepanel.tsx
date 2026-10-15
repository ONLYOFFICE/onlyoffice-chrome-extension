import { render } from 'preact';

import { SidePanel } from '@pages/SidePanel';

import { I18nProvider } from '@stores/i18n';

import { ErrorBoundary } from './error';

render(
  <ErrorBoundary>
    <I18nProvider>
      <SidePanel />
    </I18nProvider>
  </ErrorBoundary>,
  document.getElementById('app'),
);
