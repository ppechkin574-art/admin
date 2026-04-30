import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useEntStore } from '@/stores/entStore'
import { EntOption } from '@/types'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Trash2, Hash, FileText, BookOpen } from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import { DeleteConfirmation } from '@/components/lists/DeleteConfirmation'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

export const EntList: React.FC = () =>
{
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const subjectIdFromQuery = searchParams.get('subject_id') || ''

    const { deleteEntOption, loading: entLoading } = useEntStore()
    const {
        data,
        loading: dashboardLoading,
        error: dashboardError,
        fetchDashboard,
        refreshDashboard,
        getEntOptions,
        getSubjects
    } = useDashboardStore()

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({
        search: '',
        subject_id: subjectIdFromQuery
    })
    const [selectedEnts, setSelectedEnts] = useState<string[]>([])
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [entToDelete, setEntToDelete] = useState<EntOption | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(true)

    useEffect(() =>
    {
        if (!data) fetchDashboard()
    }, [fetchDashboard, data])

    useEffect(() =>
    {
        setFilters(prev => ({ ...prev, subject_id: subjectIdFromQuery }))
    }, [subjectIdFromQuery])

    const entOptions = getEntOptions()
    const subjects = getSubjects()
    const loading = dashboardLoading || entLoading

    const enrichedEntOptions = useMemo(() =>
        entOptions.map(ent =>
        {
            const subject = subjects.find(s => s.id === ent.subject_id)
            return {
                ...ent,
                name: `Вариант ${ent.option_number}`,
                subject_name: subject?.name || 'Неизвестный предмет',
                subject: subject,
                question_count: ent.question_count || 0,
                created_date: ent.created_at ? new Date(ent.created_at).toLocaleDateString('ru-RU') : '—'
            }
        }),
        [entOptions, subjects]
    )

    const filteredEnts = useMemo(() =>
    {
        let result = [...enrichedEntOptions]

        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            result = result.filter(ent =>
                ent.name.toLowerCase().includes(searchLower) ||
                ent.subject_name.toLowerCase().includes(searchLower) ||
                ent.option_number.toString().includes(searchLower)
            )
        }

        if (filters.subject_id)
            result = result.filter(ent => ent.subject_id === parseInt(filters.subject_id))

        return result
    }, [enrichedEntOptions, filters])

    const totalRecords = filteredEnts.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedEnts = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredEnts.slice(start, start + pageSize)
    }, [filteredEnts, currentPage, pageSize])

    useEffect(() =>
    {
        setCurrentPage(1)
    }, [filters])

    const subjectOptions = useMemo(() =>
        subjects.map(subject => ({
            value: subject.id.toString(),
            label: subject.name
        })),
        [subjects]
    )

    const handleRefreshData = useCallback(() =>
    {
        refreshDashboard()
        setSelectedEnts([])
    }, [refreshDashboard])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
        if (key === 'subject_id')
        {
            const params = new URLSearchParams(window.location.search)
            if (value)
                params.set('subject_id', value)
            else
                params.delete('subject_id')
            navigate({ search: params.toString() }, { replace: true })
        }
    }, [navigate])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({
            search: '',
            subject_id: ''
        })
        navigate({ search: '' }, { replace: true })
        setCurrentPage(1)
    }, [navigate])

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
        setSelectedEnts(prev =>
            checked
                ? [...prev, id]
                : prev.filter(entId => entId !== id)
        )
    }, [])

    const handleSelectAll = useCallback((checked: boolean) =>
    {
        if (checked)
            setSelectedEnts(paginatedEnts.map(ent => ent.id.toString()))
        else
            setSelectedEnts([])
    }, [paginatedEnts])

    const handleCreate = useCallback(() =>
    {
        if (subjectIdFromQuery)
            navigate(`/ents/create?subject_id=${subjectIdFromQuery}`)
        else
            navigate('/ents/create')
    }, [navigate, subjectIdFromQuery])

    const handleEdit = useCallback((ent: EntOption) =>
    {
        navigate(`/ents/${ent.id}/edit`)
    }, [navigate])

    const handleView = useCallback((ent: EntOption) =>
    {
        navigate(`/ent-practice/options/${ent.id}`)
    }, [navigate])

    const handleDeleteClick = useCallback((ent: EntOption) =>
    {
        setEntToDelete(ent)
        setDeleteConfirmOpen(true)
    }, [])

    const handleBulkDeleteClick = useCallback(() =>
    {
        if (selectedEnts.length === 0) return

        const entNames = enrichedEntOptions
            .filter(ent => selectedEnts.includes(ent.id.toString()))
            .map(ent => `Вариант ${ent.option_number}`)
            .join(', ')

        setEntToDelete({
            id: -1,
            option_number: 0,
            subject_id: 0,
            question_count: 0,
            name: entNames
        } as EntOption)
        setDeleteConfirmOpen(true)
    }, [selectedEnts, enrichedEntOptions])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!entToDelete) return

        try
        {
            if (entToDelete.id === -1)
            {
                for (const entId of selectedEnts)
                    await deleteEntOption(parseInt(entId))
                toast.success(`Удалено ${selectedEnts.length} вариантов ЕНТ`)
                setSelectedEnts([])
            } else
            {
                await deleteEntOption(entToDelete.id)
                toast.success(`Вариант ЕНТ "${entToDelete.name}" успешно удален`)
            }

            await refreshDashboard()
            setDeleteConfirmOpen(false)
            setEntToDelete(null)
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении варианта ЕНТ')
        }
    }, [entToDelete, selectedEnts, deleteEntOption, refreshDashboard])

    const handleDeleteCancel = useCallback(() =>
    {
        setDeleteConfirmOpen(false)
        setEntToDelete(null)
    }, [])

    const filterConfig = useMemo(() => ({
        search: {
            placeholder: 'Поиск по номеру варианта, предмету...',
        },
        selects: [
            {
                key: 'subject_id',
                label: 'Предмет',
                icon: BookOpen,
                options: subjectOptions,
                multiple: false,
                placeholder: 'Выберите предмет...'
            },
        ],
    }), [subjectOptions])

    const columns = useMemo(() => [
        {
            header: 'Номер варианта',
            accessor: 'option_number',
            width: '15%',
            render: (value: number) => (
                <div className="flex items-center">
                    <Hash className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">Вариант {value}</span>
                </div>
            )
        },
        {
            header: 'Предмет',
            accessor: 'subject_name',
            width: '25%',
            render: (value: string) => (
                <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{value}</span>
                </div>
            )
        },
        {
            header: 'Вопросов',
            accessor: 'question_count',
            width: '15%',
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
        if (filters.subject_id) count++
        return count
    }, [filters])

    const filterDisplayText = useMemo(() =>
    {
        const parts = []
        if (filters.search) parts.push(`поиск: "${filters.search}"`)
        if (filters.subject_id)
        {
            const subject = subjects.find(s => s.id === parseInt(filters.subject_id))
            parts.push(`предмет: ${subject?.name}`)
        }
        return parts.length > 0 ? `Найдено ${totalRecords} вариантов (${parts.join(', ')})` : null
    }, [filters, totalRecords, subjects])

    const pageTitle = subjectIdFromQuery
        ? `Варианты ЕНТ по предмету "${subjects.find(s => s.id === parseInt(subjectIdFromQuery))?.name || subjectIdFromQuery}"`
        : 'Все варианты ЕНТ'

    const backTo = subjectIdFromQuery ? '/subjects' : undefined

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
                backTo={backTo}
                actionButtons={[
                    {
                        label: 'Создать вариант',
                        onClick: handleCreate,
                        icon: Plus,
                        variant: 'primary',
                        disabled: loading
                    }
                ]}
            >
                {selectedEnts.length > 0 && (
                    <Button
                        variant="danger"
                        onClick={handleBulkDeleteClick}
                        disabled={loading}
                        icon={<Trash2 className="h-4 w-4" />}
                    >
                        Удалить выбранные ({selectedEnts.length})
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
                title="Фильтры вариантов ЕНТ"
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
                data={paginatedEnts}
                columns={columns}
                loading={loading}
                emptyMessage="Варианты ЕНТ не найдены"
                selectable={true}
                selectedRows={selectedEnts}
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
                title="Удаление варианта ЕНТ"
                message={
                    entToDelete?.id === -1
                        ? `Вы уверены, что хотите удалить ${selectedEnts.length} выбранных вариантов ЕНТ? Все вопросы в этих вариантах будут удалены. Это действие нельзя отменить.`
                        : `Вы уверены, что хотите удалить вариант ЕНТ "${entToDelete?.name}"? Все вопросы в этом варианте будут удалены. Это действие нельзя отменить.`
                }
                isLoading={loading}
            />
        </ListContainer>
    )
}