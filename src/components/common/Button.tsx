import React from 'react'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>
{
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
    loading?: boolean
    fullWidth?: boolean
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled,
    className = '',
    type = 'button',
    fullWidth = false,
    ...props
}) =>
{
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
        ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
    }

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    }

    const widthClass = fullWidth ? 'w-full' : ''

    return (
        <button
            type={type}
            className={clsx(
                baseClasses,
                variantClasses[variant],
                sizeClasses[size],
                widthClass,
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : icon && iconPosition === 'left' ? (
                <span className="mr-2">{icon}</span>
            ) : null}

            {children}

            {!loading && icon && iconPosition === 'right' && (
                <span className="ml-2">{icon}</span>
            )}
        </button>
    )
}

export default Button