import React from 'react';
import styles from './SearchPanel.module.scss';
import clsx from 'clsx';

interface SearchPanelProps
{
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onClear: () => void;
    placeholder?: string;
    resultsCount: number;
    totalCount: number;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
    searchTerm,
    onSearchChange,
    onClear,
    placeholder = "Поиск...",
    resultsCount,
    totalCount
}) =>
{
    return (
        <div className={styles.search_panel}>
            <div className={styles.search_panel__wrapper}>
                <i className={clsx('fas fa-search', styles.search_panel__icon)}></i>
                <input
                    type="text"
                    className={styles.search_panel__input}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchTerm && (
                    <button
                        className={styles.search_panel__clear}
                        onClick={onClear}
                        title="Очистить поиск"
                    >
                        <i className={'fas fa-times'}></i>
                    </button>
                )}
            </div>
            <div className={styles.search_panel__info}>
                Найдено: <strong>{resultsCount}</strong> из {totalCount}
                {searchTerm && (
                    <span className={styles.search_panel__term}>
                        по запросу: "{searchTerm}"
                    </span>
                )}
            </div>
        </div>
    );
};
