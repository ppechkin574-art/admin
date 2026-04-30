import React from 'react';

interface DetailGridProps
{
    leftColumn: React.ReactNode;
    rightColumn: React.ReactNode;
    className?: string;
}

export const DetailGrid: React.FC<DetailGridProps> = ({
    leftColumn,
    rightColumn,
    className = '',
}) =>
{
    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
            <div className="lg:col-span-1 space-y-6">
                {leftColumn}
            </div>

            <div className="lg:col-span-2 space-y-6">
                {rightColumn}
            </div>
        </div>
    );
};