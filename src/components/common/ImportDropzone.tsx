import React, { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportDropzoneProps
{
    onFileSelect: (file: File) => void
    acceptedFormats?: string[]
    maxSize?: number // in MB
    isLoading?: boolean
    currentFile?: File | null
}

const ImportDropzone: React.FC<ImportDropzoneProps> = ({
    onFileSelect,
    acceptedFormats = ['.xlsx', '.xls', '.xlsm'],
    maxSize = 10,
    isLoading = false,
    currentFile = null
}) =>
{
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const validateFile = (file: File): boolean =>
    {
        setError(null)

        // Проверка размера
        if (file.size > maxSize * 1024 * 1024)
        {
            setError(`Размер файла превышает ${maxSize}MB`)
            return false
        }

        // Проверка расширения
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
        if (!acceptedFormats.includes(fileExtension))
        {
            setError(`Поддерживаются только файлы: ${acceptedFormats.join(', ')}`)
            return false
        }

        return true
    }

    const handleDragOver = useCallback((e: React.DragEvent) =>
    {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) =>
    {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) =>
    {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && validateFile(file))
        {
            onFileSelect(file)
        }
    }, [onFileSelect])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) =>
    {
        const file = e.target.files?.[0]
        if (file && validateFile(file))
        {
            onFileSelect(file)
        }
    }, [onFileSelect])

    return (
        <div className="space-y-4">
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-primary-500 bg-primary-50'
                        : currentFile
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {currentFile ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center text-green-600">
                            <CheckCircle className="h-12 w-12" />
                        </div>
                        <div className="font-medium text-gray-900">{currentFile.name}</div>
                        <div className="text-sm text-gray-500">
                            {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Выбрать другой файл
                            <input
                                type="file"
                                accept={acceptedFormats.join(',')}
                                onChange={handleFileChange}
                                className="sr-only"
                                disabled={isLoading}
                            />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <Upload className="h-12 w-12 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                            <div className="font-medium text-gray-700">
                                Перетащите файл Excel сюда
                            </div>
                            <div className="text-sm text-gray-500">
                                или
                            </div>
                            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Выберите файл
                                <input
                                    type="file"
                                    accept={acceptedFormats.join(',')}
                                    onChange={handleFileChange}
                                    className="sr-only"
                                    disabled={isLoading}
                                />
                            </label>
                        </div>
                        <div className="text-xs text-gray-500">
                            Поддерживаемые форматы: {acceptedFormats.join(', ')}
                            <br />
                            Максимальный размер: {maxSize}MB
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="flex items-center text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                </div>
            )}
        </div>
    )
}

export default ImportDropzone