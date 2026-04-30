import React, { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, FileText, Tag, Calendar, Clock, Hash, Plus, AlertCircle } from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import { useTrainerStore } from '@/stores/trainerStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import ConfirmModal from '@/components/common/ConfirmModal'
import SimpleFilter from '@/components/common/SimpleFilter'
import { ListTable } from '@/components/lists/ListTable'
import { DetailHeader } from '@/components/details/DetailHeader'
import { DetailStats } from '@/components/details/DetailStats'
import { DetailInfoCard } from '@/components/details/DetailInfoCard'
import { DetailActions } from '@/components/details/DetailActions'
import { DetailContent } from '@/components/details/DetailContent'
import { useEntityQuestions } from '@/hooks/useEntityQuestions'
import { useResourceFilters } from '@/hooks/useResourceFilters'
import Button from '@/components/common/Button'

export const TrainerDetail: React.FC = () =>
{
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const trainerId = Number(id)

    const {
        isLoading: storeLoading,
        error: storeError,
        getTrainerById,
        refreshDashboard
    } = useStoreData()

    const { deleteTrainer } = useTrainerStore()
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

    const trainer = getTrainerById(trainerId)

    const {
        questions,
        loading: questionsLoading,
        refreshQuestions
    } = useEntityQuestions({
        entityId: trainerId,
        entityType: 'trainer'
    })

    const {
        filters,
        currentPage,
        pageSize,
        paginatedData: paginatedQuestions,
        totalRecords,
        totalPages,
        activeFiltersCount,
        handleFilterChange,
        handleResetFilters,
        handlePageChange,
        handlePageSizeChange
    } = useResourceFilters({
        initialFilters: {
            search: '',
            difficulty: [],
            type: []
        },
        data: questions,
        filterFn: (question, filters) =>
        {
            if (filters.search)
            {
                const searchLower = filters.search.toLowerCase()
                const hasText = question.blocks?.some(
                    (block: any) => block.type === 'text' && block.value?.toLowerCase().includes(searchLower)
                )
                if (!hasText && !question.id.toString().includes(searchLower))
                    return false
            }

            if (filters.difficulty?.length > 0)
                if (!filters.difficulty.includes(question.difficulty))
                    return false

            if (filters.type?.length > 0)
            {
                const questionType = question.type || question.question_type
                if (!filters.type.includes(questionType))
                    return false
            }

            return true
        }
    })

    const handleEdit = useCallback(() =>
    {
        navigate(`/trainers/${trainerId}/edit`)
    }, [navigate, trainerId])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!trainer) return

        try
        {
            await deleteTrainer(trainer.id)
            toast.success(`Тренажер "${trainer.name}" успешно удален`)
            navigate('/trainers')
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении тренажера')
        }
    }, [trainer, deleteTrainer, navigate])

    const handleRefresh = useCallback(() =>
    {
        refreshDashboard()
        refreshQuestions()
        toast.success('Данные обновлены')
    }, [refreshDashboard, refreshQuestions])

    const typeOptions = [
        { value: 'single_choice', label: 'Одиночный выбор' },
        { value: 'multiple_choice', label: 'Множественный выбор' }
    ]

    const difficultyOptions = [
        { value: 'easy', label: 'Легкий' },
        { value: 'medium', label: 'Средний' },
        { value: 'hard', label: 'Сложный' }
    ]

    const filterConfig = {
        search: {
            placeholder: 'Поиск по вопросам...'
        },
        selects: [
            {
                key: 'difficulty',
                label: 'Сложность',
                icon: Hash,
                options: difficultyOptions,
                multiple: true
            },
            {
                key: 'type',
                label: 'Тип вопроса',
                icon: FileText,
                options: typeOptions,
                multiple: true
            }
        ]
    }

    const columns = [
        {
            header: 'ID',
            accessor: 'id',
            width: '10%',
            render: (value: number) => `#${value}`
        },
        {
            header: 'Содержание',
            accessor: 'blocks',
            width: '50%',
            render: (value: any[]) =>
            {
                const textBlock = value?.find(block => block.type === 'text')
                return (
                    <span className="text-gray-800 truncate max-w-xs block">
                        {textBlock?.value || 'Без текста'}
                    </span>
                )
            }
        },
        {
            header: 'Тип',
            accessor: 'type',
            width: '15%',
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'single_choice'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                    }`}>
                    {value === 'single_choice' ? 'Одиночный' : 'Множественный'}
                </span>
            )
        },
        {
            header: 'Сложность',
            accessor: 'difficulty',
            width: '15%',
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'easy'
                    ? 'bg-green-100 text-green-800'
                    : value === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                    {value === 'easy' ? 'Легкий' :
                        value === 'medium' ? 'Средний' : 'Сложный'
                    }
                </span>
            )
        },
        // {
        //     header: 'Действия',
        //     accessor: 'id',
        //     width: '10%',
        //     render: (value: number) => (
        //         <Button
        //             variant="ghost"
        //             size="sm"
        //             onClick={() => navigate(`/questions/${value}`)}
        //         >
        //             Просмотр
        //         </Button>
        //     )
        // }
    ]

    const isLoading = storeLoading || questionsLoading

    if (isLoading && !trainer)
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner message="Загрузка тренажера..." />
            </div>
        )

    if (storeError || !trainer)
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <ErrorState
                    message={storeError || "Тренажер не найден"}
                    onRetry={handleRefresh}
                    actionText="Попробовать снова"
                />
            </div>
        )

    return (
        <DetailContent>
            <DetailHeader
                title={trainer.name}
                badges={[
                    ...(trainer.tags?.map((tag, index) => ({ text: tag, type: 'primary' as const })) || []),
                    { text: `ID: #${trainer.id}`, type: 'secondary' }
                ]}
                onBack={() => navigate(-1)}
                onEdit={handleEdit}
                onDelete={() => setDeleteConfirmOpen(true)}
                onRefresh={handleRefresh}
                showRefresh={true}
                loading={isLoading}
            />

            <DetailStats
                stats={[
                    {
                        label: "Вопросов",
                        value: questions.length,
                        icon: FileText
                    },
                    {
                        label: "ID тренажера",
                        value: `#${trainer.id}`,
                        icon: Hash
                    }
                ]}
                loading={isLoading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Левая колонка */}
                {/* <div className="lg:col-span-1 space-y-6">
                    <DetailInfoCard
                        title="Общая информация"
                        icon={Users}
                        items={[
                            {
                                label: "ID тренажера",
                                value: `#${trainer.id}`,
                                icon: Hash
                            },
                            {
                                label: "Дата создания",
                                value: trainer.created_at ? new Date(trainer.created_at).toLocaleDateString('ru-RU') : '—',
                                icon: Calendar
                            },
                            {
                                label: "Последнее обновление",
                                value: trainer.updated_at ? new Date(trainer.updated_at).toLocaleDateString('ru-RU') : '—',
                                icon: Clock
                            }
                        ]}
                    />

                    <DetailInfoCard
                        title="Статистика"
                        icon={Hash}
                        items={[
                            {
                                label: "Вопросов",
                                value: questions.length,
                                icon: FileText
                            }
                        ]}
                    />

                    {trainer.description && (
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <Users className="h-5 w-5 text-gray-400" />
                                    <h3 className="text-lg font-medium text-gray-900">Описание</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-700 whitespace-pre-line">
                                    {trainer.description}
                                </p>
                            </div>
                        </div>
                    )}

                    {trainer.tags && trainer.tags.length > 0 && (
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <Tag className="h-5 w-5 text-gray-400" />
                                    <h3 className="text-lg font-medium text-gray-900">Теги</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-wrap gap-2">
                                    {trainer.tags.map((tag, index) => (
                                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <DetailActions
                        title="Быстрые действия"
                        actions={[
                            {
                                label: 'Создать вопрос',
                                onClick: () => navigate(`/questions/create`),
                                icon: Plus,
                                variant: 'outline'
                            },
                            {
                                label: 'Все вопросы',
                                onClick: () => navigate('/questions'),
                                icon: FileText,
                                variant: 'outline'
                            }
                        ]}
                        loading={isLoading}
                    />
                </div> */}

                {/* Правая колонка */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Фильтры */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">Вопросы тренажера</h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Всего: {questions.length}
                                </span>
                            </div>
                        </div>
                        <div className="p-6">
                            <SimpleFilter
                                title="Фильтры вопросов"
                                filters={filters}
                                filterConfig={filterConfig}
                                onFilterChange={handleFilterChange}
                                onResetFilters={handleResetFilters}
                                loading={isLoading}
                                activeFiltersCount={activeFiltersCount}
                            />
                        </div>
                    </div>

                    {/* Таблица вопросов */}
                    <ListTable
                        data={paginatedQuestions}
                        columns={columns}
                        loading={isLoading}
                        emptyMessage="Вопросы не найдены"
                        selectable={false}
                        actions={{
                            view: (item: any) => navigate(`/questions/${item.id}`),
                            edit: (item: any) => navigate(`/questions/${item.id}/edit`)
                        }}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        totalRecords={totalRecords}
                    />

                    {/* Информация о фильтрах */}
                    {paginatedQuestions.length === 0 && questions.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                                <p className="text-sm text-yellow-700">
                                    Вопросы по заданным фильтрам не найдены. Попробуйте изменить условия поиска.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Удаление тренажера"
                message={`Вы уверены, что хотите удалить тренажер "${trainer.name}"? Все связанные вопросы будут отвязаны. Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                type="danger"
            />
        </DetailContent>
    )
}