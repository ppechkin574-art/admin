import React from 'react'
import styles from './ConfirmationModal.module.scss'
import clsx from 'clsx';

export interface ConfirmationModalProps
{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info' | 'success'
    onConfirm: () => void
    onCancel: () => void
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    type = 'warning',
    onConfirm,
    onCancel
}) =>
{
    if (!isOpen) return null

    const getIcon = (): string =>
    {
        switch (type)
        {
            case 'danger': return 'fas fa-exclamation-triangle'
            case 'warning': return 'fas fa-exclamation-circle'
            case 'success': return 'fas fa-check-circle'
            case 'info': return 'fas fa-info-circle'
            default: return 'fas fa-question-circle'
        }
    }

    const getIconColor = (): string =>
    {
        switch (type)
        {
            case 'danger': return '#dc3545'
            case 'warning': return '#ffc107'
            case 'success': return '#28a745'
            case 'info': return '#17a2b8'
            default: return '#6c757d'
        }
    }

    const handleBackdropClick = (e: React.MouseEvent): void =>
    {
        if (e.target === e.currentTarget)
            onCancel()
    }

    const handleConfirm = (): void =>
        onConfirm()

    const handleCancel = (): void =>
        onCancel()

    const handleKeyDown = (e: React.KeyboardEvent): void =>
    {
        if (e.key === 'Escape')
            onCancel()
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey))
            onConfirm()
    }

    React.useEffect(() =>
    {
        if (isOpen)
        {
            document.addEventListener('keydown', handleKeyDown as any)
            document.body.style.overflow = 'hidden'

            return () =>
            {
                document.removeEventListener('keydown', handleKeyDown as any)
                document.body.style.overflow = 'unset'
            }
        }
    }, [isOpen])

    return (
        <div
            className={styles.confirmation_modal_overlay}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-modal-title"
            aria-describedby="confirmation-modal-message"
        >
            <div className={styles.confirmation_modal}>
                <div className={styles.confirmation_modal__header}>
                    <div className={styles.confirmation_modal__icon}>
                        <i className={getIcon()} style={{ color: getIconColor() }}></i>
                    </div>
                    <div className={styles.confirmation_modal__content}>
                        <h3
                            id="confirmation-modal-title"
                            className={styles.confirmation_modal__title}
                        >
                            {title}
                        </h3>
                        <p
                            id="confirmation-modal-message"
                            className={styles.confirmation_modal__message}
                        >
                            {message}
                        </p>
                    </div>
                </div>

                <div className={styles.confirmation_modal__footer}>
                    <button
                        className={clsx(styles.confirmation_modal__btn, styles[`confirmation-modal__btn__${type}`])}
                        onClick={handleConfirm}
                        autoFocus
                    >
                        {confirmText}
                    </button>
                    <button
                        className={clsx(styles.confirmation_modal__btn, styles.confirmation_modal__btn__cancel)}
                        onClick={handleCancel}
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    )
}
