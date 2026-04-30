import React, { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileText, BookOpen, Hash } from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import { useEntStore } from '@/stores/entStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import ConfirmModal from '@/components/common/ConfirmModal'
import SimpleFilter from '@/components/common/SimpleFilter'
import { ListTable } from '@/components/lists/ListTable'
import { DetailHeader } from '@/components/details/DetailHeader'
import { DetailStats } from '@/components/details/DetailStats'
import { DetailContent } from '@/components/details/DetailContent'
import { useEntityQuestions } from '@/hooks/useEntityQuestions'
import { useResourceFilters } from '@/hooks/useResourceFilters'
import Button from '@/components/common/Button'
import { useDashboardStore } from '@/stores/dashboardStore'

export const EntDetail: React.FC = () =>
{
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const entId = Number(id)

    const { getTopics } = useDashboardStore()
    const topics = getTopics()

    const {
        isLoading: storeLoading,
        error: storeError,
        getEntOptionById,
        getSubjectById,
        refreshDashboard
    } = useStoreData()

    const { deleteEntOption } = useEntStore()
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

    const ent = getEntOptionById(entId)
    const subject = ent ? getSubjectById(ent.subject_id) : null

    const {
        questions,
        loading: questionsLoading,
        refreshQuestions
    } = useEntityQuestions({
        entityId: entId,
        entityType: 'ent'
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

    const getTopicName = (topicId?: number) =>
    {
        if (!topicId) return '—'
        const topic = topics.find(t => t.id === topicId)
        return topic?.name || '—'
    }

    const handleEdit = useCallback(() =>
    {
        navigate(`/ents/${entId}/edit`)
    }, [navigate, entId])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!ent) return

        try
        {
            await deleteEntOption(ent.id)
            toast.success(`Вариант ЕНТ #${ent.option_number} успешно удален`)
            navigate('/ents')
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении варианта ЕНТ')
        }
    }, [ent, deleteEntOption, navigate])

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
        {
            header: 'Тема',
            accessor: 'topic_id',
            width: '15%',
            render: (value: number) => (
                <span className="text-gray-600">{getTopicName(value)}</span>
            )
        },
        {
            header: 'Действия',
            accessor: 'id',
            width: '10%',
            render: (value: number) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/questions/${value}`)}
                >
                    Просмотр
                </Button>
            )
        }
    ]

    const isLoading = storeLoading || questionsLoading

    if (isLoading && !ent)
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner message="Загрузка варианта ЕНТ..." />
            </div>
        )

    if (storeError || !ent)
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <ErrorState
                    message={storeError || "Вариант ЕНТ не найден"}
                    onRetry={handleRefresh}
                    actionText="Попробовать снова"
                />
            </div>
        )

    return (
        <DetailContent>
            <DetailHeader
                title={`Вариант ЕНТ #${ent.option_number}`}
                badges={[
                    ...(subject ? [{ text: subject.name, type: 'primary' }] : []),
                    { text: `ID: #${ent.id}`, type: 'secondary' }
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
                        label: "Предмет",
                        value: subject?.name || '—',
                        icon: BookOpen,
                        onClick: subject ? () => navigate(`/subjects/${subject.id}`) : undefined
                    },
                    {
                        label: "Номер варианта",
                        value: `#${ent.option_number}`,
                        icon: Hash
                    }
                ]}
                loading={isLoading}
            />

            <div className="grid gap-6">
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">Вопросы варианта ЕНТ</h3>
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

                    <ListTable
                        data={paginatedQuestions}
                        columns={columns}
                        loading={isLoading}
                        emptyMessage="Вопросы не найдены"
                        selectable={false}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        totalRecords={totalRecords}
                    />
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Удаление варианта ЕНТ"
                message={`Вы уверены, что хотите удалить вариант ЕНТ #${ent?.option_number || '...'}? Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                type="danger"
            />
        </DetailContent>
    )
}