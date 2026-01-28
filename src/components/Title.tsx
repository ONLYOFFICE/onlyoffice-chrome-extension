import { FunctionalComponent, ComponentChildren } from 'preact';
import './title.css';

interface TitleProps {
    readonly children: ComponentChildren;
}

export const Title: FunctionalComponent<TitleProps> = ({ children }) => {
    return <h1 class="title">{children}</h1>;
};

