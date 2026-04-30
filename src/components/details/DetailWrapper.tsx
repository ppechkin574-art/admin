import React from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';

interface DetailWrapperProps
{
    loading: boolean;
    error: string | null;
    entity: any;
    entityName: string;
    onRetry: () => void;
    children: React.ReactNode;
}

export const DetailWrapper: React.FC<DetailWrapperProps> = ({
    loading,
    error,
    entity,
    entityName,
    onRetry,
    children
}) =>
{
    if (loading && !entity)
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner message={`Загрузка ${entityName}...`} />
            </div>
        );

    if (error || !entity)
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <ErrorState
                    message={error || `${entityName} не найден`}
                    onRetry={onRetry}
                    actionText="Попробовать снова"
                />
            </div>
        );

    return <>{children}</>;
};