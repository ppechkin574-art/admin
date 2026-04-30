import React, { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Video, Presentation, Upload, X, File, Loader, Check, AlertCircle } from 'lucide-react'
import { lessonService } from '@/services/api'
import { cloudflareService, CloudflareUploadProgress } from '@/services/cloudflareService'
import { ModuleLesson } from '@/types/modules'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import Badge from '@/components/common/Badge'

interface LessonMediaModalProps
{
    isOpen: boolean
    onClose: () => void
    lesson: ModuleLesson
    onMediaUpdated: () => void
}

const CLOUDFLARE_IFRAME_PREFIX = "https://customer-udg2rk5bpm1tzy74.cloudflarestream.com/"

export const LessonMediaModal: React.FC<LessonMediaModalProps> = ({
    isOpen,
    onClose,
    lesson,
    onMediaUpdated
}) =>
{
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [presentationFile, setPresentationFile] = useState<File | null>(null)
    const [videoId, setVideoId] = useState(lesson.video_url || '')
    const [presentationId, setPresentationId] = useState(lesson.presentation_url || '')
    const [videoUploading, setVideoUploading] = useState(false)
    const [presentationUploading, setPresentationUploading] = useState(false)
    const [videoUploadProgress, setVideoUploadProgress] = useState<CloudflareUploadProgress | null>(null)
    const [presentationUploadProgress, setPresentationUploadProgress] = useState<CloudflareUploadProgress | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const videoInputRef = useRef<HTMLInputElement>(null)
    const presentationInputRef = useRef<HTMLInputElement>(null)

    const getPreviewUrl = (id: string) =>
    {
        if (!id) return null
        return `${CLOUDFLARE_IFRAME_PREFIX}${id}/iframe`
    }

    const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        const file = e.target.files?.[0]
        if (file)
        {
            if (!file.type.includes('video/'))
            {
                toast.error('Пожалуйста, выберите видео файл')
                return
            }
            if (file.size > 500 * 1024 * 1024)
            { // 500MB
                toast.error('Максимальный размер видео файла: 500MB')
                return
            }
            setVideoFile(file)
            setVideoId('') // Сбрасываем ID если загружаем новый файл
        }
    }

    const handlePresentationFileSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        const file = e.target.files?.[0]
        if (file)
        {
            const allowedTypes = [
                'application/pdf',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.apple.keynote'
            ]

            if (!allowedTypes.includes(file.type))
            {
                toast.error('Пожалуйста, выберите файл презентации (PDF, PPT, PPTX, KEY)')
                return
            }
            if (file.size > 100 * 1024 * 1024)
            { // 100MB
                toast.error('Максимальный размер файла презентации: 100MB')
                return
            }
            setPresentationFile(file)
            setPresentationId('') // Сбрасываем ID если загружаем новый файл
        }
    }

    const handleUploadVideo = async () =>
    {
        if (!videoFile) return

        setVideoUploading(true)
        setVideoUploadProgress(null)

        try
        {
            const uploadedId = await cloudflareService.uploadVideo(videoFile, (progress) =>
            {
                setVideoUploadProgress(progress)
            })

            setVideoId(uploadedId)
            setVideoFile(null)
            toast.success('Видео успешно загружено на Cloudflare')
        } catch (error: any)
        {
            console.error('Error uploading video:', error)
            toast.error(error.message || 'Ошибка загрузки видео')
        } finally
        {
            setVideoUploading(false)
            setVideoUploadProgress(null)
        }
    }

    const handleUploadPresentation = async () =>
    {
        if (!presentationFile) return

        setPresentationUploading(true)
        setPresentationUploadProgress(null)

        try
        {
            const uploadedId = await cloudflareService.uploadPresentation(presentationFile, (progress) =>
            {
                setPresentationUploadProgress(progress)
            })

            setPresentationId(uploadedId)
            setPresentationFile(null)
            toast.success('Презентация успешно загружена на Cloudflare')
        } catch (error: any)
        {
            console.error('Error uploading presentation:', error)
            toast.error(error.message || 'Ошибка загрузки презентации')
        } finally
        {
            setPresentationUploading(false)
            setPresentationUploadProgress(null)
        }
    }

    const handleClearVideo = () =>
    {
        setVideoId('')
        setVideoFile(null)
        if (videoInputRef.current)
        {
            videoInputRef.current.value = ''
        }
    }

    const handleClearPresentation = () =>
    {
        setPresentationId('')
        setPresentationFile(null)
        if (presentationInputRef.current)
        {
            presentationInputRef.current.value = ''
        }
    }

    const handleSaveMedia = async () =>
    {
        setIsSaving(true)
        try
        {
            // Сохраняем текущие ID (загруженные ранее или введенные вручную)
            await lessonService.updateMedia(lesson.id, {
                video_url: videoId || null,
                presentation_url: presentationId || null
            })

            toast.success('Медиа-файлы успешно обновлены')
            onMediaUpdated()
            onClose()
        } catch (error: any)
        {
            console.error('Error updating media:', error)
            toast.error(error.response?.data?.detail || 'Ошибка обновления медиа-файлов')
        } finally
        {
            setIsSaving(false)
        }
    }

    const videoPreviewUrl = videoId ? getPreviewUrl(videoId) : null
    const presentationPreviewUrl = presentationId ? getPreviewUrl(presentationId) : null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Управление медиа-файлами урока"
            subtitle={lesson.title}
            maxWidth="4xl"
        >
            <div className="space-y-6">
                {/* Строка с видео и презентацией */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Видео */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                <Video className="h-5 w-5 mr-2" />
                                Видео урока
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Загрузите видео файл или введите ID существующего видео
                            </p>
                        </div>

                        {videoId ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">
                                        <span className="font-medium">ID видео:</span>
                                        <span className="ml-2 text-gray-600 font-mono">{videoId}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearVideo}
                                        icon={<X className="h-3 w-3" />}
                                    >
                                        Удалить
                                    </Button>
                                </div>
                                {videoPreviewUrl && (
                                    <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden bg-gray-900">
                                        <iframe
                                            src={videoPreviewUrl}
                                            className="absolute top-0 left-0 w-full h-full"
                                            allowFullScreen
                                            title="Предпросмотр видео"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : videoFile ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">
                                        <span className="font-medium">Файл:</span>
                                        <span className="ml-2 text-gray-600">{videoFile.name}</span>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </div>
                                    </div>
                                </div>

                                {videoUploading && videoUploadProgress ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Загрузка...</span>
                                            <span>{videoUploadProgress.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${videoUploadProgress.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={handleUploadVideo}
                                        loading={videoUploading}
                                        className="w-full"
                                        icon={<Upload className="h-4 w-4" />}
                                    >
                                        Загрузить на Cloudflare
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => setVideoFile(null)}
                                    className="w-full"
                                >
                                    Отменить
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <File className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 mb-3">Выберите видео файл</p>
                                    <input
                                        ref={videoInputRef}
                                        type="file"
                                        accept="video/*"
                                        onChange={handleVideoFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => videoInputRef.current?.click()}
                                        className="w-full"
                                        icon={<File className="h-4 w-4" />}
                                    >
                                        Выбрать файл
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">или</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Введите ID видео
                                    </label>
                                    <input
                                        type="text"
                                        value={videoId}
                                        onChange={(e) => setVideoId(e.target.value)}
                                        placeholder="Введите ID видео из Cloudflare"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Презентация */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                <Presentation className="h-5 w-5 mr-2" />
                                Презентация
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Загрузите файл презентации или введите ID существующей презентации
                            </p>
                        </div>

                        {presentationId ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">
                                        <span className="font-medium">ID презентации:</span>
                                        <span className="ml-2 text-gray-600 font-mono">{presentationId}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearPresentation}
                                        icon={<X className="h-3 w-3" />}
                                    >
                                        Удалить
                                    </Button>
                                </div>
                                {presentationPreviewUrl && (
                                    <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden bg-gray-50">
                                        <iframe
                                            src={presentationPreviewUrl}
                                            className="absolute top-0 left-0 w-full h-full"
                                            title="Предпросмотр презентации"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : presentationFile ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">
                                        <span className="font-medium">Файл:</span>
                                        <span className="ml-2 text-gray-600">{presentationFile.name}</span>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {(presentationFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </div>
                                    </div>
                                </div>

                                {presentationUploading && presentationUploadProgress ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Загрузка...</span>
                                            <span>{presentationUploadProgress.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${presentationUploadProgress.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={handleUploadPresentation}
                                        loading={presentationUploading}
                                        className="w-full"
                                        icon={<Upload className="h-4 w-4" />}
                                    >
                                        Загрузить на Cloudflare
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => setPresentationFile(null)}
                                    className="w-full"
                                >
                                    Отменить
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <Presentation className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 mb-3">Выберите файл презентации</p>
                                    <input
                                        ref={presentationInputRef}
                                        type="file"
                                        accept=".pdf,.ppt,.pptx,.key,.pptm"
                                        onChange={handlePresentationFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => presentationInputRef.current?.click()}
                                        className="w-full"
                                        icon={<File className="h-4 w-4" />}
                                    >
                                        Выбрать файл
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">или</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Введите ID презентации
                                    </label>
                                    <input
                                        type="text"
                                        value={presentationId}
                                        onChange={(e) => setPresentationId(e.target.value)}
                                        placeholder="Введите ID презентации из Cloudflare"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Информационное сообщение */}
                {(!videoId && !presentationId) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Как получить ID медиа-файла?
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Загрузите файл через форму выше, и ID будет получен автоматически</li>
                                        <li>Или введите ID существующего файла из Cloudflare Stream</li>
                                        <li>ID можно найти в админ-панели Cloudflare: dash.cloudflare.com → Stream</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Кнопки действий */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving || videoUploading || presentationUploading}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveMedia}
                        disabled={isSaving || videoUploading || presentationUploading}
                        loading={isSaving}
                        icon={<Check className="h-4 w-4" />}
                    >
                        Сохранить изменения
                    </Button>
                </div>
            </div>
        </Modal>
    )
}