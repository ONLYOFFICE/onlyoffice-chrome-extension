import { render } from 'preact';

import { App } from '@pages/App';

import { Provider as AuthProvider } from '@stores/auth';
import { Provider as DocsProvider } from '@stores/docs';
import { Provider as FeedbackProvider } from '@stores/feedback';
import { Provider as ProfileProvider } from '@stores/profile';
import { I18nProvider } from '@stores/i18n';
import { ErrorBoundary } from './error';

render(
  <ErrorBoundary>
    <I18nProvider>
      <AuthProvider>
        <DocsProvider>
          <FeedbackProvider>
            <ProfileProvider>
              <App />
            </ProfileProvider>
          </FeedbackProvider>
        </DocsProvider>
      </AuthProvider>
    </I18nProvider>
  </ErrorBoundary>,
  document.getElementById('app'),
);
