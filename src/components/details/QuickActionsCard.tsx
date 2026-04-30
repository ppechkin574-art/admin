import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from '@/components/common/Button';

interface QuickAction
{
    label: string;
    onClick: () => void;
    icon: LucideIcon;
    variant?: 'outline' | 'ghost';
}

interface QuickActionsCardProps
{
    title: string;
    actions: QuickAction[];
    className?: string;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
    title,
    actions,
    className = '',
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
                            className="w-full justify-start"
                            icon={<action.icon className="h-4 w-4" />}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};