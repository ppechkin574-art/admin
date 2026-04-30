import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { moduleService } from '@/services/api'
import { useSubjectStore } from '@/stores/subjectStore'
import { useModuleStore } from '@/stores/moduleStore'
import { DetailContent } from '@/components/details/DetailContent'
import { DetailHeader } from '@/components/details/DetailHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import Button from '@/components/common/Button'

interface ModuleFormData
{
    title: string
    description: string
    order_index: number
    is_active: boolean
    subject_id: number | null
}

export const ModuleForm: React.FC = () =>
{
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const isEditing = !!id

    const { subjects, fetchSubjects, loading: subjectsLoading } = useSubjectStore()
    const { refreshModules, invalidateCacheForSubject } = useModuleStore()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [maxOrder, setMaxOrder] = useState<number | null>(null)
    const [modulesLoading, setModulesLoading] = useState(false)

    const [formData, setFormData] = useState<ModuleFormData>({
        title: '',
        description: '',
        order_index: 1,
        is_active: true,
        subject_id: searchParams.get('subject_id') ? parseInt(searchParams.get('subject_id')!) : null
    })

    const loadModule = useCallback(async () =>
    {
        if (!id) return
        setLoading(true)
        setError(null)
        try
        {
            const moduleData = await moduleService.getById(parseInt(id))
            setFormData({
                title: moduleData.title || '',
                description: moduleData.description || '',
                order_index: moduleData.order_index || 1,
                is_active: moduleData.is_active ?? true,
                subject_id: moduleData.subject_id || null
            })
            if (moduleData.subject_id)
                await loadMaxOrder(moduleData.subject_id)
        } catch (err: any)
        {
            setError('Ошибка загрузки модуля')
            toast.error('Не удалось загрузить модуль')
        } finally
        {
            setLoading(false)
        }
    }, [id])

    const loadMaxOrder = useCallback(async (subjectId: number) =>
    {
        setModulesLoading(true)
        try
        {
            const modules = await moduleService.getBySubject(subjectId, { page_size: 1000 })
            const max = modules.reduce((max, m) => Math.max(max, m.order_index), 0)
            setMaxOrder(max)

            if (!isEditing)
                setFormData(prev => ({
                    ...prev,
                    order_index: max + 1
                }))
        } catch (error)
        {
            console.error('Ошибка загрузки модулей для расчета порядка:', error)
            toast.error('Не удалось загрузить информацию о порядке модулей')
        } finally
        {
            setModulesLoading(false)
        }
    }, [isEditing])

    useEffect(() =>
    {
        if (formData.subject_id && !isEditing)
            loadMaxOrder(formData.subject_id)
        else if (formData.subject_id && isEditing)
            loadMaxOrder(formData.subject_id)
    }, [formData.subject_id, isEditing, loadMaxOrder])

    useEffect(() =>
    {
        fetchSubjects()
    }, [fetchSubjects])

    useEffect(() =>
    {
        if (isEditing) loadModule()
    }, [isEditing, loadModule])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    {
        const { name, value, type } = e.target
        if (type === 'checkbox')
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
        else if (name === 'order_index' || name === 'subject_id')
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseInt(value) }))
        else
            setFormData(prev => ({ ...prev, [name]: value }))
    }

    const validate = () =>
    {
        if (!formData.title.trim())
        {
            toast.error('Введите название модуля')
            return false
        }
        if (!formData.subject_id)
        {
            toast.error('Выберите предмет')
            return false
        }
        if (formData.order_index < 1)
        {
            toast.error('Порядковый номер должен быть больше 0')
            return false
        }
        if (!isEditing && maxOrder !== null && formData.order_index > maxOrder + 1)
        {
            toast.error(`Порядковый номер не может быть больше ${maxOrder + 1}`)
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
                subject_id: formData.subject_id!
            }
            if (isEditing && id)
            {
                await moduleService.update(parseInt(id), submitData)
                toast.success('Модуль обновлён')
            } else
            {
                await moduleService.create(submitData)
                toast.success('Модуль создан')
            }

            await refreshModules()

            if (formData.subject_id)
            {
                invalidateCacheForSubject(formData.subject_id)
                navigate(`/modules/subject/${formData.subject_id}`)
            } else
            {
                navigate('/modules')
            }
        } catch (err: any)
        {
            toast.error(err.response?.data?.detail || 'Ошибка сохранения модуля')
        } finally
        {
            setSaving(false)
        }
    }

    const isLoading = loading || subjectsLoading || modulesLoading

    if (isLoading && isEditing)
        return (
            <DetailContent>
                <LoadingSpinner />
            </DetailContent>
        )

    if (error)
        return (
            <DetailContent>
                <ErrorState message={error} onRetry={loadModule} />
            </DetailContent>
        )

    return (
        <DetailContent>
            <DetailHeader
                title={isEditing ? 'Редактирование модуля' : 'Создание модуля'}
                onBack={() => navigate(-1)}
                showDelete={false}
                showEdit={false}
            />
            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Название модуля *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Предмет *
                            </label>
                            <select
                                name="subject_id"
                                value={formData.subject_id || ''}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                                disabled={isEditing}
                            >
                                <option value="">Выберите предмет</option>
                                {subjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Порядковый номер
                                {!isEditing && maxOrder !== null && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        (макс. {maxOrder + 1})
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                name="order_index"
                                value={formData.order_index}
                                onChange={handleChange}
                                min="1"
                                max={!isEditing && maxOrder !== null ? maxOrder + 1 : undefined}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            {!isEditing && maxOrder !== null && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Следующий доступный номер: {maxOrder + 1}
                                </p>
                            )}
                        </div>
                        <div className="col-span-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Активный модуль</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                Неактивные модули не отображаются для студентов.
                            </p>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Описание
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </form>
            </div>
        </DetailContent>
    )
}

export default ModuleForm