import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import
{
    ArrowLeft,
    BookOpen,
    Calendar,
    Edit,
    FileText,
    FileVideo,
    Hash,
    PlayCircle,
    Plus,
    Presentation,
    SendToBack,
    Trash2,
    Video,
    CheckCircle,
    XCircle,
} from 'lucide-react'

import Button from '@/components/common/Button'
import ConfirmModal from '@/components/common/ConfirmModal'
import { ListTable } from '@/components/lists/ListTable'
import { lessonService, moduleService } from '@/services/api'
import { useModuleStore } from '@/stores/moduleStore'
import { useSubjectStore } from '@/stores/subjectStore'
import { useTopicStore } from '@/stores/topicStore'
import { useTrainerStore } from '@/stores/trainerStore'
import { Topic, Trainer } from '@/types'
import { ModuleLesson, SubjectModule } from '../../types/modules'
import { LessonMediaModal } from './LessonMediaModal'
import { LessonOrderModal } from './LessonOrderModal'
import { LessonPublishModal } from './LessonPublishModal'
import { useResourceLoading } from '@/hooks/useResourceLoading'

interface LessonWithDetails extends ModuleLesson
{
    topic?: Topic
    trainer?: Trainer
}

const CLOUDFLARE_IFRAME_PREFIX = 'https://customer-udg2rk5bpm1tzy74.cloudflarestream.com/'

export const ModuleDetail: React.FC = () =>
{
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const moduleId = id ? parseInt(id) : undefined

    const {
        deleteModule,
        modules,
        lessonsByModuleId,
        loadingLessons,
        fetchModuleLessons,
        refreshModuleLessons,
    } = useModuleStore()

    const { getSubjectById } = useSubjectStore()
    const { getTopicById } = useTopicStore()
    const { trainers } = useTrainerStore()

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleteLessonConfirmOpen, setDeleteLessonConfirmOpen] = useState(false)
    const [lessonToDelete, setLessonToDelete] = useState<ModuleLesson | null>(null)
    const [lessonOrderModalOpen, setLessonOrderModalOpen] = useState(false)
    const [mediaModalOpen, setMediaModalOpen] = useState(false)
    const [publishModalOpen, setPublishModalOpen] = useState(false)
    const [selectedLesson, setSelectedLesson] = useState<LessonWithDetails | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const {
        resource: module,
        loading: moduleLoading,
        error: moduleError,
        refresh: refreshModule,
    } = useResourceLoading<SubjectModule>({
        id: moduleId,
        storeIdGetter: () => modules.find(m => m.id === moduleId!),
        apiFetcher: moduleService.getById,
        resourceName: 'модуль',
    })

    const rawLessons = moduleId ? lessonsByModuleId[moduleId] ?? [] : []
    const lessonsLoading = moduleId ? loadingLessons[moduleId] ?? false : false

    const lessons = useMemo<LessonWithDetails[]>(() =>
    {
        return rawLessons.map((lesson) =>
        {
            let topic: Topic | undefined
            let trainer: Trainer | undefined
            if (lesson.topic_id)
            {
                topic = getTopicById(lesson.topic_id)
                if (topic)
                {
                    const topicTrainers = trainers.filter((t) => t.topic_id === topic?.id)
                    if (topicTrainers.length > 0) trainer = topicTrainers[0]
                }
            }
            return { ...lesson, topic, trainer }
        })
    }, [rawLessons, getTopicById, trainers])

    useEffect(() =>
    {
        if (moduleId)
            fetchModuleLessons(moduleId)
    }, [moduleId, fetchModuleLessons])

    const handleDelete = useCallback(async () =>
    {
        if (!moduleId || !module) return
        try
        {
            await deleteModule(moduleId)
            toast.success('Модуль успешно удалён')
            navigate('/modules')
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка удаления модуля')
        }
    }, [moduleId, module, deleteModule, navigate])

    const handleDeleteLesson = useCallback(async () =>
    {
        if (!lessonToDelete || !moduleId) return
        try
        {
            await lessonService.delete(lessonToDelete.id)
            toast.success('Урок успешно удалён')
            await refreshModuleLessons(moduleId)
            setDeleteLessonConfirmOpen(false)
            setLessonToDelete(null)
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка удаления урока')
        }
    }, [lessonToDelete, moduleId, refreshModuleLessons])

    const handleOpenOrderModal = useCallback(() => setLessonOrderModalOpen(true), [])
    const handleOpenMediaModal = useCallback((lesson: LessonWithDetails) =>
    {
        setSelectedLesson(lesson)
        setMediaModalOpen(true)
    }, [])
    const handleOpenPublishModal = useCallback((lesson: LessonWithDetails) =>
    {
        setSelectedLesson(lesson)
        setPublishModalOpen(true)
    }, [])

    const handleMediaUpdated = useCallback(async () =>
    {
        if (!moduleId) return
        await refreshModuleLessons(moduleId)
        toast.success('Медиа-файлы обновлены')
    }, [moduleId, refreshModuleLessons])

    const handlePublishStatusChanged = useCallback(async () =>
    {
        if (!moduleId) return
        await refreshModuleLessons(moduleId)
    }, [moduleId, refreshModuleLessons])

    const handleOrderUpdated = useCallback(async () =>
    {
        if (!moduleId) return
        await refreshModuleLessons(moduleId)
        toast.success('Порядок уроков обновлён')
    }, [moduleId, refreshModuleLessons])

    const handleEditModule = useCallback(() => navigate(`/modules/${moduleId}/edit`), [moduleId, navigate])
    const handleAddLesson = useCallback(() => navigate(`/modules/${moduleId}/lessons/create`), [moduleId, navigate])
    const handleEditLesson = useCallback((lessonId: number) => navigate(`/modules/${moduleId}/lessons/${lessonId}/edit`), [moduleId, navigate])
    const handleViewTopic = useCallback((topicId: number) => navigate(`/topics/${topicId}`), [navigate])
    const handleViewTrainer = useCallback((trainerId: number) => navigate(`/trainers/${trainerId}`), [navigate])
    const handleViewSubject = useCallback(() => module && navigate(`/subjects/${module.subject_id}`), [module, navigate])

    const moduleStats = useMemo(() =>
    {
        if (!module) return []
        return [
            {
                label: 'Предмет',
                value: getSubjectById(module.subject_id)?.name || 'Неизвестный предмет',
                icon: <BookOpen className="h-4 w-4 text-gray-400" />,
                onClick: handleViewSubject,
            },
            {
                label: 'Порядковый номер',
                value: module.order_index.toString(),
                icon: <Hash className="h-4 w-4 text-gray-400" />,
            },
            {
                label: 'Уроков',
                value: lessons.length,
                icon: <FileText className="h-4 w-4" />,
            },
            {
                label: 'Дата создания',
                value: module.created_at ? new Date(module.created_at).toLocaleDateString('ru-RU') : '—',
                icon: <Calendar className="h-4 w-4 text-gray-400" />,
            },
        ]
    }, [module, lessons, getSubjectById, handleViewSubject])

    const totalRecords = lessons.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedLessons = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return [...lessons]
            .sort((a, b) => (a.order_index || 1) - (b.order_index || 1))
            .slice(start, start + pageSize)
    }, [lessons, currentPage, pageSize])

    const handlePageChange = useCallback((page: number) => setCurrentPage(page), [])
    const handlePageSizeChange = useCallback((size: number) =>
    {
        setPageSize(size)
        setCurrentPage(1)
    }, [])

    const columns = useMemo(
        () => [
            {
                header: '№',
                accessor: 'order_index',
                width: '5%',
                render: (value: number) => <span className="font-medium">{value}</span>,
            },
            {
                header: 'Название',
                accessor: 'title',
                width: '30%',
                render: (value: string, lesson: LessonWithDetails) => (
                    <button
                        onClick={() => handleEditLesson(lesson.id)}
                        className="text-left hover:text-blue-600 hover:underline"
                    >
                        {value}
                    </button>
                ),
            },
            {
                header: 'Тема / Тренажёр',
                accessor: 'topic',
                width: '20%',
                render: (_: any, lesson: LessonWithDetails) => (
                    <div className="flex items-center space-x-2">
                        {lesson.topic ? (
                            <>
                                <button
                                    onClick={() => handleViewTopic(lesson.topic!.id)}
                                    className="text-sm text-gray-700 hover:text-blue-600 hover:underline"
                                >
                                    {lesson.topic.name}
                                </button>
                                {lesson.trainer && (
                                    <button
                                        onClick={() => handleViewTrainer(lesson.trainer!.id)}
                                        className="text-xs text-gray-500 hover:text-blue-600"
                                        title="Тренажёр"
                                    >
                                        <PlayCircle className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <span className="text-gray-400">—</span>
                        )}
                    </div>
                ),
            },
            {
                header: 'Медиа',
                accessor: 'media',
                width: '10%',
                render: (_: any, lesson: LessonWithDetails) => (
                    <div className="flex items-center space-x-2">
                        {lesson.video_url ? (
                            <Video className="h-4 w-4 text-blue-500" title="Видео есть" />
                        ) : (
                            <Video className="h-4 w-4 text-gray-300" title="Видео нет" />
                        )}
                        {lesson.presentation_url ? (
                            <Presentation className="h-4 w-4 text-green-500" title="Презентация есть" />
                        ) : (
                            <Presentation className="h-4 w-4 text-gray-300" title="Презентации нет" />
                        )}
                    </div>
                ),
            },
            {
                header: 'Статус',
                accessor: 'is_published',
                width: '10%',
                render: (value: boolean, lesson: LessonWithDetails) => (
                    <button
                        onClick={() => handleOpenPublishModal(lesson)}
                        className="flex items-center space-x-1 hover:opacity-80"
                        title="Изменить статус"
                    >
                        {value ? (
                            <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-green-600">Опубликован</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500">Черновик</span>
                            </>
                        )}
                    </button>
                ),
            },
            {
                header: 'Действия',
                accessor: 'actions',
                width: '25%',
                render: (_: any, lesson: LessonWithDetails) => (
                    <div className="flex items-center justify-start space-x-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenMediaModal(lesson)}
                            icon={<FileVideo className="h-4 w-4" />}
                            title="Управление медиа"
                        >
                            Медиа
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLesson(lesson.id)}
                            icon={<Edit className="h-4 w-4" />}
                            title="Редактировать урок"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                            {
                                setLessonToDelete(lesson)
                                setDeleteLessonConfirmOpen(true)
                            }}
                            icon={<Trash2 className="h-4 w-4" />}
                            title="Удалить урок"
                        />
                    </div>
                ),
            },
        ],
        [handleEditLesson, handleViewTopic, handleViewTrainer, handleOpenMediaModal, handleOpenPublishModal]
    )

    const loading = moduleLoading || lessonsLoading

    if (moduleError || (!module && !loading))
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                    <div className="text-red-500 mb-4">{moduleError || 'Модуль не найден'}</div>
                    <Button variant="secondary" onClick={refreshModule}>
                        Попробовать снова
                    </Button>
                </div>
            </div>
        )

    if (loading && !module)
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Загрузка модуля...</p>
                </div>
            </div>
        )

    if (!module) return null

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => navigate(-1)}
                                icon={<ArrowLeft className="h-4 w-4" />}
                                size="sm"
                            >
                                Назад
                            </Button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">{module.title}</h1>
                                {module.description && <p className="text-gray-600 mt-1">{module.description}</p>}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmOpen(true)}
                                icon={<Trash2 className="h-4 w-4" />}
                            >
                                Удалить
                            </Button>
                            <Button variant="primary" onClick={handleEditModule} icon={<Edit className="h-4 w-4" />}>
                                Редактировать
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-4 gap-4">
                        {moduleStats.map((stat, index) => (
                            <div key={index} className="flex items-center space-x-3">
                                <div className="flex-shrink-0">{stat.icon}</div>
                                <div>
                                    <div className="text-sm text-gray-500">{stat.label}</div>
                                    {stat.onClick ? (
                                        <button
                                            onClick={stat.onClick}
                                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors"
                                        >
                                            {stat.value}
                                        </button>
                                    ) : (
                                        <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Уроки модуля</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {lessons.length} уроков, отсортированных по порядку изучения
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                onClick={handleOpenOrderModal}
                                icon={<SendToBack className="h-4 w-4" />}
                                size="sm"
                                disabled={lessons.length === 0}
                            >
                                Порядок
                            </Button>
                            <Button variant="primary" onClick={handleAddLesson} icon={<Plus className="h-4 w-4" />} size="sm">
                                Добавить урок
                            </Button>
                        </div>
                    </div>
                </div>

                {lessons.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-gray-400 mb-4">
                            <BookOpen className="h-12 w-12 mx-auto" />
                        </div>
                        <h3 className="text-gray-900 font-medium mb-2">Уроки не найдены</h3>
                        <p className="text-gray-500 mb-6">Добавьте первый урок в этот модуль</p>
                        <Button variant="primary" onClick={handleAddLesson} icon={<Plus className="h-4 w-4" />}>
                            Добавить урок
                        </Button>
                    </div>
                ) : (
                    <ListTable
                        data={paginatedLessons}
                        columns={columns}
                        loading={lessonsLoading}
                        emptyMessage="Уроки не найдены"
                        selectable={false}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        totalRecords={totalRecords}
                    />
                )}
            </div>

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Удаление модуля"
                message={`Вы уверены, что хотите удалить модуль "${module.title}"? Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                type="danger"
            />

            <ConfirmModal
                isOpen={deleteLessonConfirmOpen}
                onClose={() =>
                {
                    setDeleteLessonConfirmOpen(false)
                    setLessonToDelete(null)
                }}
                onConfirm={handleDeleteLesson}
                title="Удаление урока"
                message={`Вы уверены, что хотите удалить урок "${lessonToDelete?.title}"? Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                type="danger"
            />

            {lessonOrderModalOpen && (
                <LessonOrderModal
                    isOpen={lessonOrderModalOpen}
                    onClose={() => setLessonOrderModalOpen(false)}
                    lessons={lessons}
                    moduleId={moduleId!}
                    onOrderUpdated={handleOrderUpdated}
                />
            )}

            {mediaModalOpen && selectedLesson && (
                <LessonMediaModal
                    isOpen={mediaModalOpen}
                    onClose={() =>
                    {
                        setMediaModalOpen(false)
                        setSelectedLesson(null)
                    }}
                    lesson={selectedLesson}
                    onMediaUpdated={handleMediaUpdated}
                />
            )}

            {publishModalOpen && selectedLesson && (
                <LessonPublishModal
                    isOpen={publishModalOpen}
                    onClose={() =>
                    {
                        setPublishModalOpen(false)
                        setSelectedLesson(null)
                    }}
                    lesson={selectedLesson}
                    onPublishStatusChanged={handlePublishStatusChanged}
                />
            )}
        </div>
    )
}

export default ModuleDetail