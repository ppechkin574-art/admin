import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DetailStatsProps
{
    stats: Array<{
        label: string;
        value: string | number;
        icon: LucideIcon;
        description?: string;
        onClick?: () => void;
    }>;
    columns?: 2 | 3 | 4;
    loading?: boolean;
}

export const DetailStats: React.FC<DetailStatsProps> = ({
    stats,
    columns = 4,
    loading = false
}) =>
{
    const gridClasses = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className={`grid ${gridClasses[columns]} gap-4`}>
                    {stats.map((stat, index) => (
                        <div key={index} className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                <stat.icon className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-500 truncate">
                                    {stat.label}
                                </div>
                                {stat.onClick ? (
                                    <button
                                        onClick={stat.onClick}
                                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors truncate block w-full text-left"
                                        disabled={loading}
                                    >
                                        {stat.value}
                                    </button>
                                ) : (
                                    <div className="text-lg font-semibold text-gray-900 truncate">
                                        {stat.value}
                                    </div>
                                )}
                                {stat.description && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {stat.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};