import React from 'react';
import styles from './CustomCheckbox.module.scss';
import clsx from 'clsx';

interface CustomCheckboxProps
{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    size?: 'default' | 'sm';
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
    label,
    checked,
    onChange,
    size = 'default'
}) =>
{
    return (
        <label className={clsx(styles.custom_checkbox, size === 'sm' && styles.custom_checkbox__sm)}>
            <input
                type="checkbox"
                className={styles.custom_checkbox__input}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className={styles.custom_checkbox__checkmark}></span>
            <span className={styles.custom_checkbox__label}>{label}</span>
        </label>
    );
};
