import React from 'react';
import Button from '@/components/common/Button';
import { LucideIcon } from 'lucide-react';

interface DetailAction
{
    label: string;
    onClick: () => void;
    icon: LucideIcon;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    disabled?: boolean;
}

interface DetailActionsProps
{
    title: string;
    actions: DetailAction[];
    loading?: boolean;
    className?: string;
}

export const DetailActions: React.FC<DetailActionsProps> = ({
    title,
    actions,
    loading = false,
    className = ''
}) =>
{
    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            </div>
            <div className="p-6">
                <div className="space-y-3">
                    {actions.map((action, index) => (
                        <Button
                            key={index}
                            variant={action.variant || 'outline'}
                            onClick={action.onClick}
                            disabled={action.disabled || loading}
                            icon={<action.icon className="h-4 w-4" />}
                            fullWidth
                            className="justify-start"
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};