import { FunctionalComponent, ComponentChildren } from 'preact';
import './title.css';

interface TitleProps {
  readonly children: ComponentChildren;
}

export const Title: FunctionalComponent<TitleProps> = ({ children }) => <h1 className="title">{children}</h1>;
