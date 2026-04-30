import React from 'react';
import Button from '@/components/common/Button';
import { LucideIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionButton
{
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
    disabled?: boolean;
    hidden?: boolean;
}

interface ListHeaderProps
{
    title: string;
    filterDisplayText?: string | null;
    backTo?: string;
    actionButtons?: ActionButton[];
    children?: React.ReactNode;
}

export const ListHeader: React.FC<ListHeaderProps> = ({
    title,
    filterDisplayText,
    backTo,
    actionButtons = [],
    children,
}) =>
{
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {backTo && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate(backTo)}
                            icon={<ArrowLeft className="h-5 w-5" />}
                            className="!p-2"
                            aria-label="Назад"
                        />
                    )}
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                        {filterDisplayText && (
                            <div className="mt-2 text-sm text-gray-600">
                                {filterDisplayText}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {children}
                    {actionButtons
                        .filter(btn => !btn.hidden)
                        .map((btn, index) => (
                            <Button
                                key={index}
                                variant={btn.variant || 'primary'}
                                onClick={btn.onClick}
                                disabled={btn.disabled}
                                icon={btn.icon ? <btn.icon className="h-4 w-4" /> : undefined}
                            >
                                {btn.label}
                            </Button>
                        ))}
                </div>
            </div>
        </div>
    );
};