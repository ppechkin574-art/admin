import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

interface FormModalProps
{
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
    footer?: React.ReactNode
    onSave?: () => void
    onCancel?: () => void
    saveText?: string
    cancelText?: string
    isLoading?: boolean
    showFooter?: boolean
    scrollable?: boolean
}

const FormModal: React.FC<FormModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = '2xl',
    footer,
    onSave,
    onCancel,
    saveText = 'Сохранить',
    cancelText = 'Отмена',
    isLoading = false,
    showFooter = true,
    scrollable = false
}) =>
{
    useEffect(() =>
    {
        const handleEscape = (e: KeyboardEvent) =>
        {
            if (e.key === 'Escape' && !isLoading) onClose()
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
    }, [isOpen, onClose, isLoading])

    if (!isOpen) return null

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl'
    }

    const handleCancel = () =>
    {
        if (onCancel)
        {
            onCancel()
        } else
        {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={isLoading ? undefined : handleCancel}
                />

                {/* This element is to trick the browser into centering the modal contents. */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                    &#8203;
                </span>

                {/* Modal */}
                <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${maxWidthClasses[maxWidth]} w-full`}>
                    {/* Header */}
                    <div className="bg-white px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                                {subtitle && (
                                    <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                                )}
                            </div>
                            {!isLoading && (
                                <button
                                    onClick={handleCancel}
                                    className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                    disabled={isLoading}
                                >
                                    <span className="sr-only">Закрыть</span>
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className={`bg-white px-6 py-4 ${scrollable ? 'max-h-[calc(100vh-200px)] overflow-y-auto' : ''}`}>
                        {children}
                    </div>

                    {/* Footer */}
                    {showFooter && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            {footer || (
                                <div className="flex justify-end space-x-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={isLoading}
                                    >
                                        {cancelText}
                                    </Button>
                                    {onSave && (
                                        <Button
                                            variant="primary"
                                            onClick={onSave}
                                            loading={isLoading}
                                        >
                                            {saveText}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FormModal