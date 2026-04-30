import React from 'react';
import ConfirmModal from '@/components/common/ConfirmModal';

interface DeleteConfirmationProps
{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isLoading?: boolean;
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isLoading = false,
}) =>
{
    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title={title}
            message={message}
            confirmText="Удалить"
            cancelText="Отмена"
            type="danger"
            isLoading={isLoading}
        />
    );
};