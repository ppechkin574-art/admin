import React from 'react'
import { Lock, X } from 'lucide-react'
import Button from './Button'
import { usePermissionModalStore } from '@/stores/permissionModalStore'

// Shown app-wide whenever a marketing-only account attempts a write
// action it isn't allowed to perform (see the request interceptor in
// services/api.ts). Every page keeps its normal buttons/forms — this is
// the ONLY thing that stops the action from actually happening.
const NoPermissionModal: React.FC = () =>
{
    const isOpen = usePermissionModalStore(s => s.isOpen)
    const close = usePermissionModalStore(s => s.close)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={close}
                />

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <div className="absolute top-0 right-0 pt-4 pr-4">
                        <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={close}
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full text-amber-600 bg-amber-100">
                            <Lock className="h-6 w-6" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Недостаточно прав
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    У вашей роли (маркетинг) нет прав на это действие. Вы можете
                                    просматривать раздел, но изменения и удаление доступны только
                                    администратору.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <Button
                            variant="primary"
                            onClick={close}
                            className="w-full sm:ml-3 sm:w-auto"
                        >
                            Понятно
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NoPermissionModal
