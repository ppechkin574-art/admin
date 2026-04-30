import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, Save } from 'lucide-react'
import { moduleService } from '@/services/api'
import { ModuleLesson } from '@/types/modules'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'

interface LessonOrderModalProps
{
    isOpen: boolean
    onClose: () => void
    lessons: ModuleLesson[]
    moduleId: number
    onOrderUpdated: () => void
}

export const LessonOrderModal: React.FC<LessonOrderModalProps> = ({
    isOpen,
    onClose,
    lessons,
    moduleId,
    onOrderUpdated
}) =>
{
    const [sortedLessons, setSortedLessons] = useState<ModuleLesson[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const { handleApiError } = useApiErrorHandler()

    useEffect(() =>
    {
        if (lessons && lessons.length > 0)
        {
            const sorted = [...lessons].sort((a, b) =>
                (a.order_index + 1 || 1) - (b.order_index + 1 || 1)
            )
            setSortedLessons(sorted)
        }
    }, [lessons])

    const handleDragEnd = (result: DropResult) =>
    {
        if (!result.destination) return

        const items = Array.from(sortedLessons)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        const updatedItems = items.map((item, index) => ({
            ...item,
            order_index: index + 1
        }))

        setSortedLessons(updatedItems)
    }

    const handleSaveOrder = async () =>
    {
        setIsSaving(true)
        try
        {
            const lessonOrders = sortedLessons.map(lesson => ({
                id: lesson.id,
                order_index: lesson.order_index
            }))

            await moduleService.updateLessonOrder(moduleId, lessonOrders)

            toast.success('Порядок уроков успешно обновлен')
            onOrderUpdated()
            onClose()
        } catch (error: any)
        {
            console.error('Error updating lesson order:', error)
            handleApiError(error, 'Ошибка обновления порядка уроков')
        } finally
        {
            setIsSaving(false)
        }
    }

    const handleManualOrderChange = (lessonId: number, newOrder: number) =>
    {
        if (newOrder < 1) return

        const updatedLessons = [...sortedLessons]
        const lessonIndex = updatedLessons.findIndex(l => l.id === lessonId)

        if (lessonIndex === -1 || 0) return

        const lesson = updatedLessons[lessonIndex]
        lesson.order_index = newOrder

        updatedLessons.sort((a, b) => (a.order_index || 1) - (b.order_index || 1))

        const reindexedLessons = updatedLessons.map((item, index) => ({
            ...item,
            order_index: index + 1
        }))

        setSortedLessons(reindexedLessons)
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Изменение порядка уроков"
            maxWidth="md"
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Перетащите уроки для изменения порядка или укажите порядковый номер вручную.
                </p>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="lessons">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2"
                            >
                                {sortedLessons.map((lesson, index) => (
                                    <Draggable
                                        key={lesson.id}
                                        draggableId={lesson.id.toString()}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`
                          bg-white border rounded-lg p-4 flex items-center justify-between
                          ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}
                        `}
                                            >
                                                <div className="flex items-center space-x-4 flex-1">
                                                    <div {...provided.dragHandleProps}>
                                                        <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                                                    </div>

                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900">
                                                            {lesson.title}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-500">Порядок:</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={lesson.order_index}
                                                            onChange={(e) =>
                                                                handleManualOrderChange(lesson.id, parseInt(e.target.value) || 1)
                                                            }
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveOrder}
                        disabled={isSaving}
                        loading={isSaving}
                        icon={<Save className="h-4 w-4" />}
                    >
                        Сохранить порядок
                    </Button>
                </div>
            </div>
        </Modal>
    )
}