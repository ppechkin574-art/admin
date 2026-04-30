import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useModuleStore } from '@/stores/moduleStore'
import { useSubjectStore } from '@/stores/subjectStore'
import { SubjectModule } from '@/types/modules'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, BookOpen, Hash } from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import { DeleteConfirmation } from '@/components/lists/DeleteConfirmation'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

export const ModuleList: React.FC = () =>
{
    const { subjectId } = useParams<{ subjectId: string }>()
    const navigate = useNavigate()
    const { modules, loading, fetchModules, refreshModules, deleteModule } = useModuleStore()
    const { subjects, fetchSubjects } = useSubjectStore()

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({
        search: '',
        subject_id: subjectId || ''
    })
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [moduleToDelete, setModuleToDelete] = useState<SubjectModule | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(false)

    useEffect(() =>
    {
        fetchModules(filters)
    }, [filters, fetchModules])

    useEffect(() =>
    {
        fetchSubjects()
    }, [fetchSubjects])

    useEffect(() =>
    {
        setFilters(prev => ({ ...prev, subject_id: subjectId || '' }))
    }, [subjectId])

    const handleRefreshData = useCallback(() =>
    {
        refreshModules(filters)
    }, [filters, refreshModules])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
    }, [])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({
            search: '',
            subject_id: subjectId || ''
        })
        setCurrentPage(1)
    }, [subjectId])

    const handlePageChange = useCallback((page: number) => setCurrentPage(page), [])
    const handlePageSizeChange = useCallback((size: number) =>
    {
        setPageSize(size)
        setCurrentPage(1)
    }, [])

    const handleCreate = useCallback(() =>
    {
        if (subjectId)
            navigate(`/modules/create?subject_id=${subjectId}`)
        else
            navigate('/modules/create')
    }, [navigate, subjectId])

    const handleEdit = useCallback((module: SubjectModule) =>
    {
        navigate(`/modules/${module.id}/edit`)
    }, [navigate])

    const handleView = useCallback((module: SubjectModule) =>
    {
        navigate(`/modules/${module.id}`)
    }, [navigate])

    const handleDeleteClick = useCallback((module: SubjectModule) =>
    {
        setModuleToDelete(module)
        setDeleteConfirmOpen(true)
    }, [])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!moduleToDelete) return
        try
        {
            await deleteModule(moduleToDelete.id)
            toast.success(`Модуль "${moduleToDelete.title}" успешно удален`)
            await refreshModules({ page: currentPage, page_size: pageSize, ...filters })
            setDeleteConfirmOpen(false)
            setModuleToDelete(null)
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении модуля')
        }
    }, [moduleToDelete, deleteModule, refreshModules, currentPage, pageSize, filters])

    const handleDeleteCancel = useCallback(() =>
    {
        setDeleteConfirmOpen(false)
        setModuleToDelete(null)
    }, [])

    const handleBack = useCallback(() =>
    {
        navigate('/modules')
    }, [navigate])

    const filterConfig = useMemo(() => ({
        search: { placeholder: 'Поиск по названию или описанию...' },
        selects: [
            {
                key: 'subject_id',
                label: 'Предмет',
                icon: BookOpen,
                options: subjects.map(subject => ({
                    value: subject.id.toString(),
                    label: subject.name
                })),
                multiple: false,
                placeholder: 'Выберите предмет...'
            }
        ]
    }), [subjects])

    const columns = useMemo(() => [
        {
            header: 'Название',
            accessor: 'title',
            width: '25%',
            render: (value: string, item: SubjectModule) => (
                <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{value}</span>
                </div>
            )
        },
        {
            header: 'Предмет',
            accessor: 'subject',
            width: '20%',
            render: (value: any, item: SubjectModule) =>
            {
                const subject = subjects.find(s => s.id === item.subject_id)
                return subject ? subject.name : `ID: ${item.subject_id}`
            }
        },
        {
            header: 'Порядок',
            accessor: 'order_index',
            width: '15%',
            render: (value: number) => (
                <div className="flex items-center">
                    <Hash className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="font-medium">{value}</span>
                </div>
            )
        },
        {
            header: 'Уроки',
            accessor: 'lesson_count',
            width: '15%',
            render: (value: number) => <span className="font-medium">{value || 0}</span>
        },
        {
            header: 'Описание',
            accessor: 'description',
            width: '25%',
            render: (value: string) => (
                <span className="text-gray-600 truncate max-w-xs block">{value || '—'}</span>
            )
        }
    ], [subjects])

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
            const subject = subjects.find(s => s.id.toString() === filters.subject_id)
            parts.push(`предмет: ${subject?.name || filters.subject_id}`)
        }
        return parts.length > 0 ? parts.join(', ') : null
    }, [filters, subjects])

    const filteredModules = useMemo(() =>
    {
        if (filters.subject_id)
            return modules.filter(m => m.subject_id === parseInt(filters.subject_id))
        return modules
    }, [modules, filters.subject_id])

    const totalRecords = filteredModules.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedModules = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredModules.slice(start, start + pageSize)
    }, [filteredModules, currentPage, pageSize])

    const title = subjectId
        ? `Модули предмета "${subjects.find(s => s.id === parseInt(subjectId))?.name || subjectId}"`
        : 'Модули'

    return (
        <ListContainer>
            <ListHeader
                title={title}
                filterDisplayText={filterDisplayText}
                backTo={subjectId ? '/modules' : undefined}
                actionButtons={[
                    {
                        label: 'Создать модуль',
                        onClick: handleCreate,
                        icon: Plus,
                        variant: 'primary',
                        disabled: loading
                    }
                ]}
            >
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
                title="Фильтры модулей"
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
                data={paginatedModules}
                columns={columns}
                loading={loading}
                emptyMessage="Модули не найдены"
                selectable={false}
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
                title="Удаление модуля"
                message={`Вы уверены, что хотите удалить модуль "${moduleToDelete?.title}"? Это действие нельзя отменить.`}
                isLoading={loading}
            />
        </ListContainer>
    )
}