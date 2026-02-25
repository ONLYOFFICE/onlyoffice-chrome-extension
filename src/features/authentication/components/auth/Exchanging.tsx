import { FunctionalComponent } from 'preact';

import { Spinner } from '@components/Spinner';

import { useI18n } from '@stores/i18n';

import './exchanging.css';

export const Exchanging: FunctionalComponent = () => {
  const { t } = useI18n();

  return (
    <div className="exchanging">
      <Spinner size="large" color="darker" />
      <p className="exchanging__text">{t('auth.exchanging_tokens')}</p>
    </div>
  );
};
