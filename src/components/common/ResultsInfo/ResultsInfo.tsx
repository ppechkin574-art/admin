import React from 'react';
import styles from './ResultsInfo.module.scss';
import { ResultsInfoProps } from '@/types';
import clsx from 'clsx';

export const ResultsInfo: React.FC<ResultsInfoProps> = ({
    loading = false,
    itemsCount = 0,
    totalItems = 0,
    filterText = '',
    hasActiveFilters = false,
    onResetFilters,
    entityName = 'элементов',
    className = '',
    showEntityName = true
}) =>
{
    if (loading)
        return (
            <div className={clsx(styles.results_info, className)}>
                <div className={styles.results_info__content}>
                    <div className={styles.results_info__text}>
                        <i className={clsx('fas fa-spinner fa-spin', styles.results_info__icon)}></i>
                        Загрузка...
                    </div>
                </div>
            </div>
        );

    const showResultsInfo = itemsCount > 0 || hasActiveFilters;
    if (!showResultsInfo && !loading) return null;

    return (
        <div className={clsx(styles.results_info, className)}>
            <div className={styles.results_info__content}>
                <div className={styles.results_info__text}>
                    <i className={clsx('fas fa-chart-bar', styles.results_info__icon)}></i>
                    {hasActiveFilters ? (
                        itemsCount > 0 ? (
                            <span>
                                Найдено {showEntityName ? entityName : 'элементов'}: <strong>{totalItems || itemsCount}</strong>
                                {filterText && (
                                    <span className={styles.results_info__filters}> ({filterText})</span>
                                )}
                            </span>
                        ) : (
                            <span>
                                {showEntityName ? entityName : 'Элементы'} не найдены
                                {filterText && (
                                    <span className={styles.results_info__filters}> с фильтрами: {filterText}</span>
                                )}
                            </span>
                        )
                    ) : (
                        <span>
                            Показаны все {showEntityName ? entityName : 'элементы'}: <strong>{totalItems}</strong> шт.
                        </span>
                    )}
                </div>

                {/* {hasActiveFilters && onResetFilters && (
                    <button
                        className={styles.results_info__reset_btn}
                        onClick={onResetFilters}
                    >
                        <i className={clsx(styles.fas, styles.fa_times)}></i>
                        Сбросить фильтры
                    </button>
                )} */}
            </div>
        </div>
    );
};
