import React from 'react'
import AlertModal from './AlertModal'
import { usePermissionModalStore } from '@/stores/permissionModalStore'

const DEFAULT_MESSAGE =
    'У вашей роли (маркетинг) нет прав на это действие. Вы можете просматривать раздел, но изменения и удаление доступны только администратору.'

// Shown app-wide whenever a marketing-only account attempts a write
// action it isn't allowed to perform (see the request interceptor in
// services/api.ts). Every page keeps its normal buttons/forms — this is
// the ONLY thing that stops the action from actually happening. The
// message is action-specific when the interceptor found one (see
// marketingWriteGate.blockedActionMessage), otherwise this generic text.
const NoPermissionModal: React.FC = () => {
    const isOpen = usePermissionModalStore(s => s.isOpen)
    const message = usePermissionModalStore(s => s.message)
    const close = usePermissionModalStore(s => s.close)

    return (
        <AlertModal
            isOpen={isOpen}
            onClose={close}
            icon="lock"
            title="Нет доступа"
            message={message || DEFAULT_MESSAGE}
            acknowledgeText="Понятно"
        />
    )
}

export default NoPermissionModal
