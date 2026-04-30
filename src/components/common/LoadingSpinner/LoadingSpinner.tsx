import React from 'react'
import styles from './LoadingSpinner.module.scss'
import clsx from 'clsx';

interface LoadingSpinnerProps
{
    size?: 'sm' | 'md' | 'lg'
    message?: string
    overlay?: boolean
    fullScreen?: boolean
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message = 'Загрузка...',
    overlay = false,
    fullScreen = false
}) =>
{
    const getSizeClass = () =>
    {
        switch (size)
        {
            case 'sm': return 'loading_spinner__small'
            case 'lg': return 'loading_spinner__large'
            default: return 'loading_spinner__medium'
        }
    }

    const spinnerContent = (
        <div className={clsx(styles.loading_spinner, getSizeClass(), overlay && styles.loading_spinner_overlay)}>
            <div className={styles.loading_spinner__container}>
                <div className={styles.loading_spinner__animation}>
                    <div className={styles.loading_spinner__circle}></div>
                    <div className={styles.loading_spinner__circle}></div>
                    <div className={styles.loading_spinner__circle}></div>
                    <div className={styles.loading_spinner__circle}></div>
                </div>
                {message && (
                    <div className={styles.loading_spinner__message}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    )

    if (fullScreen)
        return (
            <div className={styles.loading_spinner__fullscreen}>
                {spinnerContent}
            </div>
        )

    return spinnerContent
}