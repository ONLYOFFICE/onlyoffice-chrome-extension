import { FunctionalComponent } from 'preact';

import './spinner.css';

export type SpinnerSize = 'small' | 'medium' | 'large';
export type SpinnerColor = 'primary' | 'dark' | 'darker';

interface SpinnerProps {
  readonly size?: SpinnerSize;
  readonly color?: SpinnerColor;
  readonly className?: string;
}

export const Spinner: FunctionalComponent<SpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className,
}) => (
  <div
    className={`spinner spinner--${size} spinner--${color}${className ? ` ${className}` : ''}`}
    role="status"
    aria-label="Loading"
  />
);
