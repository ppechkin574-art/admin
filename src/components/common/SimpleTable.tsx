import React from 'react'
import { Eye, Edit, Trash2 } from 'lucide-react'

interface Column
{
    header: string
    accessor: string
    width?: string | number
    render?: (value: any, item: any) => React.ReactNode
}

interface SimpleTableProps
{
    data: any[]
    columns: Column[]
    loading?: boolean
    emptyMessage?: string
    selectable?: boolean
    selectedRows?: string[]
    onSelectRow?: (id: string, checked: boolean) => void
    onSelectAll?: (checked: boolean) => void
    actions?: {
        view?: (item: any) => void
        edit?: (item: any) => void
        delete?: (item: any) => void
    }
}

const SimpleTable: React.FC<SimpleTableProps> = ({
    data,
    columns,
    loading = false,
    emptyMessage = 'Данные не найдены',
    selectable = false,
    selectedRows = [],
    onSelectRow,
    onSelectAll,
    actions,
}) =>
{
    const allSelected = data.length > 0 && selectedRows.length === data.length
    const someSelected = selectedRows.length > 0 && selectedRows.length < data.length

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        if (onSelectAll)
            onSelectAll(e.target.checked)
    }

    const handleSelectRow = (id: string, checked: boolean) =>
    {
        if (onSelectRow)
            onSelectRow(id, checked)
    }

    const renderCellValue = (value: any, column: Column, item: any) =>
    {
        if (column.render)
            return column.render(value, item)

        if (typeof value === 'boolean')
            return (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${value
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {value ? 'Да' : 'Нет'}
                </span>
            )

        if (typeof value === 'string' && value.length > 100)
            return `${value.substring(0, 100)}...`

        return value || '-'
    }

    if (loading)
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )

    if (!data?.length)
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                    <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                </div>
                <h3 className="text-gray-900 font-medium mb-2">{emptyMessage}</h3>
                <p className="text-gray-500 text-sm">Попробуйте изменить фильтры или создать новый элемент</p>
            </div>
        )

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {selectable && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(input) =>
                                    {
                                        if (input) input.indeterminate = someSelected
                                    }}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                            </th>
                        )}
                        {columns.map((column, columnIndex) => (
                            <th
                                key={`${column.accessor}-header-${columnIndex}`}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                style={{ width: column.width }}
                            >
                                {column.header}
                            </th>
                        ))}
                        {actions && (actions.view || actions.edit || actions.delete) && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                Действия
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item, index) =>
                    {
                        const uniqueKey = item.id ? `${item.id}-${index}` : `row-${index}`

                        return (
                            <tr
                                key={uniqueKey}
                                className={selectedRows.includes(item.id?.toString()) ? 'bg-primary-50' : 'hover:bg-gray-50'}
                            >
                                {selectable && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(item.id?.toString())}
                                            onChange={(e) => handleSelectRow(item.id?.toString() || '', e.target.checked)}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                    </td>
                                )}
                                {columns.map((column, columnIndex) => (
                                    <td
                                        key={`${uniqueKey}-${column.accessor}-${columnIndex}`}
                                        className="px-6 py-4 text-sm text-gray-900"
                                    >
                                        {renderCellValue(item[column.accessor], column, item)}
                                    </td>
                                ))}
                                {actions && (actions.view || actions.edit || actions.delete) && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            {actions.view && (
                                                <button
                                                    onClick={() => actions.view!(item)}
                                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                    title="Просмотр"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            )}
                                            {actions.edit && (
                                                <button
                                                    onClick={() => actions.edit!(item)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Редактировать"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            )}
                                            {actions.delete && (
                                                <button
                                                    onClick={() => actions.delete!(item)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default SimpleTable