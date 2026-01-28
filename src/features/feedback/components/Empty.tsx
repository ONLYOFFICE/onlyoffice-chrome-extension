import { FunctionalComponent } from 'preact';

import noDocsIcon from '@icons/nodocs.svg';

import './empty.css';

interface EmptyProps {
    readonly title: string;
    readonly subtitle: string;
}

export const Empty: FunctionalComponent<EmptyProps> = ({ title, subtitle }) => {
    return (
        <div class="empty">
            <img src={noDocsIcon} alt="" class="empty__icon" />
            <div class="empty__content">
                <h3 class="empty__title">{title}</h3>
                <p class="empty__subtitle">{subtitle}</p>
            </div>
        </div>
    );
};
