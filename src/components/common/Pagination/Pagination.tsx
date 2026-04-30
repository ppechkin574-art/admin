import { FC } from 'react';
import { PaginationInfo } from '@/types';
import styles from './Pagination.module.scss';
import clsx from 'clsx';

export interface PaginationProps
{
    pagination: PaginationInfo;
    onPageChange: (page: number) => void;
    loading?: boolean;
    itemsCount?: number;
    showCounter?: boolean;
    className?: string;
}

export const Pagination: FC<PaginationProps> = ({
    pagination,
    onPageChange,
    loading = false,
    itemsCount = 0,
    showCounter = true,
    className = ''
}) =>
{
    const showPagination = !loading && itemsCount > 0 && pagination.totalPages > 1;
    const isFirstPage = pagination.currentPage === 1;
    const isLastPage = pagination.currentPage === pagination.totalPages;

    if (!showPagination) return null;

    const renderPageNumbers = () =>
    {
        const pages = [];
        const totalPages = pagination.totalPages || 1;
        const currentPage = pagination.currentPage || 1;

        let startPage = Math.max(2, currentPage - 2);
        let endPage = Math.min(totalPages - 1, currentPage + 2);

        if (currentPage <= 3)
            endPage = Math.min(totalPages - 1, 5);

        if (currentPage >= totalPages - 2)
            startPage = Math.max(2, totalPages - 4);

        pages.push(
            <li key={1} className={clsx(styles.pagination__page_item, currentPage === 1 && styles.pagination__page_item__active)}>
                <button className={styles.pagination__page_btn} onClick={() => onPageChange(1)}>1</button>
            </li>
        );

        if (startPage > 2)
            pages.push(
                <li key="ellipsis1" className={clsx(styles.pagination__page_item, styles.pagination__page_item__disabled)}>
                    <span className={styles.pagination__page_dots}>...</span>
                </li>
            );

        for (let i = startPage; i <= endPage; i++)
        {
            pages.push(
                <li key={i} className={clsx(styles.pagination__page_item, currentPage === i && styles.pagination__page_item__active)
                }>
                    <button className={styles.pagination__page_btn} onClick={() => onPageChange(i)}>{i}</button>
                </li >
            );
        }

        if (endPage < totalPages - 1)
            pages.push(
                <li key="ellipsis2" className={clsx(styles.pagination__page_item, styles.pagination__page_item__disabled)}>
                    <span className={styles.pagination__page_dots}>...</span>
                </li>
            );

        if (totalPages > 1)
            pages.push(
                <li key={totalPages} className={clsx(styles.pagination__page_item, currentPage === totalPages && styles.pagination__page_item__active)
                }>
                    <button className={styles.pagination__page_btn} onClick={() => onPageChange(totalPages)}>{totalPages}</button>
                </li >
            );

        return pages;
    };

    return (
        <div className={clsx(styles.pagination, className)}>
            <div className={styles.pagination__controls}>
                <button
                    className={clsx(styles.pagination__nav_btn, styles.pagination__nav_btn__prev, isFirstPage && styles.pagination__nav_btn__disabled)}
                    onClick={() => !isFirstPage && onPageChange(pagination.currentPage - 1)}
                    disabled={isFirstPage}
                >
                    <i className={'fas fa-chevron-left'}></i>
                    Назад
                </button>

                <ul className={styles.pagination__pages}>
                    {renderPageNumbers()}
                </ul>

                <button
                    className={clsx(styles.pagination__nav_btn, styles.pagination__nav_btn__next, isLastPage && styles.pagination__nav_btn__disabled)}
                    onClick={() => !isLastPage && onPageChange(pagination.currentPage + 1)}
                    disabled={isLastPage}
                >
                    Вперед
                    <i className={'fas fa-chevron-right'}></i>
                </button>
            </div>

            {showCounter && !loading && itemsCount > 0 && (
                <div className={styles.pagination__counter}>
                    Страница <strong>{pagination.currentPage}</strong> из <strong>{pagination.totalPages}</strong>
                    {pagination.totalItems && (
                        <span className={styles.pagination__total}> • Всего: {pagination.totalItems}</span>
                    )}
                </div>
            )}
        </div>
    );
};