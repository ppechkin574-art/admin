import React from 'react'
import { Filter, Search, X, ChevronDown, ChevronUp } from 'lucide-react'

interface FilterOption
{
    value: string
    label: string
}

interface FilterOptionGroup
{
    label: string
    options: FilterOption[]
}

interface FilterConfig
{
    search?: {
        placeholder?: string
        disabled?: boolean
    }
    selects?: {
        key: string
        label: string
        icon: React.ComponentType<{ className?: string }>
        options: FilterOption[] | FilterOptionGroup[]
        multiple?: boolean
        disabled?: boolean
        placeholder?: string
    }[]
}

interface SimpleFilterProps
{
    title?: string
    filters: Record<string, any>
    filterConfig: FilterConfig
    onFilterChange: (key: string, value: any) => void
    onResetFilters: () => void
    isOpen?: boolean
    onToggle?: () => void
    loading?: boolean
    activeFiltersCount?: number
}

const SimpleFilter: React.FC<SimpleFilterProps> = ({
    title = 'Фильтры',
    filters,
    filterConfig,
    onFilterChange,
    onResetFilters,
    isOpen = true,
    onToggle,
    loading = false,
    activeFiltersCount = 0,
}) =>
{
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        if (loading) return
        onFilterChange('search', e.target.value)
    }

    const handleSelectChange = (key: string, value: any) =>
    {
        if (loading) return
        onFilterChange(key, value)
    }

    const handleSearchClear = () =>
    {
        onFilterChange('search', '')
    }

    const handleSelectClear = (key: string) =>
    {
        const isMultiple = filterConfig.selects?.find(s => s.key === key)?.multiple
        onFilterChange(key, isMultiple ? [] : '')
    }

    const renderOptions = (options: FilterOption[] | FilterOptionGroup[]) =>
    {
        if (options.length === 0) return null

        if ('options' in options[0])
            return (options as FilterOptionGroup[]).map((group) => (
                <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                        <option key={option.value} value={option.value} className="py-1.5">
                            {option.label}
                        </option>
                    ))}
                </optgroup>
            ))

        return (options as FilterOption[]).map((option) => (
            <option key={option.value} value={option.value} className="py-1.5">
                {option.label}
            </option>
        ))
    }

    const selectCount = filterConfig.selects?.length || 0
    let gridColsClass = ''
    if (selectCount === 1)
        gridColsClass = 'grid-cols-1'
    else if (selectCount === 2)
        gridColsClass = 'grid-cols-1 md:grid-cols-2'
    else if (selectCount === 3)
        gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    else
        gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6">
                <div className={`flex items-center justify-between ${isOpen ? 'mb-6' : 'mb-0'}`}>
                    <div className="flex items-center">
                        <Filter className="h-5 w-5 text-gray-400 mr-2" />
                        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        {activeFiltersCount > 0 && !loading && (
                            <button
                                onClick={onResetFilters}
                                className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Сбросить
                            </button>
                        )}

                        {onToggle && (
                            <button
                                onClick={onToggle}
                                className="text-gray-400 hover:text-gray-500 transition-colors"
                                disabled={loading}
                            >
                                {isOpen ? (
                                    <ChevronUp className="h-5 w-5" />
                                ) : (
                                    <ChevronDown className="h-5 w-5" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {isOpen && (
                    <div className="space-y-6 flex space-x-0 md:space-x-6 md:space-y-0">
                        {filterConfig.search && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Поиск
                                </label>
                                <div className="relative max-w-xl">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                                        placeholder={filterConfig.search.placeholder}
                                        value={filters.search || ''}
                                        onChange={handleSearchChange}
                                        disabled={filterConfig.search.disabled || loading}
                                    />
                                    {filters.search && (
                                        <button
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={handleSearchClear}
                                            type="button"
                                            disabled={loading}
                                        >
                                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {filterConfig.selects && filterConfig.selects.length > 0 && (
                            <div className={`grid ${gridColsClass} gap-5 w-full overflow`}>
                                {filterConfig.selects.map((select) =>
                                {
                                    const Icon = select.icon
                                    const hasValue = Array.isArray(filters[select.key])
                                        ? filters[select.key]?.length > 0
                                        : filters[select.key]

                                    return (
                                        <div key={select.key} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    <Icon className="inline-block h-4 w-4 mr-1.5" />
                                                    {select.label}
                                                </label>
                                                {hasValue && (
                                                    <button
                                                        onClick={() => handleSelectClear(select.key)}
                                                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                                        disabled={loading}
                                                    >
                                                        Очистить
                                                    </button>
                                                )}
                                            </div>
                                            <select
                                                className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors bg-white"
                                                multiple={select.multiple}
                                                value={filters[select.key] || (select.multiple ? [] : '')}
                                                onChange={(e) =>
                                                {
                                                    const value = e.target.multiple
                                                        ? Array.from(e.target.selectedOptions, (option) => option.value)
                                                        : e.target.value
                                                    handleSelectChange(select.key, value)
                                                }}
                                                disabled={select.disabled || loading}
                                                size={select.multiple ? 4 : 1}
                                            >
                                                {!select.multiple && (
                                                    <option value="" className="text-gray-400">
                                                        {select.placeholder || `Выберите ${select.label.toLowerCase()}...`}
                                                    </option>
                                                )}
                                                {renderOptions(select.options)}
                                            </select>
                                            {hasValue && !select.multiple && (
                                                <div className="text-xs text-gray-500 truncate">
                                                    {(() =>
                                                    {
                                                        const value = filters[select.key]
                                                        if (Array.isArray(select.options))
                                                        {
                                                            const option = (select.options as FilterOption[]).find(
                                                                (opt) => opt.value === value
                                                            )
                                                            return option?.label || value
                                                        }
                                                        return value
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SimpleFilter