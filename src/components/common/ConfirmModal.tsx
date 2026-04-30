import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'

interface ConfirmModalProps
{
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
    isLoading?: boolean
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    type = 'danger',
    isLoading = false,
}) =>
{
    if (!isOpen) return null

    const typeColors = {
        danger: 'text-red-600',
        warning: 'text-yellow-600',
        info: 'text-blue-600'
    }

    const buttonColors = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        info: 'bg-blue-600 hover:bg-blue-700'
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <div className="absolute top-0 right-0 pt-4 pr-4">
                        <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="sm:flex sm:items-start">
                        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${typeColors[type]} bg-opacity-20`}>
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <Button
                            variant="danger"
                            onClick={onConfirm}
                            loading={isLoading}
                            className={`w-full sm:ml-3 sm:w-auto ${buttonColors[type]}`}
                        >
                            {confirmText}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="mt-3 w-full sm:mt-0 sm:w-auto"
                        >
                            {cancelText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ConfirmModal