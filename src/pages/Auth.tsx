import { FunctionalComponent } from 'preact';

import { Spinner } from '@components/Spinner';
import { Subtitle } from '@components/Subtitle';

import { FileList } from '@features/files';
import { Signin, Welcome, Exchanging } from '@features/authentication';

import { useI18n } from '@stores/i18n';

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
  onRefresh,
}) => {
  const { t } = useI18n();

  if (isExchanging && !isSigningIn) {
    return <Exchanging />;
  }

  if (isSigningIn) {
    return (
      <div className="exchanging">
        <Spinner size="large" color="darker" />
        <p className="exchanging__text">{t('auth.signing_in')}</p>
      </div>
    );
  }

  const hasDetectedFiles = detectedFiles.length > 0;
  const getIcon = (extension: string): string => detector.getIcon(extension);

  return (
    <div className="auth-page">
      <Welcome />
      {hasDetectedFiles && (
        <div className="file-list__section file-list__section--detected">
          <Subtitle>{t('files.files_detected')}</Subtitle>
          <div className="file-list__container">
            <FileList
              files={detectedFiles}
              isAuthenticated={false}
              processingFiles={processingFiles}
              onRefresh={onRefresh}
              onFileAction={onDetectedFileAction}
              getIcon={getIcon}
            />
          </div>
        </div>
      )}
      <Signin
        isSigningIn={isSigningIn}
        onSignIn={onSignIn}
        className={hasDetectedFiles ? undefined : 'signin--inline'}
      />
    </div>
  );
};
