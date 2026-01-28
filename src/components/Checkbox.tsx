import { FunctionalComponent } from 'preact';

import './checkbox.css';

interface CheckboxProps {
    readonly checked: boolean;
    readonly label: string;
    readonly className?: string;
    readonly disabled?: boolean;
    readonly id?: string;
    readonly onChange: (checked: boolean) => void;
}

export const Checkbox: FunctionalComponent<CheckboxProps> = ({
    checked,
    label,
    className,
    disabled = false,
    id,
    onChange,
}) => {
    const handleChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        onChange(target.checked);
    };

    const rootClassName = className
        ? `checkbox ${className}`
        : 'checkbox';

    return (
        <label class={rootClassName}>
            <input
                id={id}
                type="checkbox"
                class="checkbox__input"
                checked={checked}
                disabled={disabled}
                onChange={handleChange}
            />
            <span class="checkbox__label">{label}</span>
        </label>
    );
};
