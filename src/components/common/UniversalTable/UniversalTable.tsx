import React from 'react';
import { TableActions, UniversalTableProps, PaginationInfo } from '@/types';
import Badge from '@/components/common/Badge';
import PageSizeSelector from '@/components/common/PageSizeSelector';
import ResultsInfo from '@/components/common/ResultsInfo';
import Pagination from '@/components/common/Pagination';
import styles from './UniversalTable.module.scss';
import clsx from 'clsx';

export const UniversalTable: React.FC<UniversalTableProps> = ({
    data,
    columns,
    actions = {},
    loading = false,
    emptyMessage = "Данные не найдены",
    onRowClick,
    selectedRows = [],
    onSelectRow,
    onSelectAll,
    selectable = false,
    rowClassName,
    cellClassName,
    headerClassName,
    showControls = true,
    resultsInfoProps,
    showPageSizeSelector = true,
    pagination,
    onPageChange,
    pageSize,
    onPageSizeChange
}) =>
{
    const allSelected = data.length > 0 && selectedRows.length === data.length;
    const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) =>
        onSelectAll?.(e.target.checked);

    const handleSelectRow = (item: any, checked: boolean) =>
        onSelectRow?.(item.id.toString(), checked);

    const handleAction = (action: string, item: any, e: React.MouseEvent) =>
    {
        e.stopPropagation();
        const actionHandler = (actions as TableActions)[action];
        if (actionHandler && actionHandler.handler)
            actionHandler.handler(item);
    };

    const handleRowClick = (item: any) =>
        onRowClick?.(item);

    // Функция для рендера значения ячейки с поддержкой бейджей
    const renderCellValue = (value: any, column: any, item: any) =>
    {
        if (column.render)
            return column.render(value, item);

        // Автоматическое отображение бейджей для boolean значений
        if (typeof value === 'boolean')
        {
            if (column.key === 'has_hint' || column.key?.includes('hint'))
                return value ? (
                    <Badge type="hint" icon="fa-lightbulb" size="sm">
                        Есть подсказка
                    </Badge>
                ) : (
                    <Badge type="secondary" icon="fa-times" size="sm">
                        Нет подсказки
                    </Badge>
                );

            if (column.key === 'has_media' || column.key?.includes('media'))
                return value ? (
                    <Badge type="media" icon="fa-image" size="sm">
                        Есть медиа
                    </Badge>
                ) : (
                    <Badge type="secondary" icon="fa-times" size="sm">
                        Нет медиа
                    </Badge>
                );

            // Общий случай для boolean
            return value ? (
                <Badge type="success" icon="fa-check" size="sm">
                    Да
                </Badge>
            ) : (
                <Badge type="secondary" icon="fa-times" size="sm">
                    Нет
                </Badge>
            );
        }

        return value;
    };

    if (loading)
        return (
            <div className={styles.universal_table_loading}>
                <div className={styles.universal_table_spinner}></div>
                <p>Загрузка данных...</p>
            </div>
        );

    if (!data?.length)
        return (
            <div className={styles.universal_table_empty}>
                <i className={'fas fa-inbox'}></i>
                <h5>{emptyMessage}</h5>
            </div>
        );

    return (
        <div className={styles.universal_table_wrapper}>
            {/* Верхняя панель с контролами */}
            {showControls && (
                <div className={styles.universal_table_header}>
                    {resultsInfoProps && (
                        <div className={styles.universal_table_header__left}>
                            <ResultsInfo {...resultsInfoProps} />
                        </div>
                    )}
                    {showPageSizeSelector && pageSize && onPageSizeChange && (
                        <div className={styles.universal_table_header__right}>
                            <PageSizeSelector
                                pageSize={pageSize}
                                onPageSizeChange={onPageSizeChange}
                                loading={loading}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className={styles.universal_table_container}>
                <table className={styles.universal_table}>
                    <thead>
                        <tr>
                            {selectable && (
                                <th style={{ width: 55 }} className={styles.universal_table__select_column}>
                                    <label className={styles.universal_table__checkbox_label}>
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={input =>
                                            {
                                                if (input) input.indeterminate = someSelected;
                                            }}
                                            onChange={handleSelectAll}
                                        />
                                        <span className={styles.universal_table__checkmark}></span>
                                    </label>
                                </th>
                            )}
                            {columns.map((column, index) => (
                                <th
                                    key={column.key}
                                    style={{ width: column.width, ...column.style }}
                                    className={clsx(headerClassName, index < columns.length - 1 && styles.universal_table__column_divider)}
                                >
                                    {column.title}
                                </th>
                            ))}
                            {Object.keys(actions).length > 0 && (
                                <th style={{ width: 140 }} className={styles.universal_table__actions_column}>
                                    Действия
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr
                                key={item.id || index}
                                className={clsx(onRowClick && styles.clickable, selectedRows.includes(item.id) && styles.selected, rowClassName)}
                                onClick={() => handleRowClick(item)}
                            >
                                {selectable && (
                                    <td className={styles.universal_table__select_column}>
                                        <label className={styles.universal_table__checkbox_label}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(item.id)}
                                                onChange={(e) => handleSelectRow(item, e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className={styles.universal_table__checkmark}></span>
                                        </label>
                                    </td>
                                )}
                                {columns.map((column, colIndex) => (
                                    <td
                                        key={column.key}
                                        className={clsx(cellClassName, colIndex < columns.length - 1 && styles.universal_table__column_divider, (column.key === 'topic' || column.key === 'topic_name' || column.key?.includes('topic')) && styles.universal_table__topic_cell)}
                                    >
                                        {renderCellValue(item[column.key], column, item)}
                                    </td>
                                ))}
                                {Object.keys(actions).length > 0 && (
                                    <td className={styles.universal_table__actions_cell}>
                                        <div className={styles.universal_table__actions}>
                                            {actions.view && (
                                                <button
                                                    className={clsx(styles.action_btn, styles.view)}
                                                    onClick={(e) => handleAction('view', item, e)}
                                                    title="Просмотр"
                                                >
                                                    <i className={'fas fa-eye'}></i>
                                                </button>
                                            )}
                                            {actions.edit && (
                                                <button
                                                    className={clsx(styles.action_btn, styles.edit)}
                                                    onClick={(e) => handleAction('edit', item, e)}
                                                    title="Редактировать"
                                                >
                                                    <i className={'fas fa-edit'}></i>
                                                </button>
                                            )}
                                            {actions.delete && (
                                                <button
                                                    className={clsx(styles.action_btn, styles.delete)}
                                                    onClick={(e) => handleAction('delete', item, e)}
                                                    title="Удалить"
                                                >
                                                    <i className={'fas fa-trash'}></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div >

            {
                pagination && onPageChange && data.length > 0 && (
                    <div className={styles.universal_table_pagination}>
                        <Pagination
                            pagination={pagination}
                            onPageChange={onPageChange}
                            loading={loading}
                            itemsCount={data.length}
                        />
                    </div>
                )
            }
        </div >
    );
};