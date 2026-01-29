import { FunctionalComponent, ComponentChildren } from 'preact';

import './subtitle.css';

interface SubtitleProps {
  readonly children: ComponentChildren;
}

export const Subtitle: FunctionalComponent<SubtitleProps> = ({ children }) => <h3 className="subtitle">{children}</h3>;
