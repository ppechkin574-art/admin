import React, { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { X, Plus, Trash2, Hash, FileText, BookOpen, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react'

import SimpleTable from '@/components/common/SimpleTable'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import ConfirmModal from '@/components/common/ConfirmModal'
import { useQuestionTable } from '@/hooks/useQuestionTable'
import { trainerService, questionService } from '@/services/api'
import { useQuestionStore } from '@/stores/questionStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { FilterOption, Topic } from '@/types'

interface LessonQuestionsModalProps
{
    trainerId: number
    subjectId: number
    topicId: number
    isOpen: boolean
    onClose: () => void
    onQuestionsUpdate: () => void
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

export const LessonQuestionsModal: React.FC<LessonQuestionsModalProps> = ({
    trainerId,
    subjectId,
    topicId,
    isOpen,
    onClose,
    onQuestionsUpdate
}) =>
{
    const { getTopics, refreshDashboard } = useDashboardStore()
    const { allQuestions, fetchAllQuestions, loading: questionsLoading } = useQuestionStore()

    const [trainer, setTrainer] = useState<any>(null)
    const [trainerQuestions, setTrainerQuestions] = useState<any[]>([])
    const [selectedAvailableRows, setSelectedAvailableRows] = useState<string[]>([])
    const [selectedCurrentRows, setSelectedCurrentRows] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [actionType, setActionType] = useState<'add' | 'remove'>('add')

    // Фильтры
    const [availableFilters, setAvailableFilters] = useState({ search: '', difficulty: [] as string[], type: [] as string[] })
    const [currentFilters, setCurrentFilters] = useState({ search: '', difficulty: [] as string[], type: [] as string[] })

    // Пагинация
    const [availablePage, setAvailablePage] = useState(1)
    const [availablePageSize, setAvailablePageSize] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [currentPageSize, setCurrentPageSize] = useState(10)

    const hasLoadedRef = React.useRef(false)

    // Загрузка данных
    useEffect(() =>
    {
        if (!isOpen)
        {
            hasLoadedRef.current = false
            return
        }

        const loadData = async () =>
        {
            if (hasLoadedRef.current) return
            setLoading(true)
            setError(null)
            try
            {
                hasLoadedRef.current = true
                await fetchAllQuestions()
                // Получаем тренажёр по его ID
                const trainerData = await trainerService.getById(trainerId)
                setTrainer(trainerData)
                setTrainerQuestions(trainerData.questions || [])
            } catch (err: any)
            {
                setError(err.message || 'Ошибка загрузки данных')
                toast.error('Не удалось загрузить данные')
            } finally
            {
                setLoading(false)
            }
        }

        if (isOpen) loadData()
    }, [isOpen, trainerId, fetchAllQuestions])

    // Сброс при открытии
    useEffect(() =>
    {
        if (isOpen)
        {
            setSelectedAvailableRows([])
            setSelectedCurrentRows([])
            setAvailableFilters({ search: '', difficulty: [], type: [] })
            setCurrentFilters({ search: '', difficulty: [], type: [] })
            setAvailablePage(1)
            setCurrentPage(1)
        }
    }, [isOpen])

    const allTopics = useMemo(() => getTopics(), [getTopics])

    // ID вопросов в тренажёре
    const currentQuestionIds = useMemo(() => new Set(trainerQuestions.map(q => q.id.toString())), [trainerQuestions])

    // Доступные вопросы: все вопросы по данной теме, исключая уже добавленные
    const availableQuestions = useMemo(() =>
    {
        if (!topicId) return []
        return allQuestions
            .filter(q => q.topic_id === topicId && !currentQuestionIds.has(q.id.toString()))
    }, [allQuestions, topicId, currentQuestionIds])

    // Фильтрация
    const filterQuestions = (questions: any[], filters: any) =>
    {
        let filtered = [...questions]
        if (filters.search)
        {
            const searchLower = filters.search.toLowerCase()
            filtered = filtered.filter(q =>
                q.blocks?.some((b: any) => b.type === 'text' && b.value?.toLowerCase().includes(searchLower)) ||
                q.id.toString().includes(searchLower)
            )
        }
        if (filters.difficulty?.length) filtered = filtered.filter(q => filters.difficulty.includes(q.difficulty))
        if (filters.type?.length) filtered = filtered.filter(q => filters.type.includes(q.type || q.question_type))
        return filtered
    }

    const filteredAvailable = useMemo(() => filterQuestions(availableQuestions, availableFilters), [availableQuestions, availableFilters])
    const filteredCurrent = useMemo(() => filterQuestions(trainerQuestions, currentFilters), [trainerQuestions, currentFilters])

    const paginatedAvailable = useMemo(() =>
    {
        const start = (availablePage - 1) * availablePageSize
        return filteredAvailable.slice(start, start + availablePageSize)
    }, [filteredAvailable, availablePage, availablePageSize])

    const paginatedCurrent = useMemo(() =>
    {
        const start = (currentPage - 1) * currentPageSize
        return filteredCurrent.slice(start, start + currentPageSize)
    }, [filteredCurrent, currentPage, currentPageSize])

    const { questionColumns } = useQuestionTable({ topics: allTopics as Topic[], onView: () => { }, onEdit: () => { }, onDelete: () => { } })

    const availableColumns = useMemo(() =>
        questionColumns.filter(col => !['actions', 'topic'].includes(col.key)).map(col => ({
            ...col,
            header: col.title,
            accessor: col.key,
            render: col.render
        })),
        [questionColumns]
    )

    const currentColumns = useMemo(() =>
        questionColumns.filter(col => !['actions', 'topic', 'subject'].includes(col.key)).map(col => ({
            ...col,
            header: col.title,
            accessor: col.key,
            render: col.render
        })),
        [questionColumns]
    )

    const handleAvailableFilterChange = (key: string, value: any) =>
    {
        setAvailableFilters(prev => ({ ...prev, [key]: value }))
        setAvailablePage(1)
    }
    const handleCurrentFilterChange = (key: string, value: any) =>
    {
        setCurrentFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
    }

    const filterConfig = {
        search: { placeholder: 'Поиск по вопросам...' },
        selects: [
            { key: 'difficulty', label: 'Сложность', icon: Hash, options: difficultyOptions, multiple: true },
            { key: 'type', label: 'Тип вопроса', icon: FileText, options: typeOptions, multiple: true },
        ],
    }

    // Выбор строк
    const handleAvailableSelectRow = (id: string, checked: boolean) =>
        setSelectedAvailableRows(prev => checked ? [...prev, id] : prev.filter(i => i !== id))
    const handleAvailableSelectAll = (checked: boolean) =>
        setSelectedAvailableRows(checked ? paginatedAvailable.map(q => q.id.toString()) : [])
    const handleCurrentSelectRow = (id: string, checked: boolean) =>
        setSelectedCurrentRows(prev => checked ? [...prev, id] : prev.filter(i => i !== id))
    const handleCurrentSelectAll = (checked: boolean) =>
        setSelectedCurrentRows(checked ? paginatedCurrent.map(q => q.id.toString()) : [])

    // Массовые операции (по одному)
    const handleBulkAdd = async () =>
    {
        if (selectedAvailableRows.length === 0)
        {
            toast.error('Выберите вопросы для добавления')
            return
        }
        setActionType('add')
        setConfirmOpen(true)
    }

    const handleBulkRemove = async () =>
    {
        if (selectedCurrentRows.length === 0)
        {
            toast.error('Выберите вопросы для удаления')
            return
        }
        setActionType('remove')
        setConfirmOpen(true)
    }

    const handleConfirmAction = async () =>
    {
        try
        {
            if (actionType === 'add')
            {
                for (const id of selectedAvailableRows)
                {
                    await trainerService.addQuestion(trainerId, parseInt(id))
                }
                toast.success(`Добавлено ${selectedAvailableRows.length} вопросов`)
                setSelectedAvailableRows([])
            } else
            {
                for (const id of selectedCurrentRows)
                {
                    await trainerService.removeQuestion(trainerId, parseInt(id))
                }
                toast.success(`Удалено ${selectedCurrentRows.length} вопросов`)
                setSelectedCurrentRows([])
            }
            // Обновляем списки
            const updatedTrainer = await trainerService.getById(trainerId)
            setTrainer(updatedTrainer)
            setTrainerQuestions(updatedTrainer.questions || [])
            onQuestionsUpdate()
            setConfirmOpen(false)
        } catch (err: any)
        {
            toast.error(err.message || `Ошибка ${actionType === 'add' ? 'добавления' : 'удаления'} вопросов`)
        }
    }

    if (!isOpen) return null

    const isLoading = loading || questionsLoading

    return (
        <>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="relative w-full max-w-[1800px] rounded-lg bg-white shadow-xl">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <BookOpen className="h-6 w-6 text-primary-600" />
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">Управление вопросами тренажёра</h2>
                                        <p className="text-sm text-gray-500">Тренажёр ID: {trainerId}</p>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={onClose} icon={<X className="h-4 w-4" />}>Закрыть</Button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4">
                            {error ? (
                                <ErrorState message={error} onRetry={() => hasLoadedRef.current = false} />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Левая колонка - вопросы в тренажёре */}
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">Вопросы в тренажёре</h3>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Всего: {trainerQuestions.length} • Выбрано: {selectedCurrentRows.length}
                                                    </div>
                                                </div>
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
                                            <SimpleFilter
                                                title="Фильтры"
                                                filters={currentFilters}
                                                filterConfig={filterConfig}
                                                onFilterChange={handleCurrentFilterChange}
                                                onResetFilters={() => setCurrentFilters({ search: '', difficulty: [], type: [] })}
                                                loading={isLoading}
                                                activeFiltersCount={
                                                    (currentFilters.search ? 1 : 0) +
                                                    (currentFilters.difficulty.length ? 1 : 0) +
                                                    (currentFilters.type.length ? 1 : 0)
                                                }
                                            />
                                        </div>

                                        <div className="bg-white rounded-lg shadow border border-gray-200">
                                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-sm text-gray-700">На странице:</span>
                                                    <select
                                                        value={currentPageSize}
                                                        onChange={e => setCurrentPageSize(Number(e.target.value))}
                                                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                    >
                                                        <option value="10">10</option>
                                                        <option value="20">20</option>
                                                        <option value="50">50</option>
                                                    </select>
                                                    <span className="text-sm text-gray-600">{filteredCurrent.length} вопросов</span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Страница {currentPage} из {Math.ceil(filteredCurrent.length / currentPageSize)}
                                                </div>
                                            </div>
                                            <SimpleTable
                                                data={paginatedCurrent}
                                                columns={currentColumns}
                                                loading={isLoading}
                                                emptyMessage="В тренажёре пока нет вопросов"
                                                selectable
                                                selectedRows={selectedCurrentRows}
                                                onSelectRow={handleCurrentSelectRow}
                                                onSelectAll={handleCurrentSelectAll}
                                            />
                                            {Math.ceil(filteredCurrent.length / currentPageSize) > 1 && (
                                                <div className="px-4 py-3 border-t border-gray-200 flex justify-center">
                                                    <nav className="flex items-center space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                            disabled={currentPage === 1}
                                                            icon={<ArrowLeft className="h-4 w-4" />}
                                                            size="sm"
                                                        >
                                                            Назад
                                                        </Button>
                                                        <span className="text-sm text-gray-600 px-3">
                                                            {currentPage} / {Math.ceil(filteredCurrent.length / currentPageSize)}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredCurrent.length / currentPageSize), p + 1))}
                                                            disabled={currentPage >= Math.ceil(filteredCurrent.length / currentPageSize)}
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

                                    {/* Правая колонка - доступные вопросы */}
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">Доступные вопросы по теме</h3>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Всего: {availableQuestions.length} • Выбрано: {selectedAvailableRows.length}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    onClick={handleBulkAdd}
                                                    disabled={selectedAvailableRows.length === 0 || isLoading}
                                                    icon={<Plus className="h-4 w-4" />}
                                                    size="sm"
                                                >
                                                    Добавить выбранные
                                                </Button>
                                            </div>
                                            <SimpleFilter
                                                title="Фильтры"
                                                filters={availableFilters}
                                                filterConfig={filterConfig}
                                                onFilterChange={handleAvailableFilterChange}
                                                onResetFilters={() => setAvailableFilters({ search: '', difficulty: [], type: [] })}
                                                loading={isLoading}
                                                activeFiltersCount={
                                                    (availableFilters.search ? 1 : 0) +
                                                    (availableFilters.difficulty.length ? 1 : 0) +
                                                    (availableFilters.type.length ? 1 : 0)
                                                }
                                            />
                                        </div>

                                        <div className="bg-white rounded-lg shadow border border-gray-200">
                                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-sm text-gray-700">На странице:</span>
                                                    <select
                                                        value={availablePageSize}
                                                        onChange={e => setAvailablePageSize(Number(e.target.value))}
                                                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                    >
                                                        <option value="10">10</option>
                                                        <option value="20">20</option>
                                                        <option value="50">50</option>
                                                    </select>
                                                    <span className="text-sm text-gray-600">{filteredAvailable.length} вопросов</span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Страница {availablePage} из {Math.ceil(filteredAvailable.length / availablePageSize)}
                                                </div>
                                            </div>
                                            <SimpleTable
                                                data={paginatedAvailable}
                                                columns={availableColumns}
                                                loading={isLoading}
                                                emptyMessage="Нет доступных вопросов для добавления"
                                                selectable
                                                selectedRows={selectedAvailableRows}
                                                onSelectRow={handleAvailableSelectRow}
                                                onSelectAll={handleAvailableSelectAll}
                                            />
                                            {Math.ceil(filteredAvailable.length / availablePageSize) > 1 && (
                                                <div className="px-4 py-3 border-t border-gray-200 flex justify-center">
                                                    <nav className="flex items-center space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setAvailablePage(p => Math.max(1, p - 1))}
                                                            disabled={availablePage === 1}
                                                            icon={<ArrowLeft className="h-4 w-4" />}
                                                            size="sm"
                                                        >
                                                            Назад
                                                        </Button>
                                                        <span className="text-sm text-gray-600 px-3">
                                                            {availablePage} / {Math.ceil(filteredAvailable.length / availablePageSize)}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setAvailablePage(p => Math.min(Math.ceil(filteredAvailable.length / availablePageSize), p + 1))}
                                                            disabled={availablePage >= Math.ceil(filteredAvailable.length / availablePageSize)}
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
                                        <p className="font-medium mb-1">Управление вопросами тренажёра</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Выбирайте вопросы чекбоксами для массовых операций</li>
                                            <li>Используйте фильтры для быстрого поиска</li>
                                            <li>Доступны только вопросы по текущей теме</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <Button variant="outline" onClick={onClose}>Закрыть</Button>
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
                        ? `Добавить ${selectedAvailableRows.length} вопросов в тренажёр?`
                        : `Удалить ${selectedCurrentRows.length} вопросов из тренажёра?`
                }
                confirmText={actionType === 'add' ? 'Добавить' : 'Удалить'}
                type={actionType === 'add' ? 'warning' : 'danger'}
            />
        </>
    )
}