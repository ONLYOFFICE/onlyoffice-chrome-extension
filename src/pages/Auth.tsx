import { FunctionalComponent } from 'preact';

import { Spinner } from '@components/Spinner';
import { Subtitle } from '@components/Subtitle';

import { FileList } from '@features/files';
import { Signin, Welcome, Exchanging } from '@features/authentication';

import { Detector, File as DetectedFile } from '@utils/detector';

interface AuthPageProps {
    readonly isSigningIn: boolean;
    readonly isExchanging: boolean;
    readonly detectedFiles: DetectedFile[];
    readonly detector: Detector;
    readonly processingFiles: ReadonlySet<string>;
    readonly onSignIn: () => void;
    readonly onDetectedFileAction: (action: 'download' | 'edit', url: string, name: string) => void;
    readonly onRefresh: () => void;
}

export const AuthPage: FunctionalComponent<AuthPageProps> = ({
    isSigningIn,
    isExchanging,
    detectedFiles,
    detector,
    processingFiles,
    onSignIn,
    onDetectedFileAction,
    onRefresh
}) => {
    if (isExchanging && !isSigningIn) {
        return <Exchanging />;
    }

    if (isSigningIn) {
        return (
            <div class="exchanging">
                <Spinner size="large" color="darker" />
                <p class="exchanging__text">Signing in...</p>
            </div>
        );
    }

    const hasDetectedFiles = detectedFiles.length > 0;
    const getIcon = (extension: string): string => detector.getIcon(extension);
    
    return (
        <>
            <Welcome />
            {hasDetectedFiles && (
                <>
                    <Subtitle>Files detected on this webpage</Subtitle>
                    <div class="file-list__container">
                        <FileList
                            files={detectedFiles}
                            isAuthenticated={false}
                            processingFiles={processingFiles}
                            onRefresh={onRefresh}
                            onFileAction={onDetectedFileAction}
                            getIcon={getIcon}
                        />
                    </div>
                </>
            )}
            <Signin isSigningIn={isSigningIn} onSignIn={onSignIn} />
        </>
    );
};
