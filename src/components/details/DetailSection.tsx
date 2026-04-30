import React from 'react';

interface DetailSectionProps
{
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
    title,
    subtitle,
    action,
    children,
    className = '',
}) =>
{
    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        {subtitle && (
                            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
};