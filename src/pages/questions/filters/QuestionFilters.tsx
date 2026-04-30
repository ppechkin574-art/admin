import React from 'react';
import { QuestionFiltersProps } from '@/types';
import styles from './QuestionFilters.module.scss';
import clsx from 'clsx';

export const QuestionFilters: React.FC<QuestionFiltersProps> = ({
    filters = {},
    difficultyOptions = [],
    typeOptions = [],
    subjectOptions = [],
    filteredTopicGroups = [],
    onFilterChange,
    onSubjectFilterChange,
    onResetFilters,
    hideSubjectFilter = false
}) =>
{
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        onFilterChange({ search: e.target.value });
    };

    const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        onFilterChange({ difficulty: selected });
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        onFilterChange({ type: selected });
    };

    const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        onSubjectFilterChange(selected);
    };

    const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        onFilterChange({ topic_ids: selected });
    };

    const isSubjectFilterDisabled = hideSubjectFilter;

    return (
        <div className={styles.filters}>
            <div className={styles.filters__header}>
                <h3 className={styles.filters__title}>
                    <i className={clsx(styles.fas, styles.fa_filter, styles.filters__title_icon)}></i>
                    Фильтры вопросов
                </h3>
                <button
                    type="button"
                    className={styles.filters__reset_btn}
                    onClick={onResetFilters}
                >
                    <i className={clsx(styles.fas, styles.fa_redo)}></i>
                    Сбросить
                </button>
            </div>

            <div className={styles.filters__content}>
                <div className={styles.filters__group}>
                    <label className={styles.filters__label}>
                        <i className={clsx(styles.fas, styles.fa_search, styles.filters__label_icon)}></i>
                        Поиск по вопросам
                    </label>
                    <div className={styles.filters__input_wrapper}>
                        <input
                            type="text"
                            className={styles.filters__input}
                            placeholder="Введите текст для поиска..."
                            value={filters.search || ''}
                            onChange={handleSearchChange}
                        />
                        <i className={clsx(styles.fas, styles.fa_search, styles.filters__input_icon)}></i>
                    </div>
                </div>

                <div className={styles.filters__row}>
                    <div className={styles.filters__group}>
                        <label className={styles.filters__label}>
                            <i className={clsx(styles.fas, styles.fa_signal, styles.filters__label_icon)}></i>
                            Сложность
                        </label>
                        <select
                            className={styles.filters__select}
                            multiple
                            value={filters.difficulty || []}
                            onChange={handleDifficultyChange}
                            size={4}
                        >
                            {difficultyOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <div className={styles.filters__selected_count}>
                            Выбрано: {(filters.difficulty || []).length}
                        </div>
                    </div>

                    <div className={styles.filters__group}>
                        <label className={styles.filters__label}>
                            <i className={clsx(styles.fas, styles.fa_tags, styles.filters__label_icon)}></i>
                            Тип вопроса
                        </label>
                        <select
                            className={styles.filters__select}
                            multiple
                            value={filters.type || []}
                            onChange={handleTypeChange}
                            size={4}
                        >
                            {typeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <div className={styles.filters__selected_count}>
                            Выбрано: {(filters.type || []).length}
                        </div>
                    </div>

                    {!hideSubjectFilter && (
                        <div className={styles.filters__group}>
                            <label className={styles.filters__label}>
                                <i className={clsx(styles.fas, styles.fa_book, styles.filters__label_icon)}></i>
                                Предметы
                            </label>
                            <select
                                className={clsx(styles.filters__select, isSubjectFilterDisabled && styles.filters__select__disabled)}
                                multiple
                                value={filters.subject_ids || []}
                                onChange={handleSubjectChange}
                                disabled={isSubjectFilterDisabled}
                                size={4}
                            >
                                {subjectOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <div className={styles.filters__selected_count}>
                                Выбрано: {(filters.subject_ids || []).length}
                            </div>
                        </div>
                    )}

                    <div className={styles.filters__group}>
                        <label className={styles.filters__label}>
                            <i className={clsx(styles.fas, styles.fa_folder, styles.filters__label_icon)}></i>
                            Темы
                        </label>
                        <select
                            className={clsx(styles.filters__select, !hideSubjectFilter && !filters.subject_ids?.length && styles.filters__select__disabled)}
                            multiple
                            value={filters.topic_ids || []}
                            onChange={handleTopicChange}
                            disabled={!hideSubjectFilter && !filters.subject_ids?.length}
                            size={4}
                        >
                            {filteredTopicGroups.map(group => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.options.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <div className={styles.filters__selected_count}>
                            {!hideSubjectFilter && !filters.subject_ids?.length
                                ? 'Сначала выберите предметы'
                                : `Выбрано: ${(filters.topic_ids || []).length}`}
                        </div>
                    </div>
                </div>

                <div className={styles.filters__hint}>
                    <i className={clsx(styles.fas, styles.fa_info_circle, styles.filters__hint_icon)}></i>
                    Для выбора нескольких значений удерживайте <kbd>Ctrl</kbd> (Windows) или <kbd>Cmd</kbd> (Mac)
                </div>
            </div>
        </div>
    );
};