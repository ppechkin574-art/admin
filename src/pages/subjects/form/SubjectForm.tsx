import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSubjectStore } from '@/stores/subjectStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { subjectService } from '@/services/api'
import { SubjectType } from '@/types'
import toast from 'react-hot-toast'
import { DetailContent } from '@/components/details/DetailContent'
import { DetailHeader } from '@/components/details/DetailHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

export const SubjectForm: React.FC = () =>
{
    const { id } = useParams()
    const navigate = useNavigate()
    const subjectId = id ? Number(id) : undefined
    const isEditing = !!subjectId

    const { refreshDashboard } = useDashboardStore()
    const { createSubject, updateSubject, getSubjectById, loading } = useSubjectStore()
    const [formData, setFormData] = useState({
        name: '',
        type: SubjectType.MAIN,
        image: '',
    })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() =>
    {
        if (isEditing && subjectId)
        {
            const subject = getSubjectById(subjectId)
            if (subject)
            {
                setFormData({
                    name: subject.name,
                    type: subject.type,
                    image: subject.image || '',
                })
                if (subject.image)
                    setImagePreview(subject.image)
            }
        }
    }, [isEditing, subjectId, getSubjectById])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/'))
        {
            toast.error('Пожалуйста, выберите изображение')
            return
        }
        if (file.size > 5 * 1024 * 1024)
        {
            toast.error('Размер файла не должен превышать 5 МБ')
            return
        }
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = async () =>
    {
        if (isEditing && subjectId && formData.image)
        {
            try
            {
                setUploading(true)
                await subjectService.deleteImage(subjectId)
                setFormData(prev => ({ ...prev, image: '' }))
                setImagePreview('')
                toast.success('Изображение удалено')
            } catch (error)
            {
                toast.error('Ошибка удаления изображения')
            } finally
            {
                setUploading(false)
            }
        } else
        {
            setImageFile(null)
            setImagePreview('')
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSubmit = async (e: React.FormEvent) =>
    {
        e.preventDefault()
        if (!formData.name.trim())
        {
            toast.error('Введите название предмета')
            return
        }

        if (imageFile)
        {
            setUploading(true)
            try
            {
                if (!isEditing)
                {
                    const newSubject = await createSubject({ ...formData, image: '' })
                    await subjectService.uploadImage(newSubject.id, imageFile)
                    toast.success('Предмет создан с изображением')
                    await refreshDashboard()
                    navigate(`/subjects/${newSubject.id}`)
                } else
                {
                    await subjectService.uploadImage(subjectId!, imageFile)
                    toast.success('Предмет обновлён')
                    await refreshDashboard()
                    navigate(`/subjects/${subjectId}`)
                }
            } catch (error)
            {
                toast.error('Ошибка загрузки изображения')
            } finally
            {
                setUploading(false)
            }
        } else
        {
            try
            {
                if (isEditing && subjectId)
                {
                    await updateSubject(subjectId, formData)
                    toast.success('Предмет обновлён')
                    await refreshDashboard()
                    navigate(`/subjects/${subjectId}`)
                } else
                {
                    const newSubject = await createSubject(formData)
                    toast.success('Предмет создан')
                    await refreshDashboard()
                    navigate(`/subjects/${newSubject.id}`)
                }
            } catch (error: any)
            {
                toast.error(error.message || 'Ошибка сохранения')
            }
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
                title={isEditing ? 'Редактирование предмета' : 'Создание предмета'}
                onBack={() => navigate(-1)}
                showDelete={false}
                showEdit={false}
            />
            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Тип *</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value={SubjectType.MAIN}>Основной</option>
                                    <option value={SubjectType.SPECIALIZED}>Профильный</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Изображение</label>
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                    {imagePreview ? (
                                        <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover invert"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                disabled={uploading}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                                            <ImageIcon className="h-8 w-8 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-center space-y-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        icon={<Upload className="h-4 w-4" />}
                                        disabled={uploading}
                                    >
                                        Выбрать файл
                                    </Button>
                                    <p className="text-xs text-gray-500">(JPG, PNG, GIF)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <Button variant="secondary" onClick={() => navigate(-1)}>Отмена</Button>
                        <Button type="submit" variant="primary" disabled={loading || uploading}>
                            {uploading ? 'Загрузка...' : isEditing ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </form>
            </div>
        </DetailContent>
    )
}