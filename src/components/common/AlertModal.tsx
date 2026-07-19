import React from 'react'
import { Lock, AlertTriangle } from 'lucide-react'

type AlertIcon = 'lock' | 'caution' | 'danger'

interface AlertModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    message: string
    icon?: AlertIcon
    children?: React.ReactNode
    // Single-button mode (hard block, nothing to confirm): pass only
    // acknowledgeText (or leave it default "Понятно").
    acknowledgeText?: string
    // Two-button mode (the action is allowed, but risky/irreversible):
    // pass onConfirm to switch to a Cancel / Confirm split footer.
    onConfirm?: () => void
    confirmText?: string
    cancelText?: string
    confirmVariant?: 'primary' | 'danger'
    isLoading?: boolean
}

const ICONS: Record<AlertIcon, React.ReactNode> = {
    lock: <Lock className="h-[18px] w-[18px]" />,
    caution: <AlertTriangle className="h-[18px] w-[18px]" />,
    danger: <AlertTriangle className="h-[18px] w-[18px]" />,
}

const ICON_STYLES: Record<AlertIcon, string> = {
    lock: 'bg-blue-50 text-primary-600',
    caution: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
}

// Compact, native-alert-style modal (hairline divider + flat text buttons,
// no filled pill buttons) — used for "you can't do this" and "are you sure"
// moments that should read as a system-level caution, not a regular form
// dialog. See admin/permission_modals_preview.html for the approved design.
const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    icon = 'caution',
    children,
    acknowledgeText = 'Понятно',
    onConfirm,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    confirmVariant = 'primary',
    isLoading = false,
}) => {
    if (!isOpen) return null

    const isConfirmMode = !!onConfirm

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 px-5"
            onClick={onClose}
        >
            <div
                className="w-80 max-w-full overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 pb-4 pt-6 text-center">
                    <div className={`mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full ${ICON_STYLES[icon]}`}>
                        {ICONS[icon]}
                    </div>
                    <p className="text-[15px] font-semibold text-gray-900">{title}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{message}</p>
                    {children && <div className="mt-3 text-left">{children}</div>}
                </div>

                <div className="flex border-t border-gray-200">
                    {isConfirmMode ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-3 text-[14.5px] text-gray-900 disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`flex-1 border-l border-gray-200 py-3 text-[14.5px] font-semibold disabled:opacity-50 ${confirmVariant === 'danger' ? 'text-red-600' : 'text-primary-600'
                                    }`}
                            >
                                {isLoading ? '…' : confirmText}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-[14.5px] font-semibold text-primary-600"
                        >
                            {acknowledgeText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AlertModal
