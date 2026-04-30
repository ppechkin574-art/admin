import React, { useEffect, useRef, useState } from 'react'
import styles from './Notification.module.scss'
import clsx from 'clsx';

interface NotificationProps
{
    type?: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    details?: any
    onClose: () => void
    autoHide?: boolean
    duration?: number
}

export const Notification: React.FC<NotificationProps> = ({
    type = 'info',
    title,
    message,
    details = null,
    onClose,
    autoHide = true,
    duration = 5000
}) =>
{
    const [isVisible, setIsVisible] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [progress, setProgress] = useState(100)
    const [copied, setCopied] = useState(false)

    const timerRef = useRef<number | null>(null)
    const progressRef = useRef<number | null>(null)
    const startTimeRef = useRef<number>(0)
    const remainingTimeRef = useRef<number>(duration)

    useEffect(() =>
    {
        setTimeout(() => setIsVisible(true), 100)

        if (autoHide)
            startTimer()

        return () => clearTimers()
    }, [])

    useEffect(() =>
    {
        if (autoHide)
            if (showDetails)
                pauseTimer()
            else
                resumeTimer()
    }, [showDetails, autoHide])

    const clearTimers = () =>
    {
        if (timerRef.current)
        {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        if (progressRef.current)
        {
            clearInterval(progressRef.current)
            progressRef.current = null
        }
    }

    const startTimer = () =>
    {
        clearTimers()
        startTimeRef.current = Date.now()
        remainingTimeRef.current = duration

        timerRef.current = window.setTimeout(() =>
        {
            handleClose()
        }, duration)

        progressRef.current = window.setInterval(() =>
        {
            const elapsed = Date.now() - startTimeRef.current
            const remaining = Math.max(0, duration - elapsed)
            const newProgress = (remaining / duration) * 100
            setProgress(newProgress)
        }, 50)
    }

    const pauseTimer = () =>
    {
        if (timerRef.current)
        {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        if (progressRef.current)
        {
            clearInterval(progressRef.current)
            progressRef.current = null
        }

        const elapsed = Date.now() - startTimeRef.current
        remainingTimeRef.current = Math.max(0, duration - elapsed)
    }

    const resumeTimer = () =>
    {
        if (remainingTimeRef.current > 0)
        {
            startTimeRef.current = Date.now()

            timerRef.current = window.setTimeout(() =>
            {
                handleClose()
            }, remainingTimeRef.current)

            const startProgress = (remainingTimeRef.current / duration) * 100
            setProgress(startProgress)

            progressRef.current = window.setInterval(() =>
            {
                const elapsed = Date.now() - startTimeRef.current
                const remaining = Math.max(0, remainingTimeRef.current - elapsed)
                const newProgress = (remaining / remainingTimeRef.current) * startProgress
                setProgress(newProgress)
            }, 50)
        }
    }

    const handleClose = () =>
    {
        if (isClosing) return

        clearTimers()
        setIsClosing(true)
        setIsVisible(false)

        setTimeout(() =>
        {
            onClose()
        }, 300)
    }

    const toggleDetails = () =>
        setShowDetails(!showDetails)

    const handleCopyDetails = async () =>
    {
        const textToCopy = type === 'error' ? formatErrorDetails(details) : JSON.stringify(details, null, 2)

        try
        {
            await navigator.clipboard.writeText(textToCopy)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err)
        {
            console.error('Failed to copy: ', err)
        }
    }

    const renderMessage = (msg: any): string =>
    {
        if (!msg) return ''

        if (typeof msg === 'string')
            return msg

        if (typeof msg === 'object')
        {
            try
            {
                if (msg.message)
                    return msg.message
                return JSON.stringify(msg, null, 2)
            } catch (error)
            {
                return 'Не удалось отобразить сообщение'
            }
        }

        return String(msg)
    }

    const formatErrorDetails = (errorData: any): string =>
    {
        if (!errorData) return ''

        if (typeof errorData === 'string')
            return errorData

        try
        {
            const details: string[] = []

            if (errorData.detail)
                if (Array.isArray(errorData.detail))
                    errorData.detail.forEach((item: any) =>
                    {
                        if (item.loc && item.msg)
                            details.push(`${item.loc.join('.')}: ${item.msg}`)
                        else if (item.msg)
                            details.push(item.msg)
                    })
                else if (typeof errorData.detail === 'string')
                    details.push(errorData.detail)

            if (errorData.message && typeof errorData.message === 'string')
                details.push(errorData.message)

            if (errorData.response && errorData.response.message)
                details.push(errorData.response.message)

            if (errorData.error)
                details.push(`Ошибка: ${errorData.error}`)

            if (details.length === 0)
                return JSON.stringify(errorData, null, 2)

            return details.join('\n')
        } catch (error)
        {
            return 'Не удалось отобразить детали ошибки'
        }
    }

    const getIcon = (): string =>
    {
        switch (type)
        {
            case 'success': return 'fas fa-check-circle'
            case 'error': return 'fas fa-exclamation-circle'
            case 'warning': return 'fas fa-exclamation-triangle'
            case 'info': return 'fas fa-info-circle'
            default: return 'fas fa-bell'
        }
    }

    const getStatusColor = (): string =>
    {
        switch (type)
        {
            case 'success': return '#10b981'
            case 'error': return '#ef4444'
            case 'warning': return '#f59e0b'
            case 'info': return '#3b82f6'
            default: return '#6c757d'
        }
    }

    const hasDetails = details && (
        typeof details === 'object' ?
            Object.keys(details).length > 0 :
            details.toString().length > 0
    )

    const formattedMessage = renderMessage(message)
    const errorDetails = type === 'error' ? formatErrorDetails(details) : ''

    return (
        <div className={clsx(styles.notification, styles[`notification_${type}`], isVisible && styles.notification_visible, isClosing && styles.notification_closing)}>
            {/* Progress Bar */}
            {autoHide && (
                <div
                    className={styles.notification__progress}
                    style={{
                        width: `${progress}%`,
                        backgroundColor: getStatusColor()
                    }}
                />
            )}

            <div className={styles.notification__header}>
                <div className={styles.notification__icon}>
                    <i className={getIcon()} style={{ color: getStatusColor() }}></i>
                </div>

                <div className={styles.notification__content}>
                    <div className={styles.notification__title}>{title}</div>
                    {formattedMessage && (
                        <div className={styles.notification__message}>
                            {formattedMessage}
                        </div>
                    )}
                </div>

                <button
                    className={styles.notification__close}
                    onClick={handleClose}
                    aria-label="Закрыть уведомление"
                    type="button"
                >
                    <i className='fas fa-times'></i>
                </button>
            </div>

            {/* Детали ошибки */}
            {hasDetails && type === 'error' && errorDetails && (
                <div className={styles.notification__error_section}>
                    <button
                        className={styles.notification__details_toggle}
                        onClick={toggleDetails}
                        type="button"
                    >
                        <span>{showDetails ? 'Скрыть детали ошибки' : 'Показать детали ошибки'}</span>
                        <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'}`}></i>
                    </button>

                    {showDetails && (
                        <div className={styles.notification__details}>
                            <div className={styles.notification__details_content}>
                                <pre>
                                    <button
                                        className={styles.notification__copy_btn}
                                        onClick={handleCopyDetails}
                                        title="Копировать в буфер обмена"
                                        type="button"
                                    >
                                        <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                                    </button>
                                    {errorDetails}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Детали для других типов уведомлений */}
            {hasDetails && type !== 'error' && (
                <div className={styles.notification__details}>
                    <div className={styles.notification__details_header}>
                        <button
                            className={styles.notification__copy_btn}
                            onClick={handleCopyDetails}
                            title="Копировать в буфер обмена"
                            type="button"
                        >
                            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                            {copied ? ' Скопировано!' : ' Копировать'}
                        </button>
                    </div>
                    <div className={styles.notification__details_content}>
                        <pre>{JSON.stringify(details, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    )
}