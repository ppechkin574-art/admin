import React from 'react';

interface DetailContainerProps
{
    children: React.ReactNode;
    className?: string;
}

export const DetailContainer: React.FC<DetailContainerProps> = ({
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