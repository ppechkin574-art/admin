import React from 'react';
import styles from './Badge.module.scss';
import clsx from 'clsx';

interface BadgeProps
{
    type: 'hint' | 'media' | 'latex' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
    children: React.ReactNode;
    icon?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
    type,
    children,
    icon,
    size = 'md'
}) =>
{
    return (
        <span className={clsx(styles.badge, styles[`badge__${type}`], styles[`badge__${size}`])}>
            {children}
        </span>
    );
};