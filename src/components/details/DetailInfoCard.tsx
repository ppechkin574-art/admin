import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DetailInfoCardItem
{
    label: string;
    value: React.ReactNode;
    icon?: LucideIcon;
    onClick?: () => void;
}

interface DetailInfoCardProps
{
    title: string;
    icon: LucideIcon;
    items: DetailInfoCardItem[];
    className?: string;
}

export const DetailInfoCard: React.FC<DetailInfoCardProps> = ({
    title,
    icon: Icon,
    items,
    className = ''
}) =>
{
    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                </div>
            </div>
            <div className="p-6">
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                                {item.icon && <item.icon className="h-4 w-4 text-gray-400" />}
                                <span className="text-sm text-gray-500">{item.label}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-900 text-right max-w-xs">
                                {item.onClick ? (
                                    <button
                                        onClick={item.onClick}
                                        className="hover:text-blue-600 hover:underline transition-colors"
                                    >
                                        {item.value}
                                    </button>
                                ) : (
                                    item.value
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};