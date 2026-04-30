import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, FileSpreadsheet, Edit, Trash2, Eye } from 'lucide-react'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useEntStore } from '@/stores/entStore'
import { useQuestionStore } from '@/stores/questionStore'
import { useQuestionTable } from '@/hooks/useQuestionTable'
import { questionService, entService } from '@/services/api'
import { DetailContent } from '@/components/details/DetailContent'
import { DetailHeader } from '@/components/details/DetailHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'
import { ListTable } from '@/components/lists/ListTable'
import { ImportModal } from '@/pages/questions/import/ImportModal'
import { EntQuestionsModal } from '@/pages/ents/modal/EntQuestionsModal'
import { CreateQuestionModal } from '@/pages/modules/CreateQuestionModal'
import { QuestionType } from '@/types/enums'

const getPaginationStorageKey = (entId: string) => `ent-pagination-${entId}`

export const EntForm: React.FC = () =>
{
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const entId = id ? Number(id) : undefined
    const isEditing = !!entId

    const { getEntOptions, getSubjects, refreshDashboard } = useDashboardStore()
    const {
        createEntOption,
        updateEntOption,
        loading,
        entQuestions,
        fetchEntQuestions,
        questionsLoading
    } = useEntStore()
    const { allQuestions, fetchAllQuestions } = useQuestionStore()

    const [formData, setFormData] = useState({
        subject_id: searchParams.get('subject_id') ? Number(searchParams.get('subject_id')) : 0
    })

    const [pendingQuestionIds, setPendingQuestionIds] = useState<number[]>([])

    const [questionsModalOpen, setQuestionsModalOpen] = useState(false)
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)

    const [currentPage, setCurrentPage] = useState(() =>
    {
        if (!entId && !isEditing) return 1
        if (!entId) return 1
        const saved = localStorage.getItem(getPaginationStorageKey(entId.toString()))
        if (saved)
        {
            try
            {
                const { page } = JSON.parse(saved)
                return page || 1
            } catch { return 1 }
        }
        return 1
    })

    const [pageSize, setPageSize] = useState(() =>
    {
        if (!entId && !isEditing) return 10
        if (!entId) return 10
        const saved = localStorage.getItem(getPaginationStorageKey(entId.toString()))
        if (saved)
        {
            try
            {
                const { pageSize } = JSON.parse(saved)
                return pageSize || 10
            } catch { return 10 }
        }
        return 10
    })

    useEffect(() =>
    {
        if (isEditing && entId)
        {
            const ent = getEntOptions().find(e => e.id === entId)
            if (ent)
                setFormData({
                    subject_id: ent.subject_id
                })
        }
    }, [isEditing, entId, getEntOptions])

    useEffect(() =>
    {
        if (isEditing && entId)
            fetchEntQuestions(entId)
    }, [isEditing, entId, fetchEntQuestions])

    useEffect(() =>
    {
        if (allQuestions.length === 0)
            fetchAllQuestions()
    }, [fetchAllQuestions, allQuestions.length])

    useEffect(() =>
    {
        if (entId)
            localStorage.setItem(
                getPaginationStorageKey(entId.toString()),
                JSON.stringify({ page: currentPage, pageSize })
            )
    }, [currentPage, pageSize, entId])

    const subjects = getSubjects()
    const subjectOptions = subjects.map(s => ({ value: s.id, label: s.name }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: name === 'subject_id' ? Number(value) : value }))
    }

    const handleSubmit = async (e: React.FormEvent) =>
    {
        e.preventDefault()
        if (formData.subject_id === 0)
        {
            toast.error('Выберите предмет')
            return
        }

        if (!isEditing && pendingQuestionIds.length === 0)
        {
            toast.error('Добавьте хотя бы один вопрос в вариант')
            return
        }

        try
        {
            if (isEditing && entId)
            {
                await updateEntOption(entId, formData)
                toast.success('Вариант ЕНТ обновлён')
            } else
            {
                const newEnt = await createEntOption(formData)
                if (pendingQuestionIds.length > 0)
                {
                    await entService.addQuestionsToEntOption(newEnt.id, pendingQuestionIds)
                    await fetchEntQuestions(newEnt.id)
                }
                toast.success(`Вариант создан и добавлено ${pendingQuestionIds.length} вопросов`)
                setPendingQuestionIds([])
                await refreshDashboard()
                navigate(`/ent-practice/options/${newEnt.id}`)
            }
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка сохранения')
        }
    }

    const currentQuestions = useMemo(() =>
    {
        if (isEditing && entId)
            return entQuestions[entId] || []
        else
            return allQuestions.filter(q => pendingQuestionIds.includes(q.id))
    }, [isEditing, entId, entQuestions, pendingQuestionIds, allQuestions])

    const { questionColumns } = useQuestionTable({
        topics: [],
        onView: (questionId) => navigate(`/questions/${questionId}`),
        onEdit: (questionId) => navigate(`/questions/${questionId}/edit`),
        onDelete: () => { }
    })

    const columns = useMemo(() =>
        questionColumns
            .filter(col => !['actions', 'topic'].includes(col.key))
            .map(col => ({
                header: col.title,
                accessor: col.key,
                width: col.width,
                render: col.render
            })),
        [questionColumns]
    )

    const totalRecords = currentQuestions.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedQuestions = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return currentQuestions.slice(start, start + pageSize)
    }, [currentQuestions, currentPage, pageSize])

    const handleViewQuestion = (questionId: number) => navigate(`/questions/${questionId}`)

    const handleRemoveQuestion = async (questionId: number) =>
    {
        if (isEditing && entId)
        {
            try
            {
                await entService.removeQuestionsFromEntOption(entId, [questionId])
                toast.success('Вопрос удалён из варианта')
                await fetchEntQuestions(entId)
            } catch (err)
            {
                toast.error('Ошибка удаления вопроса')
            }
        } else
            setPendingQuestionIds(prev => prev.filter(id => id !== questionId))
    }

    const actionsColumn = {
        header: 'Действия',
        accessor: 'id',
        width: '10%',
        render: (value: number) => (
            <div className="flex items-center space-x-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewQuestion(value)}
                    icon={<Eye className="h-4 w-4" />}
                    title="Просмотр"
                />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveQuestion(value)}
                    icon={<Trash2 className="h-4 w-4 text-red-500" />}
                    title="Удалить из варианта"
                />
            </div>
        )
    }

    const tableColumns = [...columns, actionsColumn]

    const handleSelectFromBase = (selectedQuestions: any[]) =>
    {
        if (!isEditing)
        {
            const newIds = selectedQuestions.map(q => q.id)
            setPendingQuestionIds(prev => [...new Set([...prev, ...newIds])])
        }
    }

    const handleImport = async (file: File, importType: string) =>
    {
        if (isEditing && entId)
        {
            const result = await entService.import?.(file, importType)
            if (result?.success && result.question_ids)
            {
                await entService.addQuestionsToEntOption(entId, result.question_ids)
                await fetchEntQuestions(entId)
                toast.success(`Импортировано и добавлено ${result.question_ids.length} вопросов`)
            }
            return result
        } else
        {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('import_type', importType)
            const result = await questionService.import(formData)
            if (result.success && result.question_ids)
            {
                setPendingQuestionIds(prev => [...new Set([...prev, ...result.question_ids])])
                toast.success(`Импортировано и добавлено ${result.question_ids.length} вопросов (будут привязаны после сохранения)`)
            }
            return result
        }
    }

    const handleCreateQuestion = async (questionData: any) =>
    {
        const newQuestion = await questionService.create(questionData)
        if (isEditing && entId)
        {
            await entService.addQuestionsToEntOption(entId, [newQuestion.id])
            toast.success('Вопрос создан и добавлен в вариант')
            await fetchEntQuestions(entId)
        } else
        {
            setPendingQuestionIds(prev => [...prev, newQuestion.id])
            toast.success('Вопрос создан и будет привязан после сохранения варианта')
        }
    }

    if (loading && isEditing && !currentQuestions.length)
        return (
            <DetailContent>
                <LoadingSpinner />
            </DetailContent>
        )

    return (
        <DetailContent>
            <DetailHeader
                title={isEditing ? 'Редактирование варианта ЕНТ' : 'Создание варианта ЕНТ'}
                onBack={() => navigate(-1)}
            />
            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Предмет *</label>
                        <select
                            name="subject_id"
                            value={formData.subject_id}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                            disabled={isEditing}
                        >
                            <option value={0}>Выберите предмет</option>
                            {subjectOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="border-t border-gray-200 pt-6 mt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Вопросы варианта</h3>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-600">
                                {isEditing
                                    ? 'Управление вопросами выбранного варианта'
                                    : 'Вы можете добавить вопросы сейчас, они будут привязаны после создания варианта'}
                            </p>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuestionsModalOpen(true)}
                                    icon={<Plus className="h-4 w-4" />}
                                >
                                    Добавить из базы
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setImportModalOpen(true)}
                                    icon={<FileSpreadsheet className="h-4 w-4" />}
                                >
                                    Импорт из Excel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCreateModalOpen(true)}
                                    icon={<Edit className="h-4 w-4" />}
                                >
                                    Новый вопрос
                                </Button>
                            </div>
                        </div>

                        {questionsLoading ? (
                            <div className="flex justify-center py-8">
                                <LoadingSpinner />
                            </div>
                        ) : currentQuestions.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                                В варианте пока нет вопросов
                            </div>
                        ) : (
                            <ListTable
                                data={paginatedQuestions}
                                columns={tableColumns}
                                loading={questionsLoading}
                                emptyMessage="Вопросы не найдены"
                                selectable={false}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                pageSize={pageSize}
                                onPageSizeChange={setPageSize}
                                totalRecords={totalRecords}
                            />
                        )}
                    </div>

                    <div className="flex justify-end space-x-3">
                        <Button variant="secondary" onClick={() => navigate(-1)}>Отмена</Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {isEditing ? 'Сохранить' : 'Создать вариант'}
                        </Button>
                    </div>
                </form>
            </div>

            {entId ? (
                <EntQuestionsModal
                    ent={{ id: entId, subject_id: formData.subject_id }}
                    isOpen={questionsModalOpen}
                    onClose={() => setQuestionsModalOpen(false)}
                    onQuestionsUpdate={() => fetchEntQuestions(entId)}
                />
            ) : (
                questionsModalOpen && (
                    <EntQuestionsModal
                        ent={{ subject_id: formData.subject_id }}
                        isOpen={questionsModalOpen}
                        onClose={() => setQuestionsModalOpen(false)}
                        onQuestionsUpdate={handleSelectFromBase}
                    />
                )
            )}

            <ImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImport}
                loading={questionsLoading}
            />

            <CreateQuestionModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSubmit={handleCreateQuestion}
                preselectedSubjectId={formData.subject_id}
                defaultType={QuestionType.ENT}
            />
        </DetailContent>
    )
}