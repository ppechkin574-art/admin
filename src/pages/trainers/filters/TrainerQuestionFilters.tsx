// import React from 'react';
// import { TrainingFilters } from '@/types/trainings';
// import styles from './TrainerQuestionFilters.module.scss';
// import clsx from 'clsx';

// interface TrainerQuestionFiltersProps
// {
//     filters: TrainingFilters;
//     difficultyOptions: Array<{ value: string; label: string }>;
//     typeOptions: Array<{ value: string; label: string }>;
//     onFilterChange: (filters: Partial<TrainingFilters>) => void;
//     onResetFilters: () => void;
// }

// const TrainerQuestionFilters: React.FC<TrainerQuestionFiltersProps> = ({
//     filters = {
//         search: '',
//         difficulty: [],
//         type: []
//     },
//     difficultyOptions = [],
//     typeOptions = [],
//     onFilterChange,
//     onResetFilters
// }) =>
// {
//     const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
//     {
//         onFilterChange({ search: e.target.value });
//     };

//     const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
//     {
//         const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
//         onFilterChange({ difficulty: selected });
//     };

//     const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
//     {
//         const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
//         onFilterChange({ type: selected });
//     };

//     return (
//         <div className={styles.training_question_filters}>
//             <div className={styles.training_question_filters__header}>
//                 <h3 className={styles.training_question_filters__title}>
//                     <i className={clsx(styles.fas, styles.fa_filter, styles.training_question_filters__title_icon)}></i>
//                     Фильтры вопросов
//                 </h3>
//                 <button
//                     type="button"
//                     className={styles.training_question_filters__reset_btn}
//                     onClick={onResetFilters}
//                 >
//                     <i className={clsx(styles.fas, styles.fa_redo)}></i>
//                     Сбросить всё
//                 </button>
//             </div>

//             <div className={styles.training_question_filters__content}>
//                 {/* Поиск */}
//                 <div className={styles.training_question_filters__group}>
//                     <label className={styles.training_question_filters__label}>
//                         <i className={clsx(styles.fas, styles.fa_search, styles.training_question_filters__label_icon)}></i>
//                         Поиск по вопросам
//                     </label>
//                     <div className={styles.training_question_filters__input_wrapper}>
//                         <input
//                             type="text"
//                             className={styles.training_question_filters__input}
//                             placeholder="Введите текст для поиска..."
//                             value={filters.search || ''}
//                             onChange={handleSearchChange}
//                         />
//                         <i className={clsx(styles.fas, styles.fa_search, styles.training_question_filters__input_icon)}></i>
//                     </div>
//                 </div>

//                 <div className={styles.training_question_filters__row}>
//                     {/* Сложность */}
//                     <div className={styles.training_question_filters__group}>
//                         <label className={styles.training_question_filters__label}>
//                             <i className={clsx(styles.fas, styles.fa_signal, styles.training_question_filters__label_icon)}></i>
//                             Сложность
//                         </label>
//                         <select
//                             className={styles.training_question_filters__select}
//                             multiple
//                             value={filters.difficulty || []}
//                             onChange={handleDifficultyChange}
//                             size={4}
//                         >
//                             {difficultyOptions.map(option => (
//                                 <option key={option.value} value={option.value}>
//                                     {option.label}
//                                 </option>
//                             ))}
//                         </select>
//                         <div className={styles.training_question_filters__selected_count}>
//                             Выбрано: {(filters.difficulty || []).length}
//                         </div>
//                     </div>

//                     {/* Тип вопроса */}
//                     <div className={styles.training_question_filters__group}>
//                         <label className={styles.training_question_filters__label}>
//                             <i className={clsx(styles.fas, styles.fa_tags, styles.training_question_filters__label_icon)}></i>
//                             Тип вопроса
//                         </label>
//                         <select
//                             className={styles.training_question_filters__select}
//                             multiple
//                             value={filters.type || []}
//                             onChange={handleTypeChange}
//                             size={4}
//                         >
//                             {typeOptions.map(option => (
//                                 <option key={option.value} value={option.value}>
//                                     {option.label}
//                                 </option>
//                             ))}
//                         </select>
//                         <div className={styles.training_question_filters__selected_count}>
//                             Выбрано: {(filters.type || []).length}
//                         </div>
//                     </div>
//                 </div>

//                 {/* Хинты для multiple select */}
//                 <div className={styles.training_question_filters__hint}>
//                     <i className={clsx(styles.fas, styles.fa_info_circle, styles.training_question_filters__hint_icon)}></i>
//                     Для выбора нескольких значений удерживайте <kbd>Ctrl</kbd> (Windows) или <kbd>Cmd</kbd> (Mac)
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default TrainerQuestionFilters;