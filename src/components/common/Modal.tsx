import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps
{
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
    showCloseButton?: boolean
    scrollable?: boolean
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = '2xl',
    showCloseButton = true,
    scrollable = false
}) =>
{
    useEffect(() =>
    {
        const handleEscape = (e: KeyboardEvent) =>
        {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen)
        {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () =>
        {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl'
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={onClose}
                    aria-hidden="true"
                />

                {/* Modal container */}
                <div className={`relative mx-auto w-full ${maxWidthClasses[maxWidth]}`}>
                    <div className="relative bg-white rounded-lg shadow-xl">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-medium text-gray-900 truncate">
                                        {title}
                                    </h3>
                                    {subtitle && (
                                        <p className="mt-1 text-sm text-gray-500 truncate">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                                {showCloseButton && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className={scrollable ? "px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto" : "px-6 py-4"}>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Modal