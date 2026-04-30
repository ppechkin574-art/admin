import React from 'react'
import clsx from 'clsx'

interface BadgeProps
{
    type?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary' | 'hint' | 'media'
    children: React.ReactNode
    icon?: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const Badge: React.FC<BadgeProps> = ({
    type = 'secondary',
    children,
    icon,
    size = 'md',
    className = ''
}) =>
{
    const baseClasses = 'inline-flex items-center font-medium rounded-full'

    const typeClasses = {
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        primary: 'bg-primary-100 text-primary-800',
        secondary: 'bg-gray-100 text-gray-800',
        hint: 'bg-purple-100 text-purple-800',
        media: 'bg-indigo-100 text-indigo-800'
    }

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm'
    }

    return (
        <span className={clsx(
            baseClasses,
            typeClasses[type],
            sizeClasses[size],
            className
        )}>
            {icon && <span className="mr-1.5">{icon}</span>}
            {children}
        </span>
    )
}

export default Badge;