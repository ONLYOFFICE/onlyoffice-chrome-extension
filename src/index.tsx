import { render } from 'preact';

import { App } from '@pages/App';

import { Provider as AuthProvider } from '@stores/auth';
import { Provider as DocsProvider } from '@stores/docs';
import { Provider as FeedbackProvider } from '@stores/feedback';
import { Provider as ProfileProvider } from '@stores/profile';

render(
    <AuthProvider>
        <DocsProvider>
            <FeedbackProvider>
                <ProfileProvider>
                    <App />
                </ProfileProvider>
            </FeedbackProvider>
        </DocsProvider>
    </AuthProvider>,
    document.getElementById('app')
);
