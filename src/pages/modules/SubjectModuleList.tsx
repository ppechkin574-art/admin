import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubjectStore } from '@/stores/subjectStore'
import { useModuleStore } from '@/stores/moduleStore'
import { BookOpen, Layers, FileText, RefreshCw } from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

export const SubjectModuleList: React.FC = () =>
{
    const navigate = useNavigate()
    const { subjects, fetchSubjects, loading: subjectsLoading } = useSubjectStore()
    const { modules, fetchModules, loading: modulesLoading } = useModuleStore()

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({ search: '' })
    const [filtersOpen, setFiltersOpen] = useState(false)

    useEffect(() =>
    {
        fetchSubjects()
        fetchModules()
    }, [fetchSubjects, fetchModules])

    const enrichedSubjects = useMemo(() =>
    {
        return subjects.map(subject =>
        {
            const subjectModules = modules.filter(m => m.subject_id === subject.id)
            const lessonCount = subjectModules.reduce((sum, m) => sum + (m.lesson_count || 0), 0)
            return {
                ...subject,
                module_count: subjectModules.length,
                lesson_count: lessonCount
            }
        })
    }, [subjects, modules])

    const filteredSubjects = useMemo(() =>
    {
        let result = enrichedSubjects
        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            result = result.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                s.description?.toLowerCase().includes(searchLower)
            )
        }
        return result
    }, [enrichedSubjects, filters])

    const totalRecords = filteredSubjects.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedSubjects = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredSubjects.slice(start, start + pageSize)
    }, [filteredSubjects, currentPage, pageSize])

    const handleRefresh = useCallback(() =>
    {
        console.log('Refreshing data with filters:', filters)
        fetchSubjects(true)
        fetchModules(undefined, true)
    }, [fetchSubjects, fetchModules])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
    }, [])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({ search: '' })
        setCurrentPage(1)
    }, [])

    const handlePageChange = useCallback((page: number) => setCurrentPage(page), [])
    const handlePageSizeChange = useCallback((size: number) =>
    {
        setPageSize(size)
        setCurrentPage(1)
    }, [])

    const handleViewSubject = useCallback((subject: any) =>
    {
        navigate(`/modules/subject/${subject.id}`)
    }, [navigate])

    const columns = useMemo(() => [
        {
            header: 'Предмет',
            accessor: 'name',
            width: '40%',
            render: (value: string, item: any) => (
                <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{value}</span>
                </div>
            )
        },
        {
            header: 'Модулей',
            accessor: 'module_count',
            width: '25%',
            render: (value: number) => (
                <div className="flex items-center">
                    <Layers className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="font-medium">{value}</span>
                </div>
            )
        },
        {
            header: 'Уроков',
            accessor: 'lesson_count',
            width: '25%',
            render: (value: number) => (
                <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="font-medium">{value}</span>
                </div>
            )
        },
    ], [])

    const tableActions = useMemo(() => ({
        view: handleViewSubject
    }), [handleViewSubject])

    const filterConfig = useMemo(() => ({
        search: { placeholder: 'Поиск по названию предмета...' }
    }), [])

    const loading = subjectsLoading || modulesLoading

    return (
        <ListContainer>
            <ListHeader
                title="Предметы с модулями"
                filterDisplayText={filters.search ? `поиск: "${filters.search}"` : null}
                actionButtons={[]}
            >
                <Button
                    variant="secondary"
                    onClick={handleRefresh}
                    disabled={loading}
                    icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                    {loading ? 'Загрузка...' : 'Обновить'}
                </Button>
            </ListHeader>

            <SimpleFilter
                title="Фильтры"
                filters={filters}
                filterConfig={filterConfig}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                isOpen={filtersOpen}
                onToggle={() => setFiltersOpen(!filtersOpen)}
                loading={loading}
                activeFiltersCount={filters.search ? 1 : 0}
            />

            <ListTable
                data={paginatedSubjects}
                columns={columns}
                loading={loading}
                emptyMessage="Предметы не найдены"
                selectable={false}
                actions={tableActions}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalRecords={totalRecords}
            />
        </ListContainer>
    )
}