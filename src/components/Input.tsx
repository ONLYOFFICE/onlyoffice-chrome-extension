import { FunctionalComponent } from 'preact';

import './input.css';

interface InputProps {
    readonly value: string;
    readonly type?: string;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly autoFocus?: boolean;
    readonly className?: string;
    readonly onChange: (value: string) => void;
    readonly onKeyDown?: (event: KeyboardEvent) => void;
}

export const Input: FunctionalComponent<InputProps> = ({
    value,
    type = 'text',
    placeholder,
    disabled = false,
    autoFocus = false,
    className,
    onChange,
    onKeyDown
}) => {
    const handleChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        onChange(target.value);
    };

    const rootClassName = className
        ? `input ${className}`
        : 'input';

    return (
        <input
            type={type}
            class={rootClassName}
            value={value}
            onInput={handleChange}
            onKeyDown={onKeyDown}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
        />
    );
};
