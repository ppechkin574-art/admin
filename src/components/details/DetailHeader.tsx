import React from 'react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { ArrowLeft, Edit, Trash2, RefreshCw } from 'lucide-react';

interface DetailHeaderProps
{
    title: string;
    image?: string;
    badges?: Array<{
        text: string;
        type: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    }>;
    onBack: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onRefresh?: () => void;
    loading?: boolean;
    editButtonText?: string;
    deleteButtonText?: string;
    showEdit?: boolean;
    showDelete?: boolean;
    showRefresh?: boolean;
    children?: React.ReactNode;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
    title,
    image,
    badges,
    onBack,
    onEdit,
    onDelete,
    onRefresh,
    loading = false,
    editButtonText = 'Редактировать',
    deleteButtonText = 'Удалить',
    showEdit = true,
    showDelete = true,
    showRefresh = false,
    children
}) =>
{
    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={onBack}
                            icon={<ArrowLeft className="h-4 w-4" />}
                            size="sm"
                            disabled={loading}
                        >
                            Назад
                        </Button>
                        {image && <img src={image} alt={title} className="w-12 h-12 object-cover invert" />}
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                {title}
                            </h1>
                            <div className="flex items-center space-x-2 mt-1">
                                {badges?.map((badge, index) => (
                                    <Badge key={index} type={badge.type}>
                                        {badge.text}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {children}

                        {showRefresh && onRefresh && (
                            <Button
                                variant="outline"
                                onClick={onRefresh}
                                disabled={loading}
                                icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                            >
                                Обновить
                            </Button>
                        )}

                        {showDelete && (
                            <Button
                                variant="outline"
                                onClick={onDelete}
                                disabled={loading}
                                icon={<Trash2 className="h-4 w-4" />}
                            >
                                {deleteButtonText}
                            </Button>
                        )}

                        {showEdit && (
                            <Button
                                variant="primary"
                                onClick={onEdit}
                                disabled={loading}
                                icon={<Edit className="h-4 w-4" />}
                            >
                                {editButtonText}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};