import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UniversalTable from '@/components/common/UniversalTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import Filter from '@/components/common/Filter';
import { PaginationInfo } from '@/types';
import styles from './EntityDetail.module.scss';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export interface EntityDetailProps
{
    entityType: 'subject' | 'topic' | 'trainer' | 'ent' | 'subjectCombination';
    entity: any;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onEdit: (entity: any) => void;
    onDelete: (entity: any) => void;

    questions?: any[];
    questionsLoading?: boolean;
    questionsError?: string | null;
    filters?: Record<string, any>;
    pagination?: PaginationInfo;
    onFilterChange?: (key: string, value: any) => void;
    onResetFilters?: () => void;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;

    questionActions?: {
        view?: (question: any) => void;
        edit?: (question: any) => void;
        delete?: (question: any) => void;
    };

    additionalSections?: {
        key: string;
        title: string;
        content: React.ReactNode;
    }[];

    config: {
        icon: string;
        color: string;
        title: string;
        stats: Array<{
            key: string;
            label: string;
            value: number | string;
            icon: string;
        }>;
        fields: Array<{
            label: string;
            value: any;
            icon: string;
        }>;
        questionColumns?: any[];
        filterConfig?: any;
    };
}

export const EntityDetail: React.FC<EntityDetailProps> = ({
    entityType,
    entity,
    loading,
    error,
    onRetry,
    onEdit,
    onDelete,
    questions = [],
    questionsLoading = false,
    questionsError = null,
    filters = {},
    pagination,
    onFilterChange = () => { },
    onResetFilters = () => { },
    onPageChange,
    onPageSizeChange,
    questionActions,
    additionalSections = [],
    config
}) =>
{
    const navigate = useNavigate();

    const handleDeleteWithConfirm = async () =>
    {
        if (!entity) return;

        const shouldDelete = await confirm({
            title: `Удаление ${config.title.toLowerCase()}`,
            message: `Вы уверены, что хотите удалить ${config.title.toLowerCase()} "${entity.name}"? Это действие нельзя отменить.`,
            type: 'danger',
            confirmText: 'Удалить',
            cancelText: 'Отмена'
        });

        if (shouldDelete) onDelete(entity);
    };

    const filterDisplayText = Object.keys(filters).length > 0 ?
        JSON.stringify(filters) : '';

    const hasActiveFilters = Object.keys(filters).some(key =>
        Array.isArray(filters[key]) ? filters[key].length > 0 :
            filters[key] !== undefined && filters[key] !== '' && filters[key] !== null
    );

    const tableActions = useMemo(() =>
    {
        if (!questionActions) return undefined;

        const actions: any = {};

        if (questionActions.view)
            actions.view = {
                handler: questionActions.view,
                className: 'view',
                icon: 'fas fa-eye'
            };

        if (questionActions.edit)
            actions.edit = {
                handler: questionActions.edit,
                className: 'edit',
                icon: 'fas fa-edit'
            };

        if (questionActions.delete)
            actions.delete = {
                handler: questionActions.delete,
                className: 'delete',
                icon: 'fas fa-trash'
            };

        return Object.keys(actions).length > 0 ? actions : undefined;
    }, [questionActions]);

    const universalTableProps = {
        data: questions,
        columns: config.questionColumns || [],
        actions: tableActions,
        loading: questionsLoading,
        emptyMessage: "Вопросы не найдены",
        ...(pagination && onPageChange && {
            pagination,
            onPageChange,
            pageSize: pagination.pageSize,
            onPageSizeChange,
            resultsInfoProps: {
                loading: questionsLoading,
                itemsCount: questions.length,
                totalItems: pagination.totalItems,
                filterText: filterDisplayText,
                hasActiveFilters,
                onResetFilters,
                entityName: "вопросов"
            }
        })
    };

    if (loading)
        return (
            <div className={clsx(styles.entity_detail, styles.entity_detail__loading)}>
                <LoadingSpinner />
                <p>Загрузка данных...</p>
            </div>
        );

    if (error || !entity)
        return (
            <div className={styles.entity_detail}>
                <ErrorState
                    message={error || `${config.title} не найден`}
                    onRetry={onRetry}
                />
            </div>
        );

    return (
        <div className={clsx(styles.entity_detail, styles[`entity_detail__${entityType}`])}>
            <div className={styles.entity_detail__header}>
                <div className={styles.entity_detail__title_section}>
                    <div
                        className={styles.entity_detail__icon}
                        style={{ background: config.color }}
                    >
                        <i className={config.icon}></i>
                    </div>
                    <div className={styles.entity_detail__title_content}>
                        <h1 className={styles.entity_detail__title}>{entity.name}</h1>
                        <p className={styles.entity_detail__subtitle}>{config.title}</p>
                        {entity.description && (
                            <p className={styles.entity_detail__description}>
                                {entity.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className={styles.entity_detail__actions}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate(-1)}
                        type="button"
                    >
                        <i className="fas fa-arrow-left"></i>
                        Назад
                    </button>
                    {additionalSections.map(section => (
                        <div key={section.key} className={styles.entity_detail__section}>
                            {section.content}
                        </div>
                    ))}
                    <button
                        className="btn btn-primary"
                        onClick={() => onEdit(entity)}
                        type="button"
                    >
                        <i className="fas fa-edit"></i>
                        Редактировать
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={handleDeleteWithConfirm}
                        type="button"
                    >
                        <i className="fas fa-trash"></i>
                        Удалить
                    </button>
                </div>
            </div>

            {config.stats.length > 0 && (
                <div className={styles.entity_detail__stats}>
                    {config.stats.map(stat => (
                        <div key={stat.key} className={styles.stat_card}>
                            <div
                                className={styles.stat_card__icon}
                                style={{ background: config.color }}
                            >
                                <i className={stat.icon}></i>
                            </div>
                            <div className={styles.stat_card__content}>
                                <div className={styles.stat_card__value}>{stat.value}</div>
                                <div className={styles.stat_card__label}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {config.fields.length > 0 && (
                <div className={styles.entity_detail__info}>
                    <h3>Основная информация</h3>
                    <div className={styles.entity_detail__fields}>
                        {config.fields.map((field, index) => (
                            <div key={index} className={styles.entity_detail__field}>
                                <i className={field.icon}></i>
                                <div className={styles.entity_detail__field_content}>
                                    <label>{field.label}</label>
                                    <span>{field.value || '-'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}



            {config.questionColumns && (
                <div className={styles.entity_detail__section}>
                    <div className={styles.entity_detail__section_header}>
                        <h3>Вопросы ({pagination?.totalItems || questions.length})</h3>
                    </div>

                    {questionsError && (
                        <div className="alert alert-danger">
                            Ошибка загрузки вопросов: {questionsError}
                        </div>
                    )}

                    {config.filterConfig && (
                        <Filter
                            title="Фильтры вопросов"
                            filters={filters}
                            filterConfig={config.filterConfig}
                            onFilterChange={onFilterChange}
                            onResetFilters={onResetFilters}
                            entityName="вопросам"
                        />
                    )}

                    <UniversalTable {...universalTableProps} />
                </div>
            )}
        </div>
    );
};