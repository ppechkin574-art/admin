import React from 'react';

interface DetailContentProps
{
    children: React.ReactNode;
    className?: string;
}

export const DetailContent: React.FC<DetailContentProps> = ({
    children,
    className = ''
}) =>
{
    return (
        <div className={`space-y-6 ${className}`}>
            {children}
        </div>
    );
};