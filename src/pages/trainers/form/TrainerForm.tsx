import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useTrainerStore } from '@/stores/trainerStore'
import toast from 'react-hot-toast'
import { DetailContent } from '@/components/details/DetailContent'
import { DetailHeader } from '@/components/details/DetailHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'
import { AlertCircle } from 'lucide-react'

export const TrainerForm: React.FC = () =>
{
    const { id } = useParams()
    const navigate = useNavigate()
    const trainerId = id ? Number(id) : undefined
    const isEditing = !!trainerId

    const { getTrainers } = useDashboardStore()
    const { updateTrainer, loading } = useTrainerStore()

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    })

    useEffect(() =>
    {
        if (isEditing && trainerId)
        {
            const trainer = getTrainers().find(t => t.id === trainerId)
            if (trainer)
                setFormData({
                    name: trainer.name,
                    description: trainer.description || ''
                })
        }
    }, [isEditing, trainerId, getTrainers])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) =>
    {
        e.preventDefault()
        if (!formData.name.trim())
        {
            toast.error('Введите название тренажёра')
            return
        }
        try
        {
            if (isEditing && trainerId)
            {
                await updateTrainer(trainerId, formData)
                toast.success('Тренажёр обновлён')
                navigate(`/trainers/${trainerId}`)
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

    if (!isEditing)
        return (
            <DetailContent>
                <DetailHeader title="Создание тренажёра" onBack={() => navigate(-1)} />
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-4 rounded-md">
                        <AlertCircle className="h-5 w-5" />
                        <p>Создание тренажёров временно недоступно. Тренажёры создаются автоматически при создании тем в системе.</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="secondary" onClick={() => navigate(-1)}>Вернуться</Button>
                    </div>
                </div>
            </DetailContent>
        )

    return (
        <DetailContent>
            <DetailHeader title="Редактирование тренажёра" onBack={() => navigate(-1)} />
            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Название тренажёра *</label>
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
                            Сохранить
                        </Button>
                    </div>
                </form>
            </div>
        </DetailContent>
    )
}