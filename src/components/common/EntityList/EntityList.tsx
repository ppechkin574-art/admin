import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import SearchPanel from '@/components/common/SearchPanel';
import EntityActions from '@/components/common/EntityActions';
import EntityCard from '@/components/common/EntityCard';
import Pagination from '@/components/common/Pagination';
import { useSearch } from '@/hooks/useSearch';
import styles from './EntityList.module.scss';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export interface EntityListProps
{
    entityType: 'subject' | 'topic' | 'trainer' | 'ent' | 'subjectCombination';
    data: any[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    searchFields?: string[];
    searchPlaceholder?: string;
    onCreate?: () => void;
    onImport?: () => void;
    onRefresh?: () => void;
    onBulkDelete?: () => void;
    onEdit?: (entity: any) => void;
    onDelete?: (entity: any) => Promise<void>;
    onEntityClick?: (entity: any) => void;
    enablePagination?: boolean;
    initialPageSize?: number;
    entityName?: string;
    entityDescription?: string;
    createLink?: string;
    importLink?: string;
    backLink?: string;
    backText?: string;
    showCardActions?: boolean;
    customHeaderActions?: React.ReactNode;
    customContentBefore?: React.ReactNode;
    customContentAfter?: React.ReactNode;
    autoRefresh?: boolean;
}

export const EntityList: React.FC<EntityListProps> = ({
    entityType,
    data,
    loading,
    error,
    onRetry,
    searchFields = ['name', 'description'],
    searchPlaceholder,
    onCreate,
    onImport,
    onRefresh,
    onBulkDelete,
    onEdit,
    onDelete,
    onEntityClick,
    enablePagination = true,
    initialPageSize = 12,
    entityName,
    entityDescription,
    createLink,
    importLink,
    backLink,
    backText,
    showCardActions = true,
    customHeaderActions,
    customContentBefore,
    customContentAfter,
    autoRefresh = true
}) =>
{
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
    const [refreshing, setRefreshing] = useState(false);

    const { searchTerm, setSearchTerm, filteredItems, clearSearch } = useSearch(data, searchFields);

    useEffect(() =>
    {
        if (autoRefresh && data.length === 0 && !loading) onRetry();
    }, [data.length, loading, autoRefresh, onRetry]);

    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = enablePagination ? filteredItems.slice(startIndex, startIndex + pageSize) : filteredItems;

    const handlePageChange = (page: number) =>
    {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageSizeChange = (newSize: number) =>
    {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const paginationInfo = {
        currentPage,
        totalPages,
        totalItems,
        pageSize
    };

    const handleRefresh = async () =>
    {
        if (!onRefresh) return;

        setRefreshing(true);
        try
        {
            await onRefresh();
            toast.success('Данные успешно обновлены');
        }
        catch (error: any)
        {
            toast.error(error.message || 'Ошибка при обновлении данных');
        }
        finally
        {
            setRefreshing(false);
        }
    };

    const handleEdit = onEdit || ((entity: any) =>
    {
        navigate(`/${entityType}s/${entity.id}/edit`);
    });

    const handleDelete = async (entity: any) =>
    {
        const shouldDelete = await confirm({
            title: `Удаление ${getEntityName(entityType)}`,
            message: `Вы уверены, что хотите удалить "${entity.name}"? Это действие нельзя отменить.`,
            type: 'danger',
            confirmText: 'Удалить',
            cancelText: 'Отмена'
        });

        if (!shouldDelete) return;

        setDeletingIds(prev => new Set(prev).add(entity.id));

        try
        {
            if (onDelete)
            {
                await onDelete(entity);
                // showSuccess(`${getEntityDisplayName(entityType)} "${entity.name}" успешно удален`);
                await onRetry(); // Обновляем данные после удаления
            }
        }
        catch (error: any)
        {
            console.error(`Error deleting ${entityType}:`, error);
            toast.error(error.message || 'Ошибка при удалении');
        }
        finally
        {
            setDeletingIds(prev =>
            {
                const newSet = new Set(prev);
                newSet.delete(entity.id);
                return newSet;
            });
        }
    };

    const handleCardClick = onEntityClick || ((entity: any) =>
    {
        navigate(`/${entityType}s/${entity.id}`);
    });

    const getEntityName = (type: string) =>
    {
        const names = {
            subject: 'предмет',
            topic: 'тему',
            trainer: 'тренажер',
            ent: 'ЕНТ вариант',
            subjectCombination: 'связку предметов'
        };
        return names[type as keyof typeof names] || 'элемент';
    };

    const getEntityDisplayName = (type: string) =>
    {
        const names = {
            subject: 'Предмет',
            topic: 'Тема',
            trainer: 'Тренажер',
            ent: 'ЕНТ вариант',
            subjectCombination: 'Связка предметов'
        };
        return names[type as keyof typeof names] || 'Элемент';
    };

    const entityConfig = {
        subject: {
            name: entityName || 'Предметы',
            description: entityDescription || 'Все предметы в приложении',
            icon: 'fas fa-book',
            createText: 'Создать предмет',
            backText: backText || 'К вопросам предметов'
        },
        topic: {
            name: entityName || 'Темы',
            description: entityDescription || 'Все темы в приложении',
            icon: 'fas fa-folder',
            createText: 'Создать тему',
            backText: backText || 'К вопросам тем'
        },
        trainer: {
            name: entityName || 'Тренажеры',
            description: entityDescription || 'Все тренажеры в приложении',
            icon: 'fas fa-dumbbell',
            createText: 'Создать тренажер',
            backText: backText || 'К вопросам тренажеров'
        },
        ent: {
            name: entityName || 'Варианты ЕНТ',
            description: entityDescription || 'Все варианты ЕНТ в приложении',
            icon: 'fas fa-file-alt',
            createText: 'Создать вариант',
            backText: backText || 'К вопросам ЕНТ'
        },
        subjectCombination: {
            name: entityName || 'Связки предметов',
            description: entityDescription || 'Все связки предметов в приложении',
            icon: 'fas fa-link',
            createText: 'Создать связку',
            backText: backText || 'К списку связок'
        }
    };

    const config = entityConfig[entityType];

    if (loading) return <LoadingState message={`Загрузка ${config.name.toLowerCase()}...`} />;
    if (error) return <ErrorState message={error} onRetry={onRetry} />;

    return (
        <div className={clsx(styles.entity_list, styles[`entity_list__${entityType}`])}>
            <EntityActions
                entityName={config.name}
                entityDescription={config.description}
                loading={loading}
                onCreate={onCreate}
                onImport={onImport}
                onRefresh={handleRefresh}
                onBulkDelete={onBulkDelete}
                createLink={createLink}
                importLink={importLink}
                additionalButtons={
                    <>
                        {backLink && (
                            <Link to={backLink} className={clsx(styles.entity_actions__btn, styles.entity_actions__btn__secondary)}>
                                <i className='fas fa-arrow-left'></i>
                                {config.backText}
                            </Link>
                        )}
                        {customHeaderActions}
                    </>
                }
            />

            {customContentBefore}

            <div className={styles.entity_list__controls}>
                <SearchPanel
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onClear={clearSearch}
                    placeholder={searchPlaceholder || `Поиск ${config.name.toLowerCase()}...`}
                    resultsCount={filteredItems.length}
                    totalCount={data.length}
                />
                {enablePagination && (
                    <div className={styles.page_size_selector}>
                        <label htmlFor="page-size-select">Элементов на странице: </label>
                        <select
                            id="page-size-select"
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className={styles.page_size_select}
                            disabled={loading}
                        >
                            <option value={12}>12</option>
                            <option value={24}>24</option>
                            <option value={48}>48</option>
                            <option value={96}>96</option>
                        </select>
                    </div>
                )}
            </div>

            {data.length === 0 ? (
                <EmptyState
                    title={`${config.name} не найдены`}
                    description="Начните с добавления первого элемента в систему"
                    action={
                        (onCreate || createLink) ? {
                            text: config.createText,
                            onClick: onCreate,
                            link: createLink
                        } : undefined
                    }
                />
            ) : filteredItems.length === 0 ? (
                <EmptyState
                    title={`${config.name} не найдены`}
                    description="Попробуйте изменить поисковый запрос"
                />
            ) : (
                <>
                    <div className={styles.entity_list__grid}>
                        {paginatedItems.map((item) => (
                            <EntityCard
                                key={item.id}
                                entity={item}
                                entityType={entityType}
                                onClick={handleCardClick}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                showActions={showCardActions}
                                isDeleting={deletingIds.has(item.id)}
                            />
                        ))}
                    </div>

                    {customContentAfter}

                    {enablePagination && totalPages > 1 && (
                        <div className={styles.entity_list__pagination}>
                            <Pagination
                                pagination={paginationInfo}
                                onPageChange={handlePageChange}
                                loading={loading}
                                itemsCount={paginatedItems.length}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};