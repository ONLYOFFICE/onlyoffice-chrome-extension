import { render } from 'preact';

import { SidePanel } from '@pages/SidePanel';

import { I18nProvider } from '@stores/i18n';

import { ErrorBoundary } from './error';

const root = document.getElementById('app');
if (!root) throw new Error('The #app root element is missing');

render(
  <ErrorBoundary>
    <I18nProvider>
      <SidePanel />
    </I18nProvider>
  </ErrorBoundary>,
  root,
);
