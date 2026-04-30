import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubjectStore } from '@/stores/subjectStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { Subject } from '@/types'
import toast from 'react-hot-toast'
import { RefreshCw, Trash2, BookOpen, Hash, FileText, Layers } from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import { DeleteConfirmation } from '@/components/lists/DeleteConfirmation'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

const typeOptions = [
    { value: 'main', label: 'Основной' },
    { value: 'specialized', label: 'Профильный' },
]

interface SubjectListProps
{
    context?: 'ent' | 'trainer' | 'default';
}

export const SubjectList: React.FC<SubjectListProps> = ({ context = 'default' }) =>
{
    const navigate = useNavigate()
    const { deleteSubject, loading: deleteLoading } = useSubjectStore()
    const {
        getSubjects,
        loading: dashboardLoading,
        error: dashboardError,
        refreshDashboard,
        data,
    } = useDashboardStore()

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({
        search: '',
        type: ''
    })
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(false)

    const allSubjects = getSubjects()
    const loading = dashboardLoading || deleteLoading

    const enrichedSubjects = useMemo(() =>
    {
        return allSubjects.map(subject =>
        {
            const enriched = { ...subject } as any;

            if (context === 'ent' && data?.ent_options)
                enriched.ent_option_count = data.ent_options.filter(
                    (opt: any) => opt.subject_id === subject.id
                ).length;

            if (context === 'trainer' && data?.topics)
                enriched.topic_count = data.topics.filter(
                    (t: any) => t.subject_id === subject.id
                ).length;

            return enriched;
        });
    }, [allSubjects, context, data]);

    const filteredSubjects = useMemo(() =>
    {
        let result = [...enrichedSubjects]

        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            result = result.filter(subject =>
                subject.name.toLowerCase().includes(searchLower) ||
                subject.description?.toLowerCase().includes(searchLower)
            )
        }

        if (filters.type)
            result = result.filter(subject => subject.type === filters.type)

        return result
    }, [enrichedSubjects, filters])

    const totalRecords = filteredSubjects.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedSubjects = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredSubjects.slice(start, start + pageSize)
    }, [filteredSubjects, currentPage, pageSize])

    useEffect(() =>
    {
        setCurrentPage(1)
    }, [filters])

    const handleRefreshData = useCallback(() =>
    {
        refreshDashboard()
        setSelectedSubjects([])
    }, [refreshDashboard])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({
            search: '',
            type: ''
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
        setSelectedSubjects(prev =>
            checked
                ? [...prev, id]
                : prev.filter(subjectId => subjectId !== id)
        )
    }, [])

    const handleSelectAll = useCallback((checked: boolean) =>
    {
        if (checked)
            setSelectedSubjects(paginatedSubjects.map(subject => subject.id.toString()))
        else
            setSelectedSubjects([])
    }, [paginatedSubjects])

    const handleView = useCallback((subject: Subject) =>
    {
        if (context === 'ent')
            navigate(`/ent-practice/options?subject_id=${subject.id}`)
        else if (context === 'trainer')
            navigate(`/trainer-v2/topics?subject_id=${subject.id}`)
        else
            navigate(`/subjects/${subject.id}`)
    }, [navigate, context])

    const handleBulkDeleteClick = useCallback(() =>
    {
        if (selectedSubjects.length === 0) return

        const subjectNames = allSubjects
            .filter(subject => selectedSubjects.includes(subject.id.toString()))
            .map(subject => subject.name)
            .join(', ')

        setSubjectToDelete({
            id: -1,
            name: subjectNames,
            type: 'main',
            topic_count: 0,
        } as Subject)
        setDeleteConfirmOpen(true)
    }, [selectedSubjects, allSubjects])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!subjectToDelete) return

        try
        {
            if (subjectToDelete.id === -1)
            {
                for (const subjectId of selectedSubjects)
                    await deleteSubject(parseInt(subjectId))
                toast.success(`Удалено ${selectedSubjects.length} предметов`)
                setSelectedSubjects([])
            } else
            {
                await deleteSubject(subjectToDelete.id)
                toast.success(`Предмет "${subjectToDelete.name}" успешно удален`)
            }

            await refreshDashboard()
            setDeleteConfirmOpen(false)
            setSubjectToDelete(null)
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении предмета')
        }
    }, [subjectToDelete, selectedSubjects, deleteSubject, refreshDashboard])

    const handleDeleteCancel = useCallback(() =>
    {
        setDeleteConfirmOpen(false)
        setSubjectToDelete(null)
    }, [])

    const filterConfig = useMemo(() => ({
        search: {
            placeholder: 'Поиск по названию или описанию...',
        },
        selects: [
            {
                key: 'type',
                label: 'Тип предмета',
                icon: BookOpen,
                options: typeOptions,
                multiple: false,
                placeholder: 'Выберите тип...'
            },
        ],
    }), [])

    const columns = useMemo(() =>
    {
        const baseColumns = [
            {
                header: 'Название',
                accessor: 'name',
                width: '25%',
                render: (value: string, item: Subject) => (
                    <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium text-gray-900">{value}</span>
                    </div>
                )
            },
            {
                header: 'Тип',
                accessor: 'type',
                width: '15%',
                render: (value: string) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {value === 'main' ? 'Основной' : 'Профильный'}
                    </span>
                )
            },
        ];

        if (context === 'ent')
            return [
                ...baseColumns,
                {
                    header: 'Варианты',
                    accessor: 'ent_option_count',
                    width: '15%',
                    render: (value: number) => (
                        <div className="flex items-center">
                            <Layers className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="font-medium">{value || 0}</span>
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
                            <span className="font-medium">{value || 0}</span>
                        </div>
                    )
                },
            ];
        else if (context === 'trainer')
            return [
                ...baseColumns,
                {
                    header: 'Темы',
                    accessor: 'topic_count',
                    width: '15%',
                    render: (value: number) => (
                        <div className="flex items-center">
                            <Hash className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="font-medium">{value || 0}</span>
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
                            <span className="font-medium">{value || 0}</span>
                        </div>
                    )
                },
            ];
        else
            return [
                ...baseColumns,
                {
                    header: 'Темы',
                    accessor: 'topic_count',
                    width: '15%',
                    render: (value: number) => (
                        <div className="flex items-center">
                            <Hash className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="font-medium">{value}</span>
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
                },
            ];
    }, [context]);

    const tableActions = useMemo(() => ({
        view: handleView,
    }), [handleView])

    const activeFiltersCount = useMemo(() =>
    {
        let count = 0
        if (filters.search?.trim()) count++
        if (filters.type) count++
        return count
    }, [filters])

    const filterDisplayText = useMemo(() =>
    {
        const parts = []
        if (filters.search) parts.push(`поиск: "${filters.search}"`)
        if (filters.type)
            parts.push(`тип: ${typeOptions.find(opt => opt.value === filters.type)?.label}`)
        return parts.length > 0 ? `Найдено ${totalRecords} предметов (${parts.join(', ')})` : null
    }, [filters, totalRecords])

    const pageTitle = context === 'ent'
        ? 'Предметы ЕНТ'
        : context === 'trainer'
            ? 'Предметы тренажёров'
            : 'Предметы';

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
            >
                {selectedSubjects.length > 0 && (
                    <Button
                        variant="danger"
                        onClick={handleBulkDeleteClick}
                        disabled={loading}
                        icon={<Trash2 className="h-4 w-4" />}
                    >
                        Удалить выбранные ({selectedSubjects.length})
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
                title="Фильтры предметов"
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
                data={paginatedSubjects}
                columns={columns}
                loading={loading}
                emptyMessage="Предметы не найдены"
                selectable={true}
                selectedRows={selectedSubjects}
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
                title="Удаление предмета"
                message={
                    subjectToDelete?.id === -1
                        ? `Вы уверены, что хотите удалить ${selectedSubjects.length} выбранных предметов? Это действие нельзя отменить.`
                        : `Вы уверены, что хотите удалить предмет "${subjectToDelete?.name}"? Это действие нельзя отменить.`
                }
                isLoading={loading}
            />
        </ListContainer>
    )
}