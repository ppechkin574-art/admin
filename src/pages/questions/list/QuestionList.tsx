import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuestionList } from '@/hooks/useQuestionList'
import { useQuestionTable } from '@/hooks/useQuestionTable'
import { filterService, questionService } from '@/services/api'
import { useEntStore } from '@/stores/entStore'
import { useSubjectStore } from '@/stores/subjectStore'
import { useTopicStore } from '@/stores/topicStore'
import { useTrainerStore } from '@/stores/trainerStore'
import { FilterOption, FilterOptionGroup, ImportResult, Topic } from '@/types'
import toast from 'react-hot-toast'
import
{
    Plus,
    RefreshCw,
    Upload,
    Trash2,
    FileText,
    BookOpen,
    Folder,
    Tag,
} from 'lucide-react'

import QuestionModal from '@/pages/questions/modal'
import ImportModal from '@/pages/questions/import'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

const difficultyOptions: FilterOption[] = [
    { value: 'easy', label: 'Легкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'hard', label: 'Сложный' },
]

const typeOptions: FilterOption[] = [
    { value: 'single_choice', label: 'Одиночный выбор' },
    { value: 'multiple_choice', label: 'Множественный выбор' },
]

export const QuestionList: React.FC = () =>
{
    const {
        questions,
        loading,
        pagination,
        filters,
        selectedQuestions,
        showModal,
        showImportModal,
        editingQuestion,
        pageSize,
        handleRefreshData,
        handleFilterChange,
        handleSubjectFilterChange,
        handleResetFilters,
        handlePageChange,
        handlePageSizeChange,
        handleDelete,
        handleBulkDelete,
        handleCreate,
        handleEdit,
        handleView,
        handleModalSubmit,
        handleModalClose,
        handleSelectRow,
        handleSelectAll,
        setShowImportModal,
    } = useQuestionList()

    const { subjects, fetchSubjectsDetailed } = useSubjectStore()
    const { topics: allTopics, fetchTopicsDetailed } = useTopicStore()
    const { fetchTrainers } = useTrainerStore()
    const { fetchEntOptions } = useEntStore()
    const [importLoading, setImportLoading] = useState(false)
    const [filtersOpen, setFiltersOpen] = useState(true)

    useEffect(() =>
    {
        fetchSubjectsDetailed()
        fetchTopicsDetailed()
        fetchTrainers()
        fetchEntOptions()
    }, [fetchSubjectsDetailed, fetchTopicsDetailed, fetchTrainers, fetchEntOptions])

    const compatibleTopics = allTopics as unknown as Topic[]

    const { questionColumns } = useQuestionTable({
        topics: compatibleTopics,
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete
    })

    const subjectOptions: FilterOption[] = useMemo(() =>
        subjects.map((subject) => ({
            value: subject.id.toString(),
            label: subject.name,
        })),
        [subjects]
    )

    const filteredTopicGroups: FilterOptionGroup[] = useMemo(() =>
    {
        if (!filters.subject_ids || filters.subject_ids.length === 0) return []

        const filteredTopics = compatibleTopics.filter(topic =>
            filters.subject_ids.includes(topic.subject_id?.toString())
        )

        const topicsBySubject = filteredTopics.reduce((acc, topic) =>
        {
            const subject = subjects.find(s => s.id === topic.subject_id)
            const subjectName = subject?.name || `Предмет ${topic.subject_id}`

            if (!acc[subjectName]) acc[subjectName] = []

            acc[subjectName].push({
                value: topic.id.toString(),
                label: topic.name,
            })

            return acc
        }, {} as Record<string, FilterOption[]>)

        return Object.entries(topicsBySubject).map(([label, options]) => ({
            label,
            options
        }))
    }, [filters.subject_ids, compatibleTopics, subjects])

    const filterDisplayText = useMemo(() =>
        filterService.getFilterDisplayText(
            filters,
            subjects,
            compatibleTopics,
            difficultyOptions,
            typeOptions
        ),
        [filters, subjects, compatibleTopics]
    )

    const filterConfig = useMemo(() => ({
        search: {
            placeholder: 'Введите текст вопроса для поиска...',
        },
        selects: [
            {
                key: 'difficulty',
                label: 'Сложность',
                icon: Tag,
                options: difficultyOptions,
                multiple: true,
            },
            {
                key: 'type',
                label: 'Тип вопроса',
                icon: FileText,
                options: typeOptions,
                multiple: true,
            },
            {
                key: 'subject_ids',
                label: 'Предметы',
                icon: BookOpen,
                options: subjectOptions,
                multiple: true,
            },
            {
                key: 'topic_ids',
                label: 'Темы',
                icon: Folder,
                options: filteredTopicGroups,
                multiple: true,
                disabled: !filters.subject_ids || filters.subject_ids.length === 0,
            },
        ],
    }), [subjectOptions, filteredTopicGroups, filters.subject_ids])

    const handleFilterChangeAdapter = useCallback((key: string, value: any) =>
    {
        if (key === 'subject_ids')
        {
            handleSubjectFilterChange(value)
            handleFilterChange({ topic_ids: [] })
        } else handleFilterChange({ [key]: value })
    }, [handleSubjectFilterChange, handleFilterChange])

    const handleImport = useCallback(async (file: File, importType: string): Promise<ImportResult> =>
    {
        setImportLoading(true)
        try
        {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('import_type', importType)

            const response = await questionService.import(formData)

            if (response.success)
                handleRefreshData()

            return response
        } catch (error: any)
        {
            let errorMessage = 'Ошибка при импорте'

            if (error.response?.data?.detail)
                errorMessage = error.response.data.detail
            else if (error.response?.data?.message)
                errorMessage = error.response.data.message
            else if (error.message)
                errorMessage = error.message

            toast.error(errorMessage)

            return {
                detected_questions: 0,
                imported_questions_count: 0,
                duplicate_questions_count: 0,
                success: false,
                errors_count: 1,
                errors: [errorMessage],
                message: errorMessage,
                trainers_updated: 0,
                ent_options_created: 0,
                duplicate_ent_options: 0,
                skipped_questions_in_ent: 0
            }
        } finally
        {
            setImportLoading(false)
        }
    }, [handleRefreshData])

    const tableColumns = useMemo(() => questionColumns.map(col => ({
        ...col,
        header: col.title,
        accessor: col.key,
        width: col.width,
        render: col.render
    })), [questionColumns])

    const activeFiltersCount = Object.keys(filters).reduce((count, key) =>
    {
        if (key === 'search') return filters.search?.trim() ? count + 1 : count
        return Array.isArray(filters[key]) && filters[key].length > 0 ? count + 1 : count
    }, 0)

    const tableActionsFixed = useMemo(() => ({
        view: (item: any) =>
        {
            handleView(item)
        },
        edit: (item: any) =>
        {
            handleEdit(item)
        },
        delete: (item: any) =>
        {
            handleDelete(item)
        }
    }), [handleView, handleEdit, handleDelete])

    return (
        <ListContainer>
            <ListHeader
                title="Вопросы"
                filterDisplayText={filterDisplayText}
                actionButtons={[
                    {
                        label: 'Создать вопрос',
                        onClick: handleCreate,
                        icon: Plus,
                        variant: 'primary',
                        disabled: loading
                    },
                    {
                        label: 'Импорт',
                        onClick: () => setShowImportModal(true),
                        icon: Upload,
                        variant: 'secondary',
                        disabled: loading
                    }
                ]}
            >
                {selectedQuestions.length > 0 && (
                    <Button
                        variant="danger"
                        onClick={handleBulkDelete}
                        disabled={loading}
                        icon={<Trash2 className="h-4 w-4" />}
                    >
                        Удалить выбранные ({selectedQuestions.length})
                    </Button>
                )}
                <Button
                    variant="secondary"
                    onClick={handleRefreshData}
                    disabled={loading}
                    icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                    {loading ? 'Загрузка...' : 'Обновить'}
                </Button>
            </ListHeader>

            <SimpleFilter
                title="Фильтры вопросов"
                filters={filters}
                filterConfig={filterConfig}
                onFilterChange={handleFilterChangeAdapter}
                onResetFilters={handleResetFilters}
                isOpen={filtersOpen}
                onToggle={() => setFiltersOpen(!filtersOpen)}
                loading={loading}
                activeFiltersCount={activeFiltersCount}
            />

            <ListTable
                data={questions}
                columns={tableColumns}
                loading={loading}
                emptyMessage="Вопросы не найдены"
                selectable={true}
                selectedRows={selectedQuestions}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                actions={tableActionsFixed}
                currentPage={pagination?.currentPage || 1}
                totalPages={pagination?.totalPages || 1}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalRecords={pagination?.totalRecords || 0}
                // showAdvancedPagination={true}
                loadingText="Загрузка вопросов..."
            />

            {showModal && (
                <QuestionModal
                    question={editingQuestion}
                    onSubmit={handleModalSubmit}
                    onClose={handleModalClose}
                    isOpen={showModal}
                />
            )}

            {showImportModal && (
                <ImportModal
                    onImport={handleImport}
                    onClose={() => setShowImportModal(false)}
                    loading={importLoading}
                    isOpen={showImportModal}
                />
            )}
        </ListContainer>
    )
}