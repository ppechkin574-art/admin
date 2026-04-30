import React, { useState, useCallback } from 'react'
import { Upload, X, File, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/common/Button'

interface CloudflareUploaderProps
{
    onUploaded: (fileId: string) => void
    accept?: string
    buttonText?: string
    buttonVariant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
    disabled?: boolean
    className?: string
}

const CLOUDFLARE_UPLOAD_URL = 'https://api.cloudflare.com/client/v4/accounts/{account_id}/stream'

export const CloudflareUploader: React.FC<CloudflareUploaderProps> = ({
    onUploaded,
    accept = '*/*',
    buttonText = 'Загрузить файл',
    buttonVariant = 'primary',
    disabled = false,
    className = ''
}) =>
{
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    const handleDrag = useCallback((e: React.DragEvent) =>
    {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover")
        {
            setDragActive(true)
        } else if (e.type === "dragleave")
        {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) =>
    {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0])
        {
            await handleFileUpload(e.dataTransfer.files[0])
        }
    }, [onUploaded])

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) =>
    {
        if (e.target.files && e.target.files[0])
        {
            await handleFileUpload(e.target.files[0])
        }
    }, [onUploaded])

    const handleFileUpload = useCallback(async (file: File) =>
    {
        // В реальном приложении здесь должен быть вызов вашего API,
        // который загружает файл в Cloudflare и возвращает ID
        // Примерный псевдокод:

        setUploading(true)

        try
        {
            // 1. Создаем FormData
            const formData = new FormData()
            formData.append('file', file)

            // 2. Отправляем на ваш бэкенд API
            // const response = await fetch('/api/upload/cloudflare', {
            //   method: 'POST',
            //   body: formData,
            //   headers: {
            //     'Authorization': `Bearer ${your_token}`
            //   }
            // })

            // 3. Получаем ID файла из ответа
            // const data = await response.json()
            // const fileId = data.id

            // Для демонстрации используем случайный ID
            await new Promise(resolve => setTimeout(resolve, 1500))
            const fileId = `cloudflare_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            // 4. Вызываем колбэк с ID файла
            onUploaded(fileId)
        } catch (error: any)
        {
            console.error('Upload error:', error)
            toast.error(error.message || 'Ошибка загрузки файла')
        } finally
        {
            setUploading(false)
        }
    }, [onUploaded])

    return (
        <div className={`relative ${className}`}>
            <div
                className={`border-2 border-dashed rounded-lg transition-colors ${dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="p-6 text-center">
                    {uploading ? (
                        <div className="space-y-3">
                            <Loader className="h-8 w-8 text-primary-600 animate-spin mx-auto" />
                            <p className="text-sm text-gray-600">Загрузка файла...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                            <div className="space-y-2">
                                <p className="text-sm text-gray-700">
                                    Перетащите файл сюда
                                </p>
                                <p className="text-xs text-gray-500">
                                    или
                                </p>
                                <label className="cursor-pointer">
                                    <Button
                                        type="button"
                                        variant={buttonVariant}
                                        disabled={disabled}
                                        icon={<File className="h-4 w-4" />}
                                    >
                                        {buttonText}
                                    </Button>
                                    <input
                                        type="file"
                                        accept={accept}
                                        onChange={handleFileSelect}
                                        className="sr-only"
                                        disabled={disabled || uploading}
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">
                                Максимальный размер файла: 500MB
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CloudflareUploader