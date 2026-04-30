import React, { useMemo } from 'react';
import SimpleTable from '@/components/common/SimpleTable';
import SimpleFilter from '@/components/common/SimpleFilter';
import { Pagination } from '@/components/lists/Pagination';
import Badge from '@/components/common/Badge';

interface DetailTableSectionProps
{
    title: string;
    data: any[];
    columns: any[];
    loading: boolean;
    emptyMessage: string;
    actions?: any;

    filters: any;
    filterConfig: any;
    onFilterChange: (key: string, value: any) => void;
    onResetFilters: () => void;
    filtersOpen?: boolean;
    onToggleFilters?: () => void;
    activeFiltersCount?: number;

    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    totalRecords: number;

    showHeader?: boolean;
    subtitle?: string;
    badge?: {
        label: string;
        type: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    };
}

export const DetailTableSection: React.FC<DetailTableSectionProps> = ({
    title,
    data,
    columns,
    loading,
    emptyMessage,
    actions,
    filters,
    filterConfig,
    onFilterChange,
    onResetFilters,
    filtersOpen = true,
    onToggleFilters,
    activeFiltersCount = 0,
    currentPage,
    totalPages,
    onPageChange,
    pageSize,
    onPageSizeChange,
    totalRecords,
    showHeader = true,
    subtitle,
    badge,
}) =>
{
    const showingText = useMemo(() =>
    {
        return `Показано ${Math.min((currentPage - 1) * pageSize + 1, totalRecords)} - ${Math.min(currentPage * pageSize, totalRecords)} из ${totalRecords}`;
    }, [currentPage, pageSize, totalRecords]);

    return (
        <div className="space-y-6">
            {showHeader && (
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                                {subtitle && (
                                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                                )}
                            </div>
                            {badge && (
                                <Badge type={badge.type}>
                                    {badge.label}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <SimpleFilter
                title={`Фильтры ${title.toLowerCase()}`}
                filters={filters}
                filterConfig={filterConfig}
                onFilterChange={onFilterChange}
                onResetFilters={onResetFilters}
                isOpen={filtersOpen}
                onToggle={onToggleFilters}
                loading={loading}
                activeFiltersCount={activeFiltersCount}
            />

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-700">На странице:</span>
                        <select
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            disabled={loading}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                        <span className="text-sm text-gray-700">
                            {showingText}
                        </span>
                    </div>
                </div>

                <SimpleTable
                    data={data}
                    columns={columns}
                    loading={loading}
                    emptyMessage={emptyMessage}
                    actions={actions}
                />

                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};