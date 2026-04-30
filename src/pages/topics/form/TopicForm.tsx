import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useTopicStore } from '@/stores/topicStore'
import toast from 'react-hot-toast'
import { DetailContent } from '@/components/details/DetailContent'
import { DetailHeader } from '@/components/details/DetailHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'

export const TopicForm: React.FC = () =>
{
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const topicId = id ? Number(id) : undefined
    const isEditing = !!topicId

    const { getTopics, getSubjects } = useDashboardStore()
    const { createTopic, updateTopic, loading } = useTopicStore()

    const [formData, setFormData] = useState({
        subject_id: searchParams.get('subject_id') ? Number(searchParams.get('subject_id')) : 0,
        name: '',
        description: ''
    })

    useEffect(() =>
    {
        if (isEditing && topicId)
        {
            const topic = getTopics().find(t => t.id === topicId)
            if (topic)
                setFormData({
                    subject_id: topic.subject_id,
                    name: topic.name,
                    description: topic.description || ''
                })
        }
    }, [isEditing, topicId, getTopics])

    const subjects = getSubjects()
    const subjectOptions = subjects.map(s => ({ value: s.id, label: s.name }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
        if (!formData.name.trim())
        {
            toast.error('Введите название темы')
            return
        }
        try
        {
            if (isEditing && topicId)
            {
                await updateTopic(topicId, formData)
                toast.success('Тема обновлена')
                navigate(`/topics/${topicId}`)
            } else
            {
                const newTopic = await createTopic(formData)
                toast.success('Тема создана')
                navigate(`/topics/${newTopic.id}`)
            }
        } catch (error: any)
        {
            toast.error(error.message || 'Ошибка сохранения')
        }
    }

    if (loading && isEditing)
        return (
            <DetailContent>
                <LoadingSpinner />
            </DetailContent>
        )

    return (
        <DetailContent>
            <DetailHeader
                title={isEditing ? 'Редактирование темы' : 'Создание темы'}
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
                        >
                            <option value={0}>Выберите предмет</option>
                            {subjectOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Название темы *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button variant="secondary" onClick={() => navigate(-1)}>Отмена</Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {isEditing ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </form>
            </div>
        </DetailContent>
    )
}