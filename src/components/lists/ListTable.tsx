import React, { useMemo } from 'react';
import SimpleTable from '@/components/common/SimpleTable';
import { Pagination } from '@/components/lists/Pagination';

interface ListTableProps
{
    data: any[];
    columns: any[];
    loading: boolean;
    emptyMessage: string;
    selectable?: boolean;
    selectedRows?: string[];
    onSelectRow?: (id: string, checked: boolean) => void;
    onSelectAll?: (checked: boolean) => void;
    actions?: any;

    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    totalRecords: number;
    // showAdvancedPagination?: boolean;
    loadingText?: string;
}

export const ListTable: React.FC<ListTableProps> = ({
    data,
    columns,
    loading,
    emptyMessage,
    selectable = false,
    selectedRows = [],
    onSelectRow = () => { },
    onSelectAll = () => { },
    actions,
    currentPage,
    totalPages,
    onPageChange,
    pageSize,
    onPageSizeChange,
    totalRecords,
    showAdvancedPagination = false,
    loadingText = 'Загрузка...',
}) =>
{
    const showingText = useMemo(() =>
    {
        return `Показано ${Math.min((currentPage - 1) * pageSize + 1, totalRecords)} - ${Math.min(currentPage * pageSize, totalRecords)} из ${totalRecords}`;
    }, [currentPage, pageSize, totalRecords]);

    if (loading && data.length === 0)
    {
        return (
            <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-gray-400 mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                </div>
                <p className="text-gray-500">{loadingText}</p>
            </div>
        );
    }

    return (
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
                        <option value="100">100</option>
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
                selectable={selectable}
                selectedRows={selectedRows}
                onSelectRow={onSelectRow}
                onSelectAll={onSelectAll}
                actions={actions}
            />

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                    // showAdvancedPagination={showAdvancedPagination}
                    loading={loading}
                />
            )}
        </div>
    );
};