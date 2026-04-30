import React, { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import
{
    X,
    Plus,
    Trash2,
    ArrowRight,
    ArrowLeft,
    Hash,
    FileText,
    BookOpen,
    AlertCircle
} from 'lucide-react'

import SimpleTable from '@/components/common/SimpleTable'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'
import ErrorState from '@/components/common/ErrorState'
import ConfirmModal from '@/components/common/ConfirmModal'
import { useQuestionTable } from '@/hooks/useQuestionTable'
import { entService } from '@/services/api'
import { useQuestionStore } from '@/stores/questionStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useEntStore } from '@/stores/entStore'
import { FilterOption, Topic } from '@/types'

interface EntQuestionsModalProps
{
    ent: any
    isOpen: boolean
    onClose: () => void
    onQuestionsUpdate: (selectedQuestions?: any[]) => void
}

const difficultyOptions: FilterOption[] = [
    { value: 'easy', label: 'Легкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'hard', label: 'Сложный' },
]

const typeOptions: FilterOption[] = [
    { value: 'single_choice', label: 'Одиночный выбор' },
    { value: 'multiple_choice', label: 'Множественный выбор' },
]

export const EntQuestionsModal: React.FC<EntQuestionsModalProps> = ({
    ent,
    isOpen,
    onClose,
    onQuestionsUpdate
}) =>
{
    const isSelectMode = !ent?.id;
    const {
        getTopics,
        refreshDashboard
    } = useDashboardStore()

    const { allQuestions, fetchAllQuestions, loading: questionsLoading } = useQuestionStore()
    const { entQuestions, fetchEntQuestions, questionsLoading: entLoading } = useEntStore()

    const [selectedAvailableRows, setSelectedAvailableRows] = useState<string[]>([])
    const [selectedCurrentRows, setSelectedCurrentRows] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [actionType, setActionType] = useState<'add' | 'remove'>('add')

    const [availableFilters, setAvailableFilters] = useState({
        search: '',
        difficulty: [] as string[],
        type: [] as string[],
    })

    const [currentFilters, setCurrentFilters] = useState({
        search: '',
        difficulty: [] as string[],
        type: [] as string[],
    })

    const [availablePage, setAvailablePage] = useState(1)
    const [availablePageSize, setAvailablePageSize] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [currentPageSize, setCurrentPageSize] = useState(10)

    const hasLoadedRef = React.useRef(false)

    useEffect(() =>
    {
        if (!isOpen)
        {
            hasLoadedRef.current = false
            return
        }

        const loadData = async () =>
        {
            if (isSelectMode)
            {
                if (allQuestions.length === 0 && !hasLoadedRef.current)
                {
                    setLoading(true)
                    setError(null)
                    try
                    {
                        hasLoadedRef.current = true
                        await fetchAllQuestions()
                    } catch (error: any)
                    {
                        console.error('Error loading questions:', error)
                        setError(error.message || 'Ошибка загрузки вопросов')
                        toast.error('Не удалось загрузить вопросы')
                    } finally
                    {
                        setLoading(false)
                    }
                }
                return
            }

            if (!ent || hasLoadedRef.current) return

            setLoading(true)
            setError(null)
            try
            {
                hasLoadedRef.current = true
                await Promise.all([
                    fetchEntQuestions(ent.id),
                    allQuestions.length === 0 ? fetchAllQuestions() : Promise.resolve()
                ])
            } catch (error: any)
            {
                console.error('Error loading data:', error)
                setError(error.message || 'Ошибка загрузки данных')
                toast.error('Не удалось загрузить данные')
            } finally
            {
                setLoading(false)
            }
        }

        loadData()
    }, [isOpen, ent, fetchEntQuestions, fetchAllQuestions, allQuestions.length, isSelectMode])

    const resetStates = () =>
    {
        setSelectedAvailableRows([])
        setSelectedCurrentRows([])
        setAvailableFilters({ search: '', difficulty: [], type: [] })
        setCurrentFilters({ search: '', difficulty: [], type: [] })
        setAvailablePage(1)
        setCurrentPage(1)
    }

    useEffect(() =>
    {
        if (isOpen)
            resetStates()
    }, [isOpen])

    const allTopics = useMemo(() => getTopics(), [getTopics])

    const currentQuestions = useMemo(() =>
    {
        if (isSelectMode) return []
        const questions = entQuestions[ent?.id] || []
        const seen = new Set()
        return questions.filter(q =>
        {
            if (seen.has(q.id))
            {
                console.warn(`Duplicate question found: ${q.id}`)
                return false
            }
            seen.add(q.id)
            return true
        })
    }, [isSelectMode, entQuestions, ent?.id])

    const currentQuestionIds = useMemo(() =>
        new Set(currentQuestions.map(q => q.id.toString())),
        [currentQuestions]
    )

    const availableQuestions = useMemo(() =>
    {
        if (!ent) return []

        let questions = allQuestions.filter(q => q.subject_id === ent.subject_id)

        if (!isSelectMode)
            questions = questions.filter(q => !currentQuestionIds.has(q.id.toString()))

        const seen = new Set()
        return questions.filter(q =>
        {
            if (seen.has(q.id))
            {
                console.warn(`Duplicate question found in available: ${q.id}`)
                return false
            }
            seen.add(q.id)
            return true
        })
    }, [allQuestions, ent, currentQuestionIds, isSelectMode])

    const filterQuestions = (questions: any[], filters: any) =>
    {
        let filtered = [...questions]

        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            filtered = filtered.filter(q =>
                q.blocks?.some((block: any) =>
                    block.type === 'text' && block.value?.toLowerCase().includes(searchLower)
                ) || q.id.toString().includes(searchLower)
            )
        }

        if (filters.difficulty?.length > 0)
            filtered = filtered.filter(q => filters.difficulty.includes(q.difficulty))

        if (filters.type?.length > 0)
            filtered = filtered.filter(q => filters.type.includes(q.type || q.question_type))

        return filtered
    }

    const filteredAvailableQuestions = useMemo(() =>
        filterQuestions(availableQuestions, availableFilters),
        [availableQuestions, availableFilters]
    )

    const filteredCurrentQuestions = useMemo(() =>
        filterQuestions(currentQuestions, currentFilters),
        [currentQuestions, currentFilters]
    )

    const paginatedAvailableQuestions = useMemo(() =>
    {
        const startIndex = (availablePage - 1) * availablePageSize
        return filteredAvailableQuestions.slice(startIndex, startIndex + availablePageSize)
    }, [filteredAvailableQuestions, availablePage, availablePageSize])

    const paginatedCurrentQuestions = useMemo(() =>
    {
        const startIndex = (currentPage - 1) * currentPageSize
        return filteredCurrentQuestions.slice(startIndex, startIndex + currentPageSize)
    }, [filteredCurrentQuestions, currentPage, currentPageSize])

    const { questionColumns } = useQuestionTable({
        topics: allTopics as unknown as Topic[],
        onView: () => { },
        onEdit: () => { },
        onDelete: () => { }
    })

    const availableColumns = useMemo(() =>
        questionColumns
            .filter(col => !['actions', 'topic'].includes(col.key))
            .map((col, index) => ({
                ...col,
                header: col.title,
                accessor: col.key,
                render: col.render
            })),
        [questionColumns]
    )

    const currentColumns = useMemo(() =>
        questionColumns
            .filter(col => !['actions', 'topic', 'subject'].includes(col.key))
            .map((col, index) => ({
                ...col,
                header: col.title,
                accessor: col.key,
                render: col.render
            })),
        [questionColumns]
    )

    const handleAvailableFilterChange = useCallback((key: string, value: any) =>
    {
        setAvailableFilters(prev => ({ ...prev, [key]: value }))
        setAvailablePage(1)
    }, [])

    const handleCurrentFilterChange = useCallback((key: string, value: any) =>
    {
        setCurrentFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
    }, [])

    const handleAvailableResetFilters = useCallback(() =>
    {
        setAvailableFilters({ search: '', difficulty: [], type: [] })
        setAvailablePage(1)
    }, [])

    const handleCurrentResetFilters = useCallback(() =>
    {
        setCurrentFilters({ search: '', difficulty: [], type: [] })
        setCurrentPage(1)
    }, [])

    const availableFilterConfig = {
        search: {
            placeholder: 'Поиск по вопросам...',
        },
        selects: [
            {
                key: 'difficulty',
                label: 'Сложность',
                icon: Hash,
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
        ],
    }

    const currentFilterConfig = {
        search: {
            placeholder: 'Поиск по вопросам...',
        },
        selects: [
            {
                key: 'difficulty',
                label: 'Сложность',
                icon: Hash,
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
        ],
    }

    const handleAvailableSelectRow = useCallback((id: string, checked: boolean) =>
    {
        setSelectedAvailableRows(prev =>
            checked ? [...prev, id] : prev.filter(item => item !== id)
        )
    }, [])

    const handleAvailableSelectAll = useCallback((checked: boolean) =>
    {
        setSelectedAvailableRows(checked ?
            paginatedAvailableQuestions.map(q => q.id.toString()) :
            []
        )
    }, [paginatedAvailableQuestions])

    const handleCurrentSelectRow = useCallback((id: string, checked: boolean) =>
    {
        setSelectedCurrentRows(prev =>
            checked ? [...prev, id] : prev.filter(item => item !== id)
        )
    }, [])

    const handleCurrentSelectAll = useCallback((checked: boolean) =>
    {
        setSelectedCurrentRows(checked ?
            paginatedCurrentQuestions.map(q => q.id.toString()) :
            []
        )
    }, [paginatedCurrentQuestions])

    const handleBulkAdd = useCallback(() =>
    {
        if (selectedAvailableRows.length === 0)
        {
            toast.error('Выберите вопросы для добавления')
            return
        }

        if (isSelectMode)
        {
            const selectedQuestions = filteredAvailableQuestions.filter(q =>
                selectedAvailableRows.includes(q.id.toString())
            )
            onQuestionsUpdate(selectedQuestions)
            onClose()
        }
        else
        {
            setActionType('add')
            setConfirmOpen(true)
        }
    }, [selectedAvailableRows, filteredAvailableQuestions, isSelectMode, onQuestionsUpdate, onClose])

    const handleBulkRemove = useCallback(() =>
    {
        if (selectedCurrentRows.length === 0)
        {
            toast.error('Выберите вопросы для удаления')
            return
        }
        setActionType('remove')
        setConfirmOpen(true)
    }, [selectedCurrentRows])

    const handleConfirmAction = useCallback(async () =>
    {
        if (!ent?.id) return

        try
        {
            if (actionType === 'add')
            {
                await entService.addQuestionsToEntOption(
                    ent.id,
                    selectedAvailableRows.map(id => parseInt(id))
                )
                toast.success(`Добавлено ${selectedAvailableRows.length} вопросов`)
                setSelectedAvailableRows([])
            } else
            {
                await entService.removeQuestionsFromEntOption(
                    ent.id,
                    selectedCurrentRows.map(id => parseInt(id))
                )
                toast.success(`Удалено ${selectedCurrentRows.length} вопросов`)
                setSelectedCurrentRows([])
            }

            hasLoadedRef.current = false

            await Promise.all([
                fetchAllQuestions(),
                fetchEntQuestions(ent.id),
                refreshDashboard()
            ])

            onQuestionsUpdate()
            setConfirmOpen(false)
        } catch (error: any)
        {
            console.error(`Error ${actionType === 'add' ? 'adding' : 'removing'} questions:`, error)
            toast.error(error.message || `Ошибка ${actionType === 'add' ? 'добавления' : 'удаления'} вопросов`)
        }
    }, [actionType, ent, selectedAvailableRows, selectedCurrentRows, fetchAllQuestions, fetchEntQuestions, refreshDashboard, onQuestionsUpdate])

    const isLoading = loading || questionsLoading || entLoading

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={onClose}
                />

                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="relative w-full max-w-[1800px] rounded-lg bg-white shadow-xl">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <BookOpen className="h-6 w-6 text-primary-600" />
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {isSelectMode
                                                ? 'Выбор вопросов для варианта ЕНТ'
                                                : 'Управление вопросами варианта ЕНТ'}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Вариант #{ent?.option_number} • {ent?.subject?.name || 'Предмет'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        icon={<X className="h-4 w-4" />}
                                    >
                                        Закрыть
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4">
                            {error ? (
                                <ErrorState
                                    message={error}
                                    onRetry={() =>
                                    {
                                        hasLoadedRef.current = false
                                        setLoading(true)
                                    }}
                                    actionText="Попробовать снова"
                                />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {!isSelectMode && (
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">
                                                            Вопросы в варианте
                                                        </h3>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <span className="text-sm text-gray-600">
                                                                Всего: {currentQuestions.length}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                • Выбрано: {selectedCurrentRows.length}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            variant="danger"
                                                            onClick={handleBulkRemove}
                                                            disabled={selectedCurrentRows.length === 0 || isLoading}
                                                            icon={<Trash2 className="h-4 w-4" />}
                                                            size="sm"
                                                        >
                                                            Удалить выбранные
                                                        </Button>
                                                    </div>
                                                </div>

                                                <SimpleFilter
                                                    title="Фильтры"
                                                    filters={currentFilters}
                                                    filterConfig={currentFilterConfig}
                                                    onFilterChange={handleCurrentFilterChange}
                                                    onResetFilters={handleCurrentResetFilters}
                                                    loading={isLoading}
                                                    activeFiltersCount={
                                                        (currentFilters.search ? 1 : 0) +
                                                        (currentFilters.difficulty.length > 0 ? 1 : 0) +
                                                        (currentFilters.type.length > 0 ? 1 : 0)
                                                    }
                                                />
                                            </div>

                                            <div className="bg-white rounded-lg shadow border border-gray-200">
                                                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                                    <div className="flex items-center space-x-4">
                                                        <span className="text-sm text-gray-700">На странице:</span>
                                                        <select
                                                            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            value={currentPageSize}
                                                            onChange={(e) => setCurrentPageSize(Number(e.target.value))}
                                                            disabled={isLoading}
                                                        >
                                                            <option value="10">10</option>
                                                            <option value="20">20</option>
                                                            <option value="50">50</option>
                                                        </select>
                                                        <span className="text-sm text-gray-600">
                                                            {filteredCurrentQuestions.length} вопросов
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Страница {currentPage} из {Math.ceil(filteredCurrentQuestions.length / currentPageSize)}
                                                    </div>
                                                </div>

                                                <SimpleTable
                                                    data={paginatedCurrentQuestions}
                                                    columns={currentColumns}
                                                    loading={isLoading}
                                                    emptyMessage="В варианте пока нет вопросов"
                                                    selectable={true}
                                                    selectedRows={selectedCurrentRows}
                                                    onSelectRow={handleCurrentSelectRow}
                                                    onSelectAll={handleCurrentSelectAll}
                                                />

                                                {Math.ceil(filteredCurrentQuestions.length / currentPageSize) > 1 && (
                                                    <div className="px-4 py-3 border-t border-gray-200 flex justify-center">
                                                        <nav className="flex items-center space-x-2">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                                disabled={currentPage === 1 || isLoading}
                                                                icon={<ArrowLeft className="h-4 w-4" />}
                                                                size="sm"
                                                            >
                                                                Назад
                                                            </Button>
                                                            <span className="text-sm text-gray-600 px-3">
                                                                {currentPage} / {Math.ceil(filteredCurrentQuestions.length / currentPageSize)}
                                                            </span>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setCurrentPage(prev =>
                                                                    Math.min(Math.ceil(filteredCurrentQuestions.length / currentPageSize), prev + 1)
                                                                )}
                                                                disabled={
                                                                    currentPage >= Math.ceil(filteredCurrentQuestions.length / currentPageSize) ||
                                                                    isLoading
                                                                }
                                                                icon={<ArrowRight className="h-4 w-4" />}
                                                                iconPosition="right"
                                                                size="sm"
                                                            >
                                                                Вперед
                                                            </Button>
                                                        </nav>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className={isSelectMode ? 'lg:col-span-2' : 'space-y-4'}>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">
                                                        Доступные вопросы
                                                    </h3>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className="text-sm text-gray-600">
                                                            Всего: {availableQuestions.length}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            • Выбрано: {selectedAvailableRows.length}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        variant="primary"
                                                        onClick={handleBulkAdd}
                                                        disabled={selectedAvailableRows.length === 0 || isLoading}
                                                        icon={<Plus className="h-4 w-4" />}
                                                        size="sm"
                                                    >
                                                        {isSelectMode ? 'Выбрать' : 'Добавить выбранные'}
                                                    </Button>
                                                </div>
                                            </div>

                                            <SimpleFilter
                                                title="Фильтры"
                                                filters={availableFilters}
                                                filterConfig={availableFilterConfig}
                                                onFilterChange={handleAvailableFilterChange}
                                                onResetFilters={handleAvailableResetFilters}
                                                loading={isLoading}
                                                activeFiltersCount={
                                                    (availableFilters.search ? 1 : 0) +
                                                    (availableFilters.difficulty.length > 0 ? 1 : 0) +
                                                    (availableFilters.type.length > 0 ? 1 : 0)
                                                }
                                            />
                                        </div>

                                        <div className="bg-white rounded-lg shadow border border-gray-200">
                                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-sm text-gray-700">На странице:</span>
                                                    <select
                                                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                        value={availablePageSize}
                                                        onChange={(e) => setAvailablePageSize(Number(e.target.value))}
                                                        disabled={isLoading}
                                                    >
                                                        <option value="10">10</option>
                                                        <option value="20">20</option>
                                                        <option value="50">50</option>
                                                    </select>
                                                    <span className="text-sm text-gray-600">
                                                        {filteredAvailableQuestions.length} вопросов
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Страница {availablePage} из {Math.ceil(filteredAvailableQuestions.length / availablePageSize)}
                                                </div>
                                            </div>

                                            <SimpleTable
                                                data={paginatedAvailableQuestions}
                                                columns={availableColumns}
                                                loading={isLoading}
                                                emptyMessage="Нет доступных вопросов для добавления"
                                                selectable={true}
                                                selectedRows={selectedAvailableRows}
                                                onSelectRow={handleAvailableSelectRow}
                                                onSelectAll={handleAvailableSelectAll}
                                            />

                                            {Math.ceil(filteredAvailableQuestions.length / availablePageSize) > 1 && (
                                                <div className="px-4 py-3 border-t border-gray-200 flex justify-center">
                                                    <nav className="flex items-center space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setAvailablePage(prev => Math.max(1, prev - 1))}
                                                            disabled={availablePage === 1 || isLoading}
                                                            icon={<ArrowLeft className="h-4 w-4" />}
                                                            size="sm"
                                                        >
                                                            Назад
                                                        </Button>
                                                        <span className="text-sm text-gray-600 px-3">
                                                            {availablePage} / {Math.ceil(filteredAvailableQuestions.length / availablePageSize)}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setAvailablePage(prev =>
                                                                Math.min(Math.ceil(filteredAvailableQuestions.length / availablePageSize), prev + 1)
                                                            )}
                                                            disabled={
                                                                availablePage >= Math.ceil(filteredAvailableQuestions.length / availablePageSize) ||
                                                                isLoading
                                                            }
                                                            icon={<ArrowRight className="h-4 w-4" />}
                                                            iconPosition="right"
                                                            size="sm"
                                                        >
                                                            Вперед
                                                        </Button>
                                                    </nav>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium mb-1">Управление вопросами</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Выбирайте вопросы чекбоксами для массовых операций</li>
                                            <li>Используйте фильтры для быстрого поиска нужных вопросов</li>
                                            <li>Вопросы автоматически фильтруются по предмету варианта ЕНТ</li>
                                            <li>После изменений данные автоматически обновляются</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    {isSelectMode
                                        ? `Всего вопросов: ${availableQuestions.length}`
                                        : `Всего вопросов: ${currentQuestions.length + availableQuestions.length} •
                                           В варианте: ${currentQuestions.length} •
                                           Доступно: ${availableQuestions.length}`
                                    }
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={isLoading}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                        {
                                            hasLoadedRef.current = false
                                            setLoading(true)
                                        }}
                                        disabled={isLoading}
                                        loading={isLoading}
                                    >
                                        Обновить данные
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmAction}
                title={actionType === 'add' ? 'Добавление вопросов' : 'Удаление вопросов'}
                message={
                    actionType === 'add'
                        ? `Вы уверены, что хотите добавить ${selectedAvailableRows.length} вопросов в вариант ЕНТ?`
                        : `Вы уверены, что хотите удалить ${selectedCurrentRows.length} вопросов из варианта ЕНТ?`
                }
                confirmText={actionType === 'add' ? 'Добавить' : 'Удалить'}
                cancelText="Отмена"
                type={actionType === 'add' ? 'warning' : 'danger'}
                isLoading={isLoading}
            />
        </>
    )
}