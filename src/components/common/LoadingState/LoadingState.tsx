import React from 'react';
import styles from './LoadingState.module.scss';
import clsx from 'clsx';

interface LoadingStateProps
{
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = "Загрузка...",
    size = 'md'
}) =>
{
    return (
        <div className={clsx(styles.loading_state, styles[`loading_state__${size}`])}>
            <div className={styles.loading_state__spinner}></div>
            <p className={styles.loading_state__text}>{message}</p>
        </div>
    );
};
