import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useTrainerStore } from '@/stores/trainerStore'
import { Trainer } from '@/types'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Trash2, Users, Folder, FileText } from 'lucide-react'

import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import { DeleteConfirmation } from '@/components/lists/DeleteConfirmation'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

export const TrainerList: React.FC = () =>
{
    const navigate = useNavigate()
    const { deleteTrainer, loading: deleteLoading } = useTrainerStore()
    const {
        getTrainers,
        getTopics,
        loading: dashboardLoading,
        error: dashboardError,
        refreshDashboard
    } = useDashboardStore()

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({
        search: '',
        difficulty: '',
        type: '',
        topic_id: ''
    })
    const [selectedTrainers, setSelectedTrainers] = useState<string[]>([])
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [trainerToDelete, setTrainerToDelete] = useState<Trainer | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(true)

    const allTrainers = useMemo(() =>
    {
        const trainers = getTrainers()
        const topics = getTopics()

        return trainers.map(trainer =>
        {
            const topic = topics.find(t => t.id === trainer.topic_id)
            return {
                ...trainer,
                topic_name: topic?.name || '-',
                topic_subject_id: topic?.subject_id
            }
        })
    }, [getTrainers, getTopics])

    const loading = dashboardLoading || deleteLoading

    const filteredTrainers = useMemo(() =>
    {
        let result = [...allTrainers]

        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            result = result.filter(trainer =>
                trainer.name.toLowerCase().includes(searchLower) ||
                trainer.topic_name.toLowerCase().includes(searchLower) ||
                trainer.description?.toLowerCase().includes(searchLower)
            )
        }


        if (filters.topic_id)
            result = result.filter(trainer => trainer.topic_id?.toString() === filters.topic_id)

        return result
    }, [allTrainers, filters])

    const totalRecords = filteredTrainers.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedTrainers = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredTrainers.slice(start, start + pageSize)
    }, [filteredTrainers, currentPage, pageSize])

    const topicOptions = useMemo(() =>
    {
        const topics = getTopics()
        return topics.map(topic => ({
            value: topic.id.toString(),
            label: topic.name
        }))
    }, [getTopics])

    useEffect(() =>
    {
        setCurrentPage(1)
    }, [filters])

    const handleRefreshData = useCallback(() =>
    {
        refreshDashboard()
        setSelectedTrainers([])
    }, [refreshDashboard])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({
            search: '',
            difficulty: '',
            type: '',
            topic_id: ''
        })
        setCurrentPage(1)
    }, [])

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
        setSelectedTrainers(prev =>
            checked
                ? [...prev, id]
                : prev.filter(trainerId => trainerId !== id)
        )
    }, [])

    const handleSelectAll = useCallback((checked: boolean) =>
    {
        if (checked)
            setSelectedTrainers(paginatedTrainers.map(trainer => trainer.id.toString()))
        else
            setSelectedTrainers([])
    }, [paginatedTrainers])

    const handleCreate = useCallback(() =>
    {
        navigate('/trainers/create')
    }, [navigate])

    const handleEdit = useCallback((trainer: Trainer) =>
    {
        navigate(`/trainers/${trainer.id}/edit`)
    }, [navigate])

    const handleView = useCallback((trainer: Trainer) =>
    {
        navigate(`/trainers/${trainer.id}`)
    }, [navigate])

    const handleDeleteClick = useCallback((trainer: Trainer) =>
    {
        setTrainerToDelete(trainer)
        setDeleteConfirmOpen(true)
    }, [])

    const handleBulkDeleteClick = useCallback(() =>
    {
        if (selectedTrainers.length === 0) return

        const trainerNames = allTrainers
            .filter(trainer => selectedTrainers.includes(trainer.id.toString()))
            .map(trainer => trainer.name)
            .join(', ')

        setTrainerToDelete({
            id: -1,
            name: trainerNames,
            topic_id: 0,
            question_count: 0,
        } as Trainer)
        setDeleteConfirmOpen(true)
    }, [selectedTrainers, allTrainers])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!trainerToDelete) return

        try
        {
            if (trainerToDelete.id === -1)
            {
                for (const trainerId of selectedTrainers)
                    await deleteTrainer(parseInt(trainerId))
                toast.success(`Удалено ${selectedTrainers.length} тренажеров`)
                setSelectedTrainers([])
            } else
            {
                await deleteTrainer(trainerToDelete.id)
                toast.success(`Тренажер "${trainerToDelete.name}" успешно удален`)
            }

            await refreshDashboard()
            setDeleteConfirmOpen(false)
            setTrainerToDelete(null)
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении тренажера')
        }
    }, [trainerToDelete, selectedTrainers, deleteTrainer, refreshDashboard])

    const handleDeleteCancel = useCallback(() =>
    {
        setDeleteConfirmOpen(false)
        setTrainerToDelete(null)
    }, [])

    const filterConfig = useMemo(() => ({
        search: {
            placeholder: 'Поиск по названию, теме или описанию...',
        },
        selects: [
            {
                key: 'topic_id',
                label: 'Тема',
                icon: Folder,
                options: topicOptions,
                multiple: false,
                placeholder: 'Выберите тему...'
            },
        ],
    }), [topicOptions])

    const columns = useMemo(() => [
        {
            header: 'Название',
            accessor: 'name',
            width: '25%',
            render: (value: string, item: Trainer & { topic_name: string }) => (
                <div className="flex flex-col">
                    <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium text-gray-900">{value}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        ID: {item.id}
                    </div>
                </div>
            )
        },
        {
            header: 'Тема',
            accessor: 'topic_name',
            width: '20%',
            render: (value: string) => (
                <div className="flex items-center">
                    <Folder className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">{value}</span>
                </div>
            )
        },
        {
            header: 'Вопросы',
            accessor: 'question_count',
            width: '10%',
            render: (value: number) => (
                <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="font-medium">{value}</span>
                </div>
            )
        },
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
        if (filters.difficulty) count++
        if (filters.type) count++
        if (filters.topic_id) count++
        return count
    }, [filters])

    const filterDisplayText = useMemo(() =>
    {
        const parts = []
        if (filters.search) parts.push(`поиск: "${filters.search}"`)
        if (filters.topic_id)
        {
            const topic = getTopics().find(t => t.id.toString() === filters.topic_id)
            parts.push(`тема: ${topic?.name}`)
        }
        return parts.length > 0 ? `Найдено ${totalRecords} тренажеров (${parts.join(', ')})` : null
    }, [filters, totalRecords, getTopics])

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
                title="Тренажеры"
                filterDisplayText={filterDisplayText}
                actionButtons={[
                    {
                        label: 'Создать тренажер',
                        onClick: handleCreate,
                        icon: Plus,
                        variant: 'primary',
                        disabled: loading
                    }
                ]}
            >
                {selectedTrainers.length > 0 && (
                    <Button
                        variant="danger"
                        onClick={handleBulkDeleteClick}
                        disabled={loading}
                        icon={<Trash2 className="h-4 w-4" />}
                    >
                        Удалить выбранные ({selectedTrainers.length})
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
                title="Фильтры тренажеров"
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
                data={paginatedTrainers}
                columns={columns}
                loading={loading}
                emptyMessage="Тренажеры не найдены"
                selectable={true}
                selectedRows={selectedTrainers}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                actions={tableActions}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalRecords={totalRecords}
            // showAdvancedPagination={false}
            />

            <DeleteConfirmation
                isOpen={deleteConfirmOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Удаление тренажера"
                message={
                    trainerToDelete?.id === -1
                        ? `Вы уверены, что хотите удалить ${selectedTrainers.length} выбранных тренажеров? Все связанные данные будут потеряны.`
                        : `Вы уверены, что хотите удалить тренажер "${trainerToDelete?.name}"? Все связанные данные будут потеряны.`
                }
                isLoading={loading}
            />
        </ListContainer>
    )
}