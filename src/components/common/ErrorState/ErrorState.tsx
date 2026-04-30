import React from 'react';
import styles from './ErrorState.module.scss';
import clsx from 'clsx';

interface ErrorStateProps
{
    message: string;
    onRetry?: () => void;
    title?: string;
    imageUrl?: string;
    imageAlt?: string;
    size?: 'small' | 'medium' | 'large';
    variant?: 'error' | 'empty' | '404' | 'warning' | '500';
    actionText?: string;
    className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    message,
    onRetry,
    title,
    imageUrl,
    imageAlt,
    size = 'medium',
    variant = 'error',
    actionText,
    className = ''
}) =>
{
    const getDefaultTitle = () =>
    {
        switch (variant)
        {
            case 'error': return 'Произошла ошибка';
            case 'empty': return 'Данные не найдены';
            case '404': return 'Страница не найдена';
            case 'warning': return 'Внимание';
            case '500': return 'Ошибка сервера';
            default: return 'Произошла ошибка';
        }
    };

    const getDefaultIcon = () =>
    {
        switch (variant)
        {
            case 'error': return 'fas fa-exclamation-circle';
            case 'empty': return 'fas fa-inbox';
            case '404': return 'fas fa-map-marker-alt';
            case 'warning': return 'fas fa-exclamation-triangle';
            case '500': return 'fas fa-server';
            default: return 'fas fa-exclamation-circle';
        }
    };

    const getDefaultActionText = () =>
    {
        switch (variant)
        {
            case '404': return 'На главную';
            case '500': return 'Повторить попытку';
            default: return 'Попробовать снова';
        }
    };

    const finalTitle = title || getDefaultTitle();
    const finalImageAlt = imageAlt || finalTitle;
    const finalActionText = actionText || getDefaultActionText();

    return (
        <div className={clsx(styles.error_state, styles[`error_state__${size}`], styles[`error_state__${variant}`], className)}>
            <div className={styles.error_state__content}>
                <div className={styles.error_state__visual}>
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={finalImageAlt}
                            className={styles.error_state__image}
                        />
                    ) : (
                        <i className={clsx(getDefaultIcon(), styles.error_state__icon)}></i>
                    )}
                </div>

                {/* Текстовый контент */}
                <div className={styles.error_state__text_content}>
                    <h3 className={styles.error_state__title}>{finalTitle}</h3>
                    <p className={styles.error_state__text}>{message}</p>
                </div>

                {/* Действия */}
                {onRetry && (
                    <div className={styles.error_state__actions}>
                        <button className={styles.error_state__action_btn} onClick={onRetry}>
                            <i className={clsx('fas', 'fa_redo', styles.error_state__action_icon)}></i>
                            {finalActionText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};