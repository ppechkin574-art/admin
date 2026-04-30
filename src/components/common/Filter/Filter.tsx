import React, { useState } from 'react';
import styles from './Filter.module.scss';
import clsx from 'clsx';

export interface FilterOption
{
    value: string;
    label: string;
}

export interface FilterOptionGroup
{
    label: string;
    options: FilterOption[];
}

export interface FilterProps
{
    title?: string;
    filters: {
        search?: string;
        [key: string]: any;
    };
    filterConfig: {
        search?: {
            placeholder?: string;
            disabled?: boolean;
        };
        selects?: {
            key: string;
            label: string;
            icon: string;
            options: FilterOption[] | FilterOptionGroup[];
            multiple?: boolean;
            disabled?: boolean;
            size?: number;
        }[];
    };
    onFilterChange: (key: string, value: any) => void;
    onResetFilters: () => void;
    entityName?: string;
    defaultCollapsed?: boolean;
    loading?: boolean;
}

export const Filter: React.FC<FilterProps> = ({
    title = 'Фильтры',
    filters,
    filterConfig,
    onFilterChange,
    onResetFilters,
    entityName = 'элементов',
    defaultCollapsed = false,
    loading = false
}) =>
{
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        if (loading) return;
        onFilterChange('search', e.target.value);
    };

    const handleSelectChange = (key: string, e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        if (loading) return;
        const value = e.target.multiple
            ? Array.from(e.target.selectedOptions, option => option.value)
            : e.target.value;
        onFilterChange(key, value);
    };

    const hasActiveFilters = Boolean(
        filters.search?.trim() ||
        Object.keys(filters).some(key =>
            key !== 'search' &&
            Array.isArray(filters[key]) &&
            filters[key].length > 0
        )
    );

    const activeFiltersCount = Object.keys(filters).reduce((count, key) =>
    {
        if (key === 'search')
            return filters.search?.trim() ? count + 1 : count;
        return Array.isArray(filters[key]) && filters[key].length > 0 ? count + 1 : count;
    }, 0);

    return (
        <div className={clsx(styles.filter, isCollapsed && styles.filter__collapsed, loading && styles.filter_loading)}>
            <div className={styles.filter__header}>
                <div className={styles.filter__header_left}>
                    <h3 className={styles.filter__title}>
                        <i className={clsx('fas', 'fa-filter', styles.filter__title_icon)}></i>
                        {title}
                        {hasActiveFilters && (
                            <span className={styles.filter__badge}>
                                {activeFiltersCount}
                            </span>
                        )}
                    </h3>
                </div>

                <div className={styles.filter__header_actions}>
                    <button
                        type="button"
                        className={clsx(styles.filter__btn, styles.filter__btn__toggle)}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'Показать фильтры' : 'Скрыть фильтры'}
                        disabled={loading}
                    >
                        <i className={clsx('fas', `fa-${isCollapsed ? 'eye' : 'eye-slash'}`, styles.filter__btn_icon)}></i>
                        {isCollapsed ? ' Показать' : ' Скрыть'}
                    </button>

                    {(activeFiltersCount > 0 && !loading) &&
                        <button
                            onClick={onResetFilters}
                            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Сбросить всё
                        </button>
                    }
                </div>
            </div>

            {!isCollapsed && (
                <div className={styles.filter__content}>
                    {filterConfig.search && (
                        <div className={styles.filter__search_group}>
                            <label className={styles.filter__label}>
                                <i className={clsx('fas', 'fa-search', styles.filter__label_icon)}></i>
                                Поиск по {entityName}
                            </label>
                            <div className={styles.filter__input_wrapper}>
                                <input
                                    type="text"
                                    className={styles.filter__input}
                                    placeholder={filterConfig.search.placeholder || `Поиск...`}
                                    value={filters.search || ''}
                                    onChange={handleSearchChange}
                                    disabled={filterConfig.search.disabled || loading}
                                />
                                <i className={clsx('fas', 'fa-search', styles.filter__input_icon)}></i>
                                {filters.search && (
                                    <button
                                        className={styles.filter__clear_search}
                                        onClick={() => onFilterChange('search', '')}
                                        type="button"
                                        disabled={loading}
                                    >
                                        <i className='fas fa-times'></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {filterConfig.selects && (
                        <div className={styles.filter__selects_row}>
                            {filterConfig.selects.map((select) => (
                                <div key={select.key} className={styles.filter__select_group}>
                                    <label className={styles.filter__label}>
                                        <i className={clsx('fas', `fa-${select.icon}`, styles.filter__label_icon)}></i>
                                        {select.label}
                                        {filters[select.key]?.length > 0 && (
                                            <span className={styles.filter__select_badge}>
                                                {filters[select.key].length}
                                            </span>
                                        )}
                                    </label>
                                    <select
                                        className={clsx(styles.filter__select, select.disabled && styles.filter__select_disabled)}
                                        multiple={select.multiple}
                                        value={filters[select.key] || (select.multiple ? [] : '')}
                                        onChange={(e) => handleSelectChange(select.key, e)}
                                        disabled={select.disabled || loading}
                                        size={select.size || 4}
                                    >
                                        {select.options.map((option: any) =>
                                        {
                                            if ('options' in option && Array.isArray(option.options))
                                                return (
                                                    <optgroup key={option.label} label={option.label}>
                                                        {option.options.map((opt: FilterOption) => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            return (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {select.multiple && (
                                        <div className={styles.filter__selected_count}>
                                            Выбрано: {(filters[select.key] || []).length}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.filter__hint}>
                        <i className={clsx('fas', 'fa-info-circle', styles.filter__hint_icon)}></i>
                        Для выбора нескольких значений удерживайте <kbd>Ctrl</kbd>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Filter;