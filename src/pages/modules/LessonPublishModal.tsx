import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Globe, EyeOff } from 'lucide-react'
import { lessonService } from '@/services/api'
import { ModuleLesson } from '@/types/modules'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'

interface LessonPublishModalProps
{
    isOpen: boolean
    onClose: () => void
    lesson: ModuleLesson
    onPublishStatusChanged: () => void
}

export const LessonPublishModal: React.FC<LessonPublishModalProps> = ({
    isOpen,
    onClose,
    lesson,
    onPublishStatusChanged
}) =>
{
    const [isPublished, setIsPublished] = useState(lesson.is_published || false)
    const [publishDate, setPublishDate] = useState<string>(
        lesson.published_at
            ? new Date(lesson.published_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    )
    const [publishTime, setPublishTime] = useState<string>(
        lesson.published_at
            ? new Date(lesson.published_at).toTimeString().slice(0, 5)
            : '09:00'
    )
    const [isSaving, setIsSaving] = useState(false)
    const { handleApiError } = useApiErrorHandler()

    const handleTogglePublish = async () =>
    {
        setIsSaving(true)
        try
        {
            const publishedAt = isPublished
                ? null
                : new Date(`${publishDate}T${publishTime}`).toISOString()

            await lessonService.publish(lesson.id, {
                is_published: !isPublished,
                published_at: publishedAt
            })

            const action = !isPublished ? 'опубликован' : 'снят с публикации'
            toast.success(`Урок успешно ${action}`)
            onPublishStatusChanged()
            onClose()
        } catch (error: any)
        {
            console.error('Error updating publish status:', error)
            handleApiError(error, 'Ошибка обновления статуса публикации')
        } finally
        {
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isPublished ? "Снять с публикации" : "Опубликовать урок"}
            subtitle={lesson.title}
            maxWidth="md"
        >
            <div className="space-y-6">
                {!isPublished ? (
                    <>
                        <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                            <Globe className="h-5 w-5 text-blue-500 mr-3" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">
                                    Публикация урока
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                    После публикации урок станет доступен для студентов.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
                        <EyeOff className="h-5 w-5 text-yellow-500 mr-3" />
                        <div>
                            <p className="text-sm font-medium text-yellow-900">
                                Снятие с публикации
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                                После снятия с публикации урок станет недоступен для студентов.
                                Вы можете опубликовать его снова в любое время.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant={isPublished ? "warning" : "primary"}
                        onClick={handleTogglePublish}
                        disabled={isSaving}
                        loading={isSaving}
                        icon={isPublished ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    >
                        {isPublished ? "Снять с публикации" : "Опубликовать"}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}