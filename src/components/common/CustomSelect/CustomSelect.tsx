import React from 'react';
import { SelectOption } from '@/types';
import styles from './CustomSelect.module.scss';
import clsx from 'clsx';

interface CustomSelectProps
{
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
    size?: 'default' | 'sm';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    options,
    onChange,
    disabled = false,
    size = 'default'
}) =>
{
    return (
        <div className={clsx(styles.custom_select, size === 'sm' && styles.custom_select__sm)}>
            <select
                className={styles.custom_select__native}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className={styles.custom_select__arrow}>
                <i className='fas fa-chevron-down'></i>
            </div>
        </div>
    );
};
