import UniversalTable from '@/components/common/UniversalTable';
import QuestionPagination from '@/components/common/Pagination';
import { questionService, trainerService } from '@/services/api';
import { Question } from '@/types';
import React, { useEffect, useState } from 'react';
import styles from './AddQuestionsModal.module.scss';
import Pagination from '@/components/common/Pagination';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface AddQuestionsModalProps
{
    trainerId: string;
    onClose: () => void;
    onQuestionsAdded: () => void;
}

interface QuestionWithSelection extends Question
{
    selected?: boolean;
}

const AddQuestionsModal: React.FC<AddQuestionsModalProps> = ({
    trainerId,
    onClose,
    onQuestionsAdded
}) =>
{

    const [availableQuestions, setAvailableQuestions] = useState<QuestionWithSelection[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const [filters, setFilters] = useState({
        search: '',
        difficulty: [] as string[],
        type: [] as string[]
    });

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 20,
        totalRecords: 0,
        totalPages: 0
    });

    useEffect(() =>
    {
        loadAvailableQuestions();
    }, [filters, pagination.currentPage, pagination.pageSize]);

    const loadAvailableQuestions = async () =>
    {
        try
        {
            setLoading(true);
            const response = await questionService.getAll({
                search: filters.search,
                difficulty: filters.difficulty,
                type: filters.type,
                page: pagination.currentPage,
                page_size: pagination.pageSize
            });

            let questionsData: Question[] = [];
            let totalRecords = 0;

            if (Array.isArray(response))
            {
                questionsData = response;
                totalRecords = response.length;
            } else if (response.data && Array.isArray(response.data))
            {
                questionsData = response.data;
                totalRecords = response.records_total || response.data.length;
            } else if (response.questions && Array.isArray(response.questions))
            {
                questionsData = response.questions;
                totalRecords = response.total_records || response.questions.length;
            }

            const questionsWithSelection: QuestionWithSelection[] = questionsData.map(question => ({
                ...question,
                selected: false
            }));

            setAvailableQuestions(questionsWithSelection);
            setPagination(prev => ({
                ...prev,
                totalRecords: totalRecords,
                totalPages: Math.ceil(totalRecords / pagination.pageSize)
            }));
        } catch (error)
        {
            console.error('Error loading available questions:', error);
            toast.error('Ошибка загрузки вопросов');
        } finally
        {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters: Partial<typeof filters>) =>
    {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (newPage: number) =>
    {
        setPagination(prev => ({ ...prev, currentPage: newPage }));
    };

    const handleQuestionSelect = (question: QuestionWithSelection) =>
    {
        setAvailableQuestions(prev =>
            prev.map(q =>
                q.id === question.id ? { ...q, selected: !q.selected } : q
            )
        );
    };

    const handleSelectAll = () =>
    {
        const allSelected = availableQuestions.every(q => q.selected);
        setAvailableQuestions(prev =>
            prev.map(q => ({ ...q, selected: !allSelected }))
        );
    };

    const handleRowClick = (item: QuestionWithSelection) =>
    {
        handleQuestionSelect(item);
    };

    const handleAddSelectedQuestions = async () =>
    {
        const selectedQuestions = availableQuestions.filter(q => q.selected);

        if (selectedQuestions.length === 0)
        {
            toast.error('Выберите хотя бы один вопрос');
            return;
        }

        try
        {
            setAdding(true);
            const trainerIdNum = parseInt(trainerId);

            for (const question of selectedQuestions)
            {
                await trainerService.addQuestion(trainerIdNum, question.id);
            }

            toast.success(`Добавлено ${selectedQuestions.length} вопросов в тренажер`);
            onQuestionsAdded();
        } catch (error)
        {
            console.error('Error adding questions to trainer:', error);
            toast.error('Ошибка добавления вопросов в тренажер');
        } finally
        {
            setAdding(false);
        }
    };

    const selectedCount = availableQuestions.filter(q => q.selected).length;

    const questionColumns = [
        {
            key: 'selected',
            title: '',
            width: '50px',
            render: (value: any, item: QuestionWithSelection) => (
                <input
                    type="checkbox"
                    checked={item.selected || false}
                    onChange={() => handleQuestionSelect(item)}
                    className={styles.add_questions_modal__checkbox}
                />
            )
        },
        {
            key: 'id',
            title: 'ID',
            width: '80px',
            render: (value: number) => <strong>#{value}</strong>
        },
        {
            key: 'blocks',
            title: 'Вопрос',
            render: (value: any, item: QuestionWithSelection) =>
            {
                const textBlocks = (item.blocks || [])
                    .filter((block: any) => block.type === 'text')
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((block: any) => block.value);

                const questionText = textBlocks.join(' ').substring(0, 100);
                return questionText + (questionText.length >= 100 ? '...' : '');
            }
        },
        {
            key: 'type',
            title: 'Тип',
            width: '120px',
            render: (value: string) =>
            {
                const typeConfig: Record<string, { class: string; text: string }> = {
                    multiple_choice: { class: 'badge--primary', text: 'Множеств. выбор' },
                    single_choice: { class: 'badge--success', text: 'Одиночный выбор' },
                };
                const config = typeConfig[value] || { class: 'badge--default', text: value };
                return <span className={clsx(styles.badge, config.class)}>{config.text}</span>;
            }
        },
        {
            key: 'difficulty',
            title: 'Сложность',
            width: '100px',
            render: (value: string) =>
            {
                const difficultyConfig: Record<string, { class: string; text: string }> = {
                    easy: { class: 'badge--success', text: 'Легкий' },
                    medium: { class: 'badge--warning', text: 'Средний' },
                    hard: { class: 'badge--danger', text: 'Сложный' }
                };
                const config = difficultyConfig[value] || { class: 'badge--default', text: value };
                return <span className={clsx(styles.badge, config.class)}>{config.text}</span>;
            }
        }
    ];

    return (
        <div className={styles.add_questions_modal_overlay} onClick={onClose}>
            <div className={styles.add_questions_modal} onClick={e => e.stopPropagation()}>
                <div className={styles.add_questions_modal__header}>
                    <h2 className={styles.add_questions_modal__title}>Добавить вопросы в тренажер</h2>
                    <button className={styles.add_questions_modal__close} onClick={onClose}>
                        <i className={clsx(styles.fas, styles.fa_times)}></i>
                    </button>
                </div>

                <div className={styles.add_questions_modal__content}>
                    <div className={styles.add_questions_modal__filters}>
                        <div className={styles.add_questions_modal__filter_group}>
                            <label>Поиск:</label>
                            <input
                                type="text"
                                className={styles.add_questions_modal__input}
                                placeholder="Поиск по тексту вопроса..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange({ search: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className={styles.add_questions_modal__selected_info}>
                        Выбрано вопросов: <strong>{selectedCount}</strong>
                    </div>

                    <UniversalTable
                        data={availableQuestions}
                        columns={questionColumns}
                        loading={loading}
                        emptyMessage="Вопросы не найдены"
                        onRowClick={handleRowClick}
                        selectable={true}
                    />

                    {pagination.totalPages > 1 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            loading={loading}
                        />
                    )}
                </div>

                <div className={styles.add_questions_modal__actions}>
                    <button
                        className={clsx(styles.btn, styles['btn--secondary'])}
                        onClick={onClose}
                        disabled={adding}
                    >
                        Отмена
                    </button>
                    <button
                        className={clsx(styles.btn, styles['btn--primary'])}
                        onClick={handleAddSelectedQuestions}
                        disabled={adding || selectedCount === 0}
                    >
                        {adding ? 'Добавление...' : `Добавить выбранные (${selectedCount})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionsModal;