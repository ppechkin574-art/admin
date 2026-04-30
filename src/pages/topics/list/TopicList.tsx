import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useTopicStore } from '@/stores/topicStore'
import { Topic } from '@/types'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Trash2, Folder, BookOpen, FileText } from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import { DeleteConfirmation } from '@/components/lists/DeleteConfirmation'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

interface TopicListProps
{
    context?: 'default' | 'trainer'
}

export const TopicList: React.FC<TopicListProps> = ({ context = 'default' }) =>
{
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { deleteTopic, loading: deleteLoading } = useTopicStore()
    const {
        getTopics,
        getSubjects,
        loading: dashboardLoading,
        error: dashboardError,
        refreshDashboard
    } = useDashboardStore()

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({
        search: '',
        subject_id: searchParams.get('subject_id') || ''
    })
    const [selectedTopics, setSelectedTopics] = useState<string[]>([])
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(true)

    const allTopics = useMemo(() =>
    {
        const topics = getTopics()
        const subjects = getSubjects()
        return topics.map(topic =>
        {
            const subject = subjects.find(s => s.id === topic.subject_id)
            return {
                ...topic,
                subject_name: subject?.name || '-',
                subject_type: subject?.type
            }
        })
    }, [getTopics, getSubjects])

    const loading = dashboardLoading || deleteLoading

    const filteredTopics = useMemo(() =>
    {
        let result = [...allTopics]
        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            result = result.filter(topic =>
                topic.name.toLowerCase().includes(searchLower) ||
                topic.subject_name.toLowerCase().includes(searchLower) ||
                topic.description?.toLowerCase().includes(searchLower)
            )
        }
        if (filters.subject_id)
            result = result.filter(topic => topic.subject_id?.toString() === filters.subject_id)
        return result
    }, [allTopics, filters])

    const totalRecords = filteredTopics.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedTopics = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredTopics.slice(start, start + pageSize)
    }, [filteredTopics, currentPage, pageSize])

    const subjectOptions = useMemo(() =>
    {
        return getSubjects().map(subject => ({
            value: subject.id.toString(),
            label: subject.name
        }))
    }, [getSubjects])

    useEffect(() =>
    {
        setCurrentPage(1)
    }, [filters])

    const handleRefreshData = useCallback(() =>
    {
        refreshDashboard()
        setSelectedTopics([])
    }, [refreshDashboard])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
        if (key === 'subject_id')
        {
            if (value)
                setSearchParams({ subject_id: value })
            else
                setSearchParams({})
        }
    }, [setSearchParams])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({ search: '', subject_id: '' })
        setSearchParams({})
        setCurrentPage(1)
    }, [setSearchParams])

    const handlePageChange = useCallback((page: number) =>
    {
        setCurrentPage(page)
    }, [])

    const handlePageSizeChange = useCallback((size: number) =>
    {
        setPageSize(size)
        setCurrentPage(1)
    }, [])

    const handleSelectRow = useCallback((id: string, checked: boolean) =>
    {
        setSelectedTopics(prev =>
            checked ? [...prev, id] : prev.filter(topicId => topicId !== id)
        )
    }, [])

    const handleSelectAll = useCallback((checked: boolean) =>
    {
        if (checked)
            setSelectedTopics(paginatedTopics.map(topic => topic.id.toString()))
        else
            setSelectedTopics([])
    }, [paginatedTopics])

    const handleCreate = useCallback(() =>
    {
        if (filters.subject_id)
            navigate(`/topics/create?subject_id=${filters.subject_id}`)
        else
            navigate('/topics/create')
    }, [navigate, filters.subject_id])

    const handleEdit = useCallback((topic: Topic) =>
    {
        navigate(`/topics/${topic.id}/edit`)
    }, [navigate])

    const handleView = useCallback((topic: Topic) =>
    {
        if (context === 'trainer')
            navigate(`/trainer-v2/topics/${topic.id}`)
        else
            navigate(`/topics/${topic.id}`)
    }, [navigate, context])

    const handleDeleteClick = useCallback((topic: Topic) =>
    {
        setTopicToDelete(topic)
        setDeleteConfirmOpen(true)
    }, [])

    const handleBulkDeleteClick = useCallback(() =>
    {
        if (selectedTopics.length === 0) return
        const topicNames = allTopics
            .filter(t => selectedTopics.includes(t.id.toString()))
            .map(t => t.name)
            .join(', ')
        setTopicToDelete({
            id: -1,
            name: topicNames,
            subject_id: 0,
            question_count: 0,
        } as Topic)
        setDeleteConfirmOpen(true)
    }, [selectedTopics, allTopics])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!topicToDelete) return
        try
        {
            if (topicToDelete.id === -1)
            {
                for (const topicId of selectedTopics)
                    await deleteTopic(parseInt(topicId))
                toast.success(`Удалено ${selectedTopics.length} тем`)
                setSelectedTopics([])
            } else
            {
                await deleteTopic(topicToDelete.id)
                toast.success(`Тема "${topicToDelete.name}" успешно удалена`)
            }
            await refreshDashboard()
            setDeleteConfirmOpen(false)
            setTopicToDelete(null)
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении темы')
        }
    }, [topicToDelete, selectedTopics, deleteTopic, refreshDashboard])

    const handleDeleteCancel = useCallback(() =>
    {
        setDeleteConfirmOpen(false)
        setTopicToDelete(null)
    }, [])

    const filterConfig = useMemo(() => ({
        search: { placeholder: 'Поиск по названию, предмету или описанию...' },
        selects: [
            {
                key: 'subject_id',
                label: 'Предмет',
                icon: BookOpen,
                options: subjectOptions,
                multiple: false,
                placeholder: 'Выберите предмет...'
            }
        ]
    }), [subjectOptions])

    const columns = useMemo(() => [
        {
            header: 'Название',
            accessor: 'name',
            width: '25%',
            render: (value: string, item: Topic & { subject_name: string }) => (
                <div className="flex flex-col">
                    <div className="flex items-center">
                        <Folder className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium text-gray-900">{value}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ID: {item.id}</div>
                </div>
            )
        },
        {
            header: 'Предмет',
            accessor: 'subject_name',
            width: '20%',
            render: (value: string, item: Topic & { subject_type?: string }) => (
                <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                    <div className="flex flex-col">
                        <span className="font-medium">{value}</span>
                        {item.subject_type && (
                            <span className="text-xs text-gray-500">
                                {item.subject_type === 'main' ? 'Основной' : 'Дополнительный'}
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Вопросы',
            accessor: 'question_count',
            width: '15%',
            render: (value: number) => (
                <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="font-medium">{value}</span>
                </div>
            )
        }
    ], [])

    const tableActions = useMemo(() => ({
        view: handleView,
        edit: handleEdit,
        delete: handleDeleteClick
    }), [handleView, handleEdit, handleDeleteClick])

    const activeFiltersCount = useMemo(() =>
    {
        let count = 0
        if (filters.search?.trim()) count++
        if (filters.subject_id) count++
        return count
    }, [filters])

    const pageTitle = context === 'trainer' ? 'Темы тренажёра' : 'Темы'

    const filterDisplayText = useMemo(() =>
    {
        const parts = []
        if (filters.search) parts.push(`поиск: "${filters.search}"`)
        if (filters.subject_id)
        {
            const subject = getSubjects().find(s => s.id.toString() === filters.subject_id)
            parts.push(`предмет: ${subject?.name}`)
        }
        return parts.length > 0 ? `Найдено ${totalRecords} тем (${parts.join(', ')})` : null
    }, [filters, totalRecords, getSubjects])

    if (dashboardError)
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                    <div className="text-red-500 mb-4">Ошибка загрузки данных</div>
                    <Button variant="secondary" onClick={refreshDashboard}>
                        Попробовать снова
                    </Button>
                </div>
            </div>
        )

    return (
        <ListContainer>
            <ListHeader
                title={pageTitle}
                filterDisplayText={filterDisplayText}
                actionButtons={[
                    {
                        label: 'Создать тему',
                        onClick: handleCreate,
                        icon: Plus,
                        variant: 'primary',
                        disabled: loading
                    }
                ]}
            >
                {selectedTopics.length > 0 && (
                    <Button
                        variant="danger"
                        onClick={handleBulkDeleteClick}
                        disabled={loading}
                        icon={<Trash2 className="h-4 w-4" />}
                    >
                        Удалить выбранные ({selectedTopics.length})
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
                title="Фильтры тем"
                filters={filters}
                filterConfig={filterConfig}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                isOpen={filtersOpen}
                onToggle={() => setFiltersOpen(!filtersOpen)}
                loading={loading}
                activeFiltersCount={activeFiltersCount}
            />

            <ListTable
                data={paginatedTopics}
                columns={columns}
                loading={loading}
                emptyMessage="Темы не найдены"
                selectable={true}
                selectedRows={selectedTopics}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                actions={tableActions}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalRecords={totalRecords}
            />

            <DeleteConfirmation
                isOpen={deleteConfirmOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Удаление темы"
                message={
                    topicToDelete?.id === -1
                        ? `Вы уверены, что хотите удалить ${selectedTopics.length} выбранных тем? Все связанные вопросы и тренажеры также будут удалены.`
                        : `Вы уверены, что хотите удалить тему "${topicToDelete?.name}"? Все связанные вопросы и тренажеры также будут удалены.`
                }
                isLoading={loading}
            />
        </ListContainer>
    )
}