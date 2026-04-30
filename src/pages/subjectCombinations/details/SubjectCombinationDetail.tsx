// frontend/src/pages/subjectCombinations/details/SubjectCombinationDetail.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BookOpen, Link as LinkIcon, Hash, AlertCircle } from 'lucide-react'

import { useSubjectCombinationStore } from '@/stores/subjectCombinationStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import ConfirmModal from '@/components/common/ConfirmModal'

import { DetailHeader } from '@/components/details/DetailHeader'
import { DetailStats } from '@/components/details/DetailStats'
import { DetailInfoCard } from '@/components/details/DetailInfoCard'
import { DetailActions } from '@/components/details/DetailActions'
import { DetailContent } from '@/components/details/DetailContent'
import Button from '@/components/common/Button'

export const SubjectCombinationDetail: React.FC = () =>
{
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const combinationId = Number(id)

    const {
        combinations,
        deleteCombination,
        fetchCombinations
    } = useSubjectCombinationStore()

    const {
        getSubjectById,
        getSubjects,
        loading: dashboardLoading,
        error: dashboardError,
        refreshDashboard
    } = useDashboardStore()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

    // Находим связку в сторе
    const combination = combinations.find(c => c.id === combinationId)

    // Загружаем связку если нет в сторе
    useEffect(() =>
    {
        const loadCombination = async () =>
        {
            if (!combinationId) return

            setLoading(true)
            setError(null)

            try
            {
                // Если связки нет в сторе, загружаем список
                if (!combination)
                {
                    await fetchCombinations()
                }

                // После загрузки, если все еще нет - ошибка
                const updatedCombinations = useSubjectCombinationStore.getState().combinations
                const foundCombination = updatedCombinations.find(c => c.id === combinationId)

                if (!foundCombination)
                {
                    throw new Error('Связка предметов не найдена')
                }

            } catch (err: any)
            {
                console.error('Error loading combination:', err)
                setError(err.message || 'Ошибка загрузки связки предметов')
            } finally
            {
                setLoading(false)
            }
        }

        loadCombination()
    }, [combinationId, combination, fetchCombinations])

    // Получаем названия предметов
    const getSubjectName = useCallback((subjectId: number) =>
    {
        const subjects = getSubjects()
        const subject = subjects.find(s => s.id === subjectId)
        return subject?.name || `Предмет #${subjectId}`
    }, [getSubjects])

    const handleEdit = useCallback(() =>
    {
        if (combination)
        {
            navigate(`/subject-combinations/${combination.id}/edit`)
        }
    }, [combination, navigate])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!combination) return

        try
        {
            await deleteCombination(combination.id)
            toast.success(`Связка "${combination.name}" успешно удалена`)
            navigate('/subject-combinations')
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка при удалении связки')
        }
    }, [combination, deleteCombination, navigate])

    const handleRefresh = useCallback(async () =>
    {
        setLoading(true)
        try
        {
            await refreshDashboard()
            await fetchCombinations()
            toast.success('Данные обновлены')
        } catch (error: any)
        {
            toast.error('Ошибка обновления данных')
        } finally
        {
            setLoading(false)
        }
    }, [refreshDashboard, fetchCombinations])

    const isLoading = loading || dashboardLoading

    if (isLoading && !combination)
    {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner message="Загрузка связки предметов..." />
            </div>
        )
    }

    if (error || dashboardError || !combination)
    {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <ErrorState
                    message={error || dashboardError || "Связка предметов не найдена"}
                    onRetry={handleRefresh}
                    actionText="Попробовать снова"
                />
            </div>
        )
    }

    // Получаем названия предметов
    const subject1Name = combination.specialized_subject_1_name || getSubjectName(combination.specialized_subject_1_id)
    const subject2Name = combination.specialized_subject_2_name || getSubjectName(combination.specialized_subject_2_id)
    const subject3Name = combination.third_subject_id
        ? (combination.third_subject_name || getSubjectName(combination.third_subject_id))
        : null

    return (
        <DetailContent>
            <DetailHeader
                title={combination.name}
                badges={[
                    { text: 'Связка предметов', type: 'primary' },
                    { text: `ID: #${combination.id}`, type: 'secondary' }
                ]}
                onBack={() => navigate(-1)}
                onEdit={handleEdit}
                onDelete={() => setDeleteConfirmOpen(true)}
                onRefresh={handleRefresh}
                showRefresh={true}
                loading={isLoading}
            />

            <DetailStats
                stats={[
                    {
                        label: "Профильных предметов",
                        value: combination.third_subject_id ? '3' : '2',
                        icon: BookOpen
                    },
                    {
                        label: "ID связки",
                        value: `#${combination.id}`,
                        icon: Hash
                    }
                ]}
                columns={2}
                loading={isLoading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Левая колонка */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <DetailInfoCard
                            title="Основная информация"
                            icon={LinkIcon}
                            items={[
                                {
                                    label: "Название",
                                    value: combination.name,
                                    icon: LinkIcon
                                },
                                {
                                    label: "ID связки",
                                    value: `#${combination.id}`,
                                    icon: Hash
                                },
                                {
                                    label: "Дата создания",
                                    value: combination.created_at ? new Date(combination.created_at).toLocaleDateString('ru-RU') : '—',
                                    icon: BookOpen
                                },
                                {
                                    label: "Последнее обновление",
                                    value: combination.updated_at ? new Date(combination.updated_at).toLocaleDateString('ru-RU') : '—',
                                    icon: BookOpen
                                }
                            ]}
                        />

                        <DetailInfoCard
                            title="Профильные предметы"
                            icon={BookOpen}
                            items={[
                                {
                                    label: "Первый профильный предмет",
                                    value: subject1Name,
                                    icon: BookOpen,
                                    onClick: () => navigate(`/subjects/${combination.specialized_subject_1_id}`)
                                },
                                {
                                    label: "Второй профильный предмет",
                                    value: subject2Name,
                                    icon: BookOpen,
                                    onClick: () => navigate(`/subjects/${combination.specialized_subject_2_id}`)
                                },
                                ...(subject3Name ? [{
                                    label: "Дополнительный предмет",
                                    value: subject3Name,
                                    icon: BookOpen,
                                    onClick: () => navigate(`/subjects/${combination.third_subject_id}`)
                                }] : [])
                            ]}
                        />
                    </div>

                    {/* Описание */}
                    {combination.description && (
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <BookOpen className="h-5 w-5 text-gray-400" />
                                    <h3 className="text-lg font-medium text-gray-900">Описание</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-700 whitespace-pre-line">
                                    {combination.description}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Правая колонка */}
                <div className="lg:col-span-1 space-y-6">
                    <DetailActions
                        title="Быстрые действия"
                        actions={[
                            {
                                label: 'Редактировать связку',
                                onClick: handleEdit,
                                icon: BookOpen,
                                variant: 'outline'
                            },
                            {
                                label: 'Перейти к первому предмету',
                                onClick: () => navigate(`/subjects/${combination.specialized_subject_1_id}`),
                                icon: BookOpen,
                                variant: 'outline'
                            },
                            {
                                label: 'Перейти ко второму предмету',
                                onClick: () => navigate(`/subjects/${combination.specialized_subject_2_id}`),
                                icon: BookOpen,
                                variant: 'outline'
                            },
                            ...(combination.third_subject_id ? [{
                                label: 'Перейти к дополнительному предмету',
                                onClick: () => navigate(`/subjects/${combination.third_subject_id}`),
                                icon: BookOpen,
                                variant: 'outline'
                            }] : [])
                        ]}
                        loading={isLoading}
                    />

                    {/* Информация о предметах */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                                Связанные предметы
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm font-medium">Первый профильный</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/subjects/${combination.specialized_subject_1_id}`)}
                                    >
                                        {subject1Name}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm font-medium">Второй профильный</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/subjects/${combination.specialized_subject_2_id}`)}
                                    >
                                        {subject2Name}
                                    </Button>
                                </div>
                                {subject3Name && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <BookOpen className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm font-medium">Дополнительный</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/subjects/${combination.third_subject_id}`)}
                                        >
                                            {subject3Name}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Удаление связки предметов"
                message={`Вы уверены, что хотите удалить связку "${combination.name}"? Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                type="danger"
            />
        </DetailContent>
    )
}