import { FunctionalComponent, ComponentChildren } from 'preact';
import './text.css';

interface TextProps {
  readonly children: ComponentChildren;
}

export const Text: FunctionalComponent<TextProps> = ({ children }) => <p className="text">{children}</p>;
