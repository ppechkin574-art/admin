import React from 'react';
import { QuestionActionsProps } from '@/types';
import styles from './QuestionActions.module.scss';
import clsx from 'clsx';

export const QuestionActions: React.FC<QuestionActionsProps> = ({
    onCreate,
    onImport,
    onRefresh,
    onBulkDelete,
    selectedCount = 0,
    loading = false
}) =>
{
    return (
        <div className={styles.question_actions}>
            <div className={styles.question_actions__header}>
                <div className={styles.question_actions__title_section}>
                    <h1 className={styles.question_actions__title}>Вопросы</h1>
                    <p className={styles.question_actions__description}>Все вопросы в приложении</p>
                </div>

                <div className={styles.question_actions__buttons}>
                    {/* Кнопка удаления выбранных */}
                    {selectedCount > 0 && (
                        <button
                            className={clsx(styles.question_actions__btn, styles.question_actions__btn__danger)}
                            onClick={onBulkDelete}
                            disabled={loading}
                            title={`Удалить выбранные вопросы (${selectedCount})`}
                        >
                            <i className={clsx('fas fa-trash', styles.question_actions__icon)}></i>
                            Удалить выбранные ({selectedCount})
                        </button>
                    )}

                    <button
                        className={clsx(styles.question_actions__btn, styles.question_actions__btn__refresh)}
                        onClick={onRefresh}
                        disabled={loading}
                        title="Обновить данные с сервера"
                    >
                        <i className={clsx('fas fa-sync-alt', styles.question_actions__icon, loading && 'fa-spin')}></i>
                        {loading ? 'Обновление...' : 'Обновить'}
                    </button>

                    <button
                        className={clsx(styles.question_actions__btn, styles.question_actions__btn__import)}
                        onClick={onImport}
                        disabled={loading}
                        title="Импорт вопросов из файла"
                    >
                        <i className={clsx('fas fa-file-import', styles.question_actions__icon)}></i>
                        Импорт
                    </button>

                    <button
                        className={clsx(styles.question_actions__btn, styles.question_actions__btn__create)}
                        onClick={onCreate}
                        disabled={loading}
                        title="Создать новый вопрос"
                    >
                        <i className={clsx('fas fa-plus', styles.question_actions__icon)}></i>
                        Создать вопрос
                    </button>
                </div>
            </div>
        </div>
    );
};