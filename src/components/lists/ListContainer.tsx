import React from 'react';

interface ListContainerProps
{
    children: React.ReactNode;
    className?: string;
}

export const ListContainer: React.FC<ListContainerProps> = ({ children, className = '' }) =>
{
    return (
        <div className={`space-y-6 ${className}`}>
            {children}
        </div>
    );
};