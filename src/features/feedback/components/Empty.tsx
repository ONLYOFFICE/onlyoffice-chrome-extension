import { FunctionalComponent } from 'preact';

import noDocsIcon from '@icons/nodocs.svg';

import './empty.css';

interface EmptyProps {
  readonly title: string;
  readonly subtitle: string;
}

export const Empty: FunctionalComponent<EmptyProps> = ({ title, subtitle }) => (
  <div className="empty">
    <img src={noDocsIcon} alt="" className="empty__icon" />
    <div className="empty__content">
      <h3 className="empty__title">{title}</h3>
      <p className="empty__subtitle">{subtitle}</p>
    </div>
  </div>
);
