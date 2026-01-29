import { FunctionalComponent } from 'preact';

import './button.css';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  readonly variant?: Variant;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly onClick?: () => void;
  readonly children: preact.ComponentChildren;
}

export const Button: FunctionalComponent<ButtonProps> = ({
  variant,
  className,
  disabled = false,
  type = 'button',
  onClick,
  children,
}) => {
  const baseClass = className ?? 'button';
  const variantClass = variant != null ? `${baseClass}--${variant}` : '';

  const combinedClassName = variantClass
    ? `${baseClass} ${variantClass}`
    : baseClass;

  return (
    <button
      type={type}
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
