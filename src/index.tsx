import { render } from 'preact';

import { ErrorBoundary } from './error';

import { App } from '@pages/App';

import { Provider as AuthProvider } from '@stores/auth';
import { Provider as DocsProvider } from '@stores/docs';
import { Provider as FeedbackProvider } from '@stores/feedback';
import { Provider as ProfileProvider } from '@stores/profile';

render(
    <ErrorBoundary>
        <AuthProvider>
            <DocsProvider>
                <FeedbackProvider>
                    <ProfileProvider>
                        <App />
                    </ProfileProvider>
                </FeedbackProvider>
            </DocsProvider>
        </AuthProvider>
    </ErrorBoundary>,
    document.getElementById('app')
);
