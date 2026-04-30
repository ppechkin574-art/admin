import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { lessonService, questionService } from '@/services/api'
import { useSubjectStore } from '@/stores/subjectStore'
import { useTopicStore } from '@/stores/topicStore'
import { useTrainerStore } from '@/stores/trainerStore'
import { useModuleStore } from '@/stores/moduleStore'
import { useQuestionStore } from '@/stores/questionStore'
import { DetailContent } from '@/components/details/DetailContent'
import { DetailHeader } from '@/components/details/DetailHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import Button from '@/components/common/Button'
import CloudflareUploader from '@/components/common/CloudflareUploader'
import { ListTable } from '@/components/lists/ListTable'
import { Hash, Plus, FileSpreadsheet, Edit, Trash2, Eye } from 'lucide-react'
import { LessonQuestionsModal } from '@/pages/modules/LessonQuestionsModal'
import { ImportModal } from '@/pages/questions/import/ImportModal'
import { CreateQuestionModal } from '@/pages/modules/CreateQuestionModal'
import { ModuleLesson } from '@/types/modules'
import { QuestionType } from '@/types/enums'

const CLOUDFLARE_IFRAME_PREFIX = "https://customer-udg2rk5bpm1tzy74.cloudflarestream.com/"

export const LessonFormPage: React.FC = () =>
{
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>()
    const navigate = useNavigate()
    const isEditing = !!lessonId
    const getPaginationStorageKey = (lessonId: string) => `lesson-pagination-${lessonId}`;

    const { subjects } = useSubjectStore()
    const { topics, fetchTopics, getTopicsBySubject } = useTopicStore()
    const { fetchTrainer, trainersById, addQuestionToTrainer, removeQuestionFromTrainer } = useTrainerStore()
    const {
        fetchModuleById,
        modulesById,
        lessonsByModuleId,
        setLesson,
        fetchModuleLessons,
    } = useModuleStore()

    const { allQuestions } = useQuestionStore();

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [module, setModule] = useState<any>(null)
    const [filteredTopics, setFilteredTopics] = useState<any[]>([])
    const [currentPage, setCurrentPage] = useState(() =>
    {
        if (!lessonId) return 1;
        const saved = localStorage.getItem(getPaginationStorageKey(lessonId));
        if (saved)
        {
            try
            {
                const { page } = JSON.parse(saved);
                return page || 1;
            } catch
            {
                return 1;
            }
        }
        return 1;
    });

    const [pageSize, setPageSize] = useState(() =>
    {
        if (!lessonId) return 10;
        const saved = localStorage.getItem(getPaginationStorageKey(lessonId));
        if (saved)
        {
            try
            {
                const { pageSize } = JSON.parse(saved);
                return pageSize || 10;
            } catch
            {
                return 10;
            }
        }
        return 10;
    });

    const [questionsModalOpen, setQuestionsModalOpen] = useState(false)
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        video_url: '',
        presentation_url: '',
        order_index: 1,
        difficulty: '',
        is_published: false,
        module_id: moduleId ? parseInt(moduleId) : null,
        topic_id: null as number | null
    })

    useEffect(() =>
    {
        const loadModule = async () =>
        {
            const id = moduleId ? parseInt(moduleId) : formData.module_id
            if (!id) return
            try
            {
                let mod = modulesById[id]?.data
                if (!mod)
                    mod = await fetchModuleById(id)
                setModule(mod)
                await fetchModuleLessons(id)
            } catch (err)
            {
                console.error('Error loading module:', err)
            }
        }
        loadModule()
    }, [moduleId, formData.module_id, modulesById, fetchModuleById, fetchModuleLessons])

    useEffect(() =>
    {
        if (lessonId)
            localStorage.setItem(
                getPaginationStorageKey(lessonId),
                JSON.stringify({ page: currentPage, pageSize })
            );
    }, [currentPage, pageSize, lessonId]);

    const loadLesson = useCallback(async () =>
    {
        if (!lessonId || !moduleId) return

        const lessonIdNum = parseInt(lessonId)
        const moduleIdNum = parseInt(moduleId)

        const cachedLessons = lessonsByModuleId[moduleIdNum] || []
        const cachedLesson = cachedLessons.find(l => l.id === lessonIdNum)

        if (cachedLesson)
        {
            setFormData({
                title: cachedLesson.title || '',
                description: cachedLesson.description || '',
                video_url: cachedLesson.video_url || '',
                presentation_url: cachedLesson.presentation_url || '',
                order_index: cachedLesson.order_index || 1,
                difficulty: cachedLesson.difficulty || '',
                is_published: cachedLesson.is_published || false,
                module_id: cachedLesson.module_id || null,
                topic_id: cachedLesson.topic_id || null
            })
            return
        }

        setLoading(true)
        setError(null)
        try
        {
            const lessonData = await lessonService.getById(lessonIdNum)
            setFormData({
                title: lessonData.title || '',
                description: lessonData.description || '',
                video_url: lessonData.video_url || '',
                presentation_url: lessonData.presentation_url || '',
                order_index: lessonData.order_index || 1,
                difficulty: lessonData.difficulty || '',
                is_published: lessonData.is_published || false,
                module_id: lessonData.module_id || null,
                topic_id: lessonData.topic_id || null
            })
            setLesson(moduleIdNum, lessonData)
        } catch (err)
        {
            setError('Ошибка загрузки урока')
            toast.error('Не удалось загрузить урок')
        } finally
        {
            setLoading(false)
        }
    }, [lessonId, moduleId, lessonsByModuleId, setLesson])

    useEffect(() =>
    {
        fetchTopics()
    }, [fetchTopics])

    useEffect(() =>
    {
        if (module && topics.length)
            setFilteredTopics(getTopicsBySubject(module.subject_id))
    }, [module, topics, getTopicsBySubject])

    const moduleLessons = moduleId ? lessonsByModuleId[parseInt(moduleId)] || [] : []
    const maxOrder = useMemo(() =>
    {
        if (moduleLessons.length === 0) return 0
        return Math.max(...moduleLessons.map(l => l.order_index))
    }, [moduleLessons])

    useEffect(() =>
    {
        if (!isEditing && module && maxOrder > 0)
        {
            setFormData(prev => ({
                ...prev,
                order_index: maxOrder + 1
            }))
        }
    }, [isEditing, module, maxOrder])

    const usedTopicIds = useMemo(() =>
    {
        if (!moduleLessons.length) return new Set<number>()
        const ids = moduleLessons
            .filter(l => l.id !== (lessonId ? parseInt(lessonId) : -1))
            .map(l => l.topic_id)
            .filter(id => id !== null) as number[]
        return new Set(ids)
    }, [moduleLessons, lessonId])

    const trainerId = formData.topic_id
    const trainer = trainerId ? trainersById[trainerId] : null
    const trainerQuestions = useMemo(() =>
    {
        if (!trainer?.questions) return [];
        return trainer.questions.map(q =>
        {
            const questionId = typeof q === 'object' ? q.id : q;
            const fullQuestion = allQuestions.find(qq => qq.id === questionId);
            return fullQuestion || (typeof q === 'object' ? q : { id: questionId });
        });
    }, [trainer, allQuestions]);
    const questionsLoading = trainerId ? !trainersById[trainerId] : false

    useEffect(() =>
    {
        if (trainerId && !trainersById[trainerId])
            fetchTrainer(trainerId)
    }, [trainerId, trainersById, fetchTrainer])

    useEffect(() =>
    {
        if (isEditing) loadLesson()
    }, [isEditing, loadLesson])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    {
        const { name, value, type } = e.target
        if (type === 'checkbox')
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
        else if (name === 'order_index' || name === 'topic_id')
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseInt(value) }))
        else
            setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleVideoUploaded = (videoId: string) =>
    {
        setFormData(prev => ({ ...prev, video_url: videoId }))
        toast.success('Видео загружено')
    }

    const handlePresentationUploaded = (presId: string) =>
    {
        setFormData(prev => ({ ...prev, presentation_url: presId }))
        toast.success('Презентация загружена')
    }

    const validate = () =>
    {
        if (!formData.title.trim())
        {
            toast.error('Введите название урока')
            return false
        }
        if (!formData.module_id)
        {
            toast.error('Модуль не указан')
            return false
        }
        if (formData.order_index < 1)
        {
            toast.error('Порядковый номер должен быть больше 0')
            return false
        }
        if (formData.topic_id && usedTopicIds.has(formData.topic_id))
        {
            toast.error('Эта тема уже используется в другом уроке данного модуля')
            return false
        }
        return true
    }

    const handleSubmit = async (e: React.FormEvent) =>
    {
        e.preventDefault()
        if (!validate()) return
        setSaving(true)
        try
        {
            const submitData = {
                ...formData,
                module_id: formData.module_id!,
                difficulty: formData.difficulty || null,
            }
            let savedLesson: ModuleLesson
            if (isEditing && lessonId)
            {
                savedLesson = await lessonService.update(parseInt(lessonId), submitData)
                toast.success('Урок обновлён')
            } else
            {
                savedLesson = await lessonService.create(submitData)
                toast.success('Урок создан')
            }

            if (moduleId)
                setLesson(parseInt(moduleId), savedLesson)

            navigate(moduleId ? `/modules/${moduleId}` : '/modules')
        } catch (err: any)
        {
            toast.error(err.response?.data?.detail || 'Ошибка сохранения урока')
        } finally
        {
            setSaving(false)
        }
    }

    const getCloudflareUrl = (id: string) => id ? `${CLOUDFLARE_IFRAME_PREFIX}${id}/iframe` : null

    const handleRemoveQuestion = async (questionId: number) =>
    {
        if (!trainer) return
        try
        {
            await removeQuestionFromTrainer(trainer.id, questionId)
            toast.success('Вопрос удалён из тренажёра')
        } catch (err)
        {
            toast.error('Ошибка удаления вопроса')
        }
    }

    const handleViewQuestion = (questionId: number) =>
    {
        navigate(`/questions/${questionId}`)
    }

    const questionColumns = [
        {
            header: 'ID',
            accessor: 'id',
            width: '10%',
            render: (value: number) => `#${value}`
        },
        {
            header: 'Содержание',
            accessor: 'blocks',
            width: '50%',
            render: (value: any[]) =>
            {
                const textBlock = value?.find(block => block.type === 'text')
                return (
                    <span className="text-gray-800 truncate max-w-xs block">
                        {textBlock?.value || 'Без текста'}
                    </span>
                )
            }
        },
        {
            header: 'Тип',
            accessor: 'type',
            width: '15%',
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'single_choice' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {value === 'single_choice' ? 'Одиночный' : 'Множественный'}
                </span>
            )
        },
        {
            header: 'Сложность',
            accessor: 'difficulty',
            width: '15%',
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'easy' ? 'bg-green-100 text-green-800' :
                    value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {value === 'easy' ? 'Легкий' :
                        value === 'medium' ? 'Средний' : 'Сложный'}
                </span>
            )
        },
        {
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
                        title="Удалить из тренажёра"
                    />
                </div>
            )
        }
    ]

    const totalRecords = trainerQuestions.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedQuestions = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return trainerQuestions.slice(start, start + pageSize)
    }, [trainerQuestions, currentPage, pageSize])

    if (loading)
        return (
            <DetailContent>
                <LoadingSpinner />
            </DetailContent>
        )

    if (error)
        return (
            <DetailContent>
                <ErrorState message={error} onRetry={loadLesson} />
            </DetailContent>
        )

    return (
        <DetailContent>
            <DetailHeader
                title={isEditing ? 'Редактирование урока' : 'Создание урока'}
                showDelete={false}
                showEdit={false}
                onBack={() => navigate(-1)}
            />
            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Название урока *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        {module && (
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Модуль</label>
                                <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                                    <span className="font-medium">{module.title}</span>
                                    <p className="text-xs text-gray-500">
                                        Предмет: {subjects.find(s => s.id === module.subject_id)?.name}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Тема (опционально)</label>
                            <select
                                name="topic_id"
                                value={formData.topic_id || ''}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">Выберите тему</option>
                                {filteredTopics.map(topic =>
                                {
                                    const isUsed = usedTopicIds.has(topic.id);
                                    return (
                                        <option
                                            key={topic.id}
                                            value={topic.id}
                                            disabled={isUsed}
                                        >
                                            {topic.name} {isUsed ? '(уже используется)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Порядковый номер
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    name="order_index"
                                    value={formData.order_index}
                                    onChange={handleChange}
                                    min="1"
                                    className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md"
                                    disabled
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Сложность</label>
                            <select
                                name="difficulty"
                                value={formData.difficulty}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">Не указана</option>
                                <option value="easy">Лёгкий</option>
                                <option value="medium">Средний</option>
                                <option value="hard">Сложный</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="is_published"
                                    checked={formData.is_published}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Опубликован</span>
                            </label>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Контент урока</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex justify-around">
                                <div className="flex flex-col justify-between items-center">
                                    <label className="block text-sm font-medium text-gray-700">Видео урока</label>
                                    <CloudflareUploader
                                        onUploaded={handleVideoUploaded}
                                        accept="video/*"
                                        buttonText="Загрузить видео"
                                        buttonVariant="outline"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="flex flex-col justify-between items-center">
                                    <label className="block text-sm font-medium text-gray-700">Презентация</label>
                                    <CloudflareUploader
                                        onUploaded={handlePresentationUploaded}
                                        accept=".pdf,.ppt,.pptx,.key"
                                        buttonText="Загрузить презентацию"
                                        buttonVariant="outline"
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Описание урока</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={8}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Подробное описание урока..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={() => navigate(-1)}>Отмена</Button>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </form>
            </div>

            {isEditing && (
                <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Вопросы тренажёра</h3>
                        {trainer ? (
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
                        ) : (
                            <p className="text-sm text-gray-500">Для управления вопросами выберите тему</p>
                        )}
                    </div>

                    {questionsLoading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    ) : trainer && trainerQuestions.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                            В тренажёре пока нет вопросов
                        </div>
                    ) : trainer ? (
                        <ListTable
                            data={paginatedQuestions}
                            columns={questionColumns}
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
                    ) : null}
                </div>
            )}

            {questionsModalOpen && trainer && module && (
                <LessonQuestionsModal
                    trainerId={trainer.id}
                    subjectId={module.subject_id}
                    topicId={formData.topic_id!}
                    isOpen={questionsModalOpen}
                    onClose={() => setQuestionsModalOpen(false)}
                    onQuestionsUpdate={() =>
                    {
                        fetchTrainer(trainer.id)
                    }}
                />
            )}

            {importModalOpen && trainer && (
                <ImportModal
                    isOpen={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    onImport={async (file, importType) =>
                    {
                        const result = await questionService.import(file, importType)
                        if (result.success && result.question_ids)
                        {
                            for (const qid of result.question_ids)
                                await addQuestionToTrainer(trainer.id, qid)
                            toast.success(`Импортировано и добавлено ${result.question_ids.length} вопросов`)
                            await fetchTrainer(trainer.id)
                        }
                        return result
                    }}
                />
            )}

            {createModalOpen && trainer && module && (
                <CreateQuestionModal
                    isOpen={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSubmit={async (questionData) =>
                    {
                        const newQuestion = await questionService.create(questionData)
                        await addQuestionToTrainer(trainer.id, newQuestion.id)
                        toast.success('Вопрос создан и добавлен в тренажёр')
                        await fetchTrainer(trainer.id)
                        setCreateModalOpen(false)
                    }}
                    preselectedSubjectId={module.subject_id}
                    preselectedTopicId={formData.topic_id!}
                    defaultType={QuestionType.SINGLE_CHOICE}
                />
            )}
        </DetailContent>
    )
}

export default LessonFormPage