import { FunctionalComponent, ComponentChildren } from 'preact';

import './subtitle.css';

interface SubtitleProps {
    readonly children: ComponentChildren;
}

export const Subtitle: FunctionalComponent<SubtitleProps> = ({ children }) => {
    return <h3 class="subtitle">{children}</h3>;
};
