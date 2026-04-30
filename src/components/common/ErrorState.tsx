import React from 'react'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

interface ErrorStateProps
{
    variant?: 'error' | '404' | 'auth'
    title?: string
    message?: string
    actionText?: string
    onRetry?: () => void
    size?: 'small' | 'medium' | 'large'
    className?: string
}

const ErrorState: React.FC<ErrorStateProps> = ({
    variant = 'error',
    title,
    message,
    actionText,
    onRetry,
    size = 'medium',
    className = ''
}) =>
{
    const getVariantConfig = () =>
    {
        switch (variant)
        {
            case '404':
                return {
                    icon: <AlertCircle className="h-12 w-12 text-yellow-500" />,
                    defaultTitle: 'Страница не найдена',
                    defaultMessage: 'Извините, мы не можем найти запрашиваемую страницу.',
                    defaultActionText: 'Вернуться на главную'
                }
            case 'auth':
                return {
                    icon: <AlertCircle className="h-12 w-12 text-red-500" />,
                    defaultTitle: 'Ошибка авторизации',
                    defaultMessage: 'Не удалось инициализировать систему авторизации.',
                    defaultActionText: 'Попробовать снова'
                }
            default:
                return {
                    icon: <AlertCircle className="h-12 w-12 text-red-500" />,
                    defaultTitle: 'Произошла ошибка',
                    defaultMessage: 'Что-то пошло не так. Пожалуйста, попробуйте позже.',
                    defaultActionText: 'Попробовать снова'
                }
        }
    }

    const config = getVariantConfig()
    const sizeClasses = {
        small: 'py-4',
        medium: 'py-8',
        large: 'py-16'
    }

    return (
        <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} ${className}`}>
            <div className="text-center flex flex-col items-center justify-center">
                {config.icon}
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {title || config.defaultTitle}
                </h3>
                <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                    {message || config.defaultMessage}
                </p>
                {onRetry && (
                    <div className="mt-6">
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            {variant === '404' ? (
                                <Home className="mr-2 h-4 w-4" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            {actionText || config.defaultActionText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ErrorState