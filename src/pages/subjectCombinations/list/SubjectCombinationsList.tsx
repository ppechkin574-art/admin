import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubjectCombinationStore } from '@/stores/subjectCombinationStore'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Trash2, Link as LinkIcon, BookOpen, Hash } from 'lucide-react'

import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import { DeleteConfirmation } from '@/components/lists/DeleteConfirmation'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'

export const SubjectCombinationsList: React.FC = () =>
{
    const navigate = useNavigate()
    const {
        combinations,
        loading,
        error,
        fetchCombinations,
        deleteCombination
    } = useSubjectCombinationStore()

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({
        search: ''
    })
    const [selectedCombinations, setSelectedCombinations] = useState<string[]>([])
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [combinationToDelete, setCombinationToDelete] = useState<SubjectCombination | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(true)

    useEffect(() =>
    {
        fetchCombinations()
    }, [fetchCombinations])

    const filteredCombinations = useMemo(() =>
    {
        let result = [...combinations]

        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            result = result.filter(combination =>
                combination.name.toLowerCase().includes(searchLower) ||
                combination.description?.toLowerCase().includes(searchLower) ||
                combination.specialized_subject_1_name?.toLowerCase().includes(searchLower) ||
                combination.specialized_subject_2_name?.toLowerCase().includes(searchLower) ||
                combination.third_subject_name?.toLowerCase().includes(searchLower)
            )
        }

        return result
    }, [combinations, filters])

    const totalRecords = filteredCombinations.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedCombinations = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredCombinations.slice(start, start + pageSize)
    }, [filteredCombinations, currentPage, pageSize])

    useEffect(() =>
    {
        setCurrentPage(1)
    }, [filters])

    const handleRefreshData = useCallback(() =>
    {
        fetchCombinations()
        setSelectedCombinations([])
    }, [fetchCombinations])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({
            search: ''
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
        setSelectedCombinations(prev =>
            checked
                ? [...prev, id]
                : prev.filter(combinationId => combinationId !== id)
        )
    }, [])

    const handleSelectAll = useCallback((checked: boolean) =>
    {
        if (checked)
            setSelectedCombinations(paginatedCombinations.map(combination => combination.id.toString()))
        else
            setSelectedCombinations([])
    }, [paginatedCombinations])

    const handleCreate = useCallback(() =>
    {
        navigate('/subject-combinations/create')
    }, [navigate])

    const handleEdit = useCallback((combination: SubjectCombination) =>
    {
        navigate(`/subject-combinations/${combination.id}/edit`)
    }, [navigate])

    const handleView = useCallback((combination: SubjectCombination) =>
    {
        navigate(`/subject-combinations/${combination.id}`)
    }, [navigate])

    const handleDeleteClick = useCallback((combination: SubjectCombination) =>
    {
        setCombinationToDelete(combination)
        setDeleteConfirmOpen(true)
    }, [])

    const handleBulkDeleteClick = useCallback(() =>
    {
        if (selectedCombinations.length === 0) return

        const combinationNames = combinations
            .filter(combination => selectedCombinations.includes(combination.id.toString()))
            .map(combination => combination.name)
            .join(', ')

        setCombinationToDelete({
            id: -1,
            name: combinationNames,
            specialized_subject_1_id: 0,
            specialized_subject_2_id: 0
        } as SubjectCombination)
        setDeleteConfirmOpen(true)
    }, [selectedCombinations, combinations])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!combinationToDelete) return

        try
        {
            if (combinationToDelete.id === -1)
            {
                for (const combinationId of selectedCombinations)
                    await deleteCombination(parseInt(combinationId))
                toast.success(`Удалено ${selectedCombinations.length} связок`)
                setSelectedCombinations([])
            } else
            {
                await deleteCombination(combinationToDelete.id)
                toast.success(`Связка "${combinationToDelete.name}" успешно удалена`)
            }

            await fetchCombinations()
            setDeleteConfirmOpen(false)
            setCombinationToDelete(null)
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении связки')
        }
    }, [combinationToDelete, selectedCombinations, deleteCombination, fetchCombinations])

    const handleDeleteCancel = useCallback(() =>
    {
        setDeleteConfirmOpen(false)
        setCombinationToDelete(null)
    }, [])

    const filterConfig = useMemo(() => ({
        search: {
            placeholder: 'Поиск по названию, описанию или предметам...',
        },
    }), [])

    const columns = useMemo(() => [
        {
            header: 'Название',
            accessor: 'name',
            width: '25%',
            render: (value: string) => (
                <div className="flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{value}</span>
                </div>
            )
        },
        {
            header: 'Профильные предметы',
            accessor: 'specialized_subjects',
            width: '35%',
            render: (value: any, item: SubjectCombination) => (
                <div className="space-y-1">
                    <div className="flex items-center">
                        <BookOpen className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="text-sm">
                            {item.specialized_subject_1_name || 'Не указан'} • {item.specialized_subject_2_name || 'Не указан'}
                        </span>
                    </div>
                    {item.third_subject_name && (
                        <div className="flex items-center">
                            <Hash className="h-3 w-3 mr-1 text-gray-400" />
                            <span className="text-sm text-gray-600">
                                Доп: {item.third_subject_name}
                            </span>
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Описание',
            accessor: 'description',
            width: '30%',
            render: (value: string) => (
                <span className="text-gray-600 truncate max-w-xs block">
                    {value || '—'}
                </span>
            )
        },
        {
            header: 'ID',
            accessor: 'id',
            width: '10%',
            render: (value: number) => (
                <span className="text-gray-500 font-mono">#{value}</span>
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
        return count
    }, [filters])

    const filterDisplayText = useMemo(() =>
    {
        const parts = []
        if (filters.search) parts.push(`поиск: "${filters.search}"`)
        return parts.length > 0 ? `Найдено ${totalRecords} связок (${parts.join(', ')})` : null
    }, [filters, totalRecords])

    if (error)
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                    <div className="text-red-500 mb-4">Ошибка загрузки данных</div>
                    <Button variant="secondary" onClick={fetchCombinations}>
                        Попробовать снова
                    </Button>
                </div>
            </div>
        )

    return (
        <ListContainer>
            <ListHeader
                title="Связки предметов"
                filterDisplayText={filterDisplayText}
                actionButtons={[
                    {
                        label: 'Создать связку',
                        onClick: handleCreate,
                        icon: Plus,
                        variant: 'primary',
                        disabled: loading
                    }
                ]}
            >
                {selectedCombinations.length > 0 && (
                    <Button
                        variant="danger"
                        onClick={handleBulkDeleteClick}
                        disabled={loading}
                        icon={<Trash2 className="h-4 w-4" />}
                    >
                        Удалить выбранные ({selectedCombinations.length})
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
                title="Фильтры связок предметов"
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
                data={paginatedCombinations}
                columns={columns}
                loading={loading}
                emptyMessage="Связки предметов не найдены"
                selectable={true}
                selectedRows={selectedCombinations}
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
                title="Удаление связки предметов"
                message={
                    combinationToDelete?.id === -1
                        ? `Вы уверены, что хотите удалить ${selectedCombinations.length} выбранных связок предметов? Это действие нельзя отменить.`
                        : `Вы уверены, что хотите удалить связку "${combinationToDelete?.name}"? Это действие нельзя отменить.`
                }
                isLoading={loading}
            />
        </ListContainer>
    )
}