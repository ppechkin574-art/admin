import React, { useCallback, useState, useEffect } from 'react'
import { ImportModalProps } from '@/types'
import { questionService } from '@/services/api'
import toast from 'react-hot-toast'
import
{
    Upload,
    FileSpreadsheet,
    X,
    AlertCircle,
    CheckCircle,
    FileText,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Save,
    ArrowLeft,
    Tag,
    BookOpen,
    Folder,
    Users,
    Info,
    ImageIcon,
    Code
} from 'lucide-react'

// Компоненты
import FormModal from '@/components/common/FormModal'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import RichTextPreview from '../../../components/common/RichTextPreview'
import { containsLatex, containsMedia, parseTextWithFormulasAndMedia } from '../../../utils/textParser'

interface ParsedQuestion
{
    order_index: number
    question_text: string
    question_type: string
    options: Array<{
        option_text: string
        is_correct: boolean
        order_index: number
        blocks?: any[]
    }>
    explanation?: string
    difficulty?: string
    subject?: string
    topic_name?: string
    ent_option_number?: number
    original_data?: {
        question_blocks: any[]
        answer_blocks: any[][]
        hint_blocks: any[]
    }
}

interface ImportPreviewData
{
    success: boolean
    questions: ParsedQuestion[]
    errors: string[]
    errors_count: number
    questions_count: number
    file_name: string
    analysis?: {
        has_media: boolean
        has_latex: boolean
        question_types: {
            single_choice: number
            multiple_choice: number
            ent?: number
        }
        total_options: number
    }
    message?: string
    metadata?: {
        import_type: string
        subjects: string[]
        topics: string[]
        ent_options: number[]
    }
}

export const ImportModal: React.FC<ImportModalProps> = ({
    onImport,
    onClose,
    loading = false,
    isOpen
}) =>
{
    const [formData, setFormData] = useState<{
        file: File | null
        importType: string
    }>({
        file: null,
        importType: 'training'
    })

    const [isDragging, setIsDragging] = useState(false)
    const [parsedData, setParsedData] = useState<ImportPreviewData | null>(null)
    const [parsing, setParsing] = useState(false)
    const [expandedQuestions, setExpandedQuestions] = useState<number[]>([])
    const [showPreview, setShowPreview] = useState<{ [key: number]: boolean }>({})
    const [editedQuestions, setEditedQuestions] = useState<ParsedQuestion[]>([])
    const [importSettings, setImportSettings] = useState({
        difficulty: 'medium',
        subject_id: '',
        topic_id: '',
        deduplicate: true
    })

    // Сброс состояний при закрытии
    useEffect(() =>
    {
        if (!isOpen)
        {
            setFormData({ file: null, importType: 'training' })
            setParsedData(null)
            setParsing(false)
            setExpandedQuestions([])
            setShowPreview({})
            setEditedQuestions([])
        }
    }, [isOpen])

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
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && isValidExcelFile(droppedFile))
        {
            setFormData(prev => ({ ...prev, file: droppedFile }))
        } else
        {
            toast.error('Пожалуйста, загрузите файл Excel (.xlsx или .xls)')
        }
    }, [])

    const isValidExcelFile = (file: File): boolean =>
    {
        const validExtensions = ['.xlsx', '.xls', '.xlsm']
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
        return validExtensions.includes(fileExtension)
    }

    const handleFileRemove = useCallback(() =>
    {
        setFormData(prev => ({ ...prev, file: null }))
        setParsedData(null)
    }, [])

    const handleImportTypeChange = useCallback((value: string) =>
    {
        setFormData(prev => ({ ...prev, importType: value }))
    }, [])

    const setFile = useCallback((file: File | null) =>
    {
        setFormData(prev => ({ ...prev, file }))
    }, [])

    // Парсинг файла через API
    const handleParseFile = useCallback(async () =>
    {
        if (!formData.file) return

        setParsing(true)
        try
        {
            const formDataToSend = new FormData()
            formDataToSend.append('file', formData.file)
            formDataToSend.append('import_type', formData.importType)

            const result = await questionService.previewImport(formDataToSend)
            setParsedData(result)
            setEditedQuestions(result.questions)

            toast.success(result.message || 'Файл успешно проанализирован')
        } catch (error: any)
        {
            let errorMessage = 'Ошибка при анализе файла'

            if (error.response?.status === 422)
            {
                errorMessage = 'Ошибка валидации данных. Проверьте формат файла.'
            } else if (error.response?.data?.detail)
            {
                errorMessage = error.response.data.detail
            } else if (error.response?.data?.message)
            {
                errorMessage = error.response.data.message
            } else if (error.message)
            {
                errorMessage = error.message
            }

            toast.error(errorMessage)
            console.error('Parse error:', error)
        } finally
        {
            setParsing(false)
        }
    }, [formData.file, formData.importType])

    const handleBackToImport = useCallback(() =>
    {
        setParsedData(null)
        setExpandedQuestions([])
        setShowPreview({})
    }, [])

    const handleSubmit = useCallback(async (e?: React.FormEvent) =>
    {
        if (e) e.preventDefault()

        if (!formData.file || !formData.importType)
        {
            toast.error('Не заполнены обязательные поля')
            return
        }

        try
        {
            const result = await onImport(formData.file, formData.importType)

            if (result.success)
            {
                toast.success('Импорт завершен успешно')
                onClose()
            } else
            {
                const errorDetails = result.errors && result.errors.length > 0
                    ? result.errors.join('\n')
                    : result.message || 'Произошла ошибка при импорте'

                toast.error(errorDetails)
            }
        } catch (error: any)
        {
            let errorMessage = 'Произошла непредвиденная ошибка'

            if (error.response?.status === 422)
            {
                errorMessage = 'Ошибка валидации данных. Проверьте формат файла.'
            } else if (error.response?.data?.detail)
            {
                errorMessage = error.response.data.detail
            } else if (error.response?.data?.message)
            {
                errorMessage = error.response.data.message
            } else if (error.message)
            {
                errorMessage = error.message
            }

            toast.error(errorMessage)
        }
    }, [formData, onImport, onClose])

    const toggleQuestion = useCallback((questionIndex: number) =>
    {
        if (expandedQuestions.includes(questionIndex))
        {
            setExpandedQuestions(expandedQuestions.filter(q => q !== questionIndex))
        } else
        {
            setExpandedQuestions([...expandedQuestions, questionIndex])
        }
    }, [expandedQuestions])

    const togglePreview = useCallback((questionIndex: number) =>
    {
        setShowPreview(prev => ({
            ...prev,
            [questionIndex]: !prev[questionIndex]
        }))
    }, [])

    const updateQuestion = useCallback((questionIndex: number, field: string, value: any) =>
    {
        const updated = [...editedQuestions]
        updated[questionIndex] = { ...updated[questionIndex], [field]: value }
        setEditedQuestions(updated)
    }, [editedQuestions])

    const updateOption = useCallback((questionIndex: number, optionIndex: number, field: string, value: any) =>
    {
        const updated = [...editedQuestions]
        const options = [...updated[questionIndex].options]
        options[optionIndex] = { ...options[optionIndex], [field]: value }
        updated[questionIndex].options = options
        setEditedQuestions(updated)
    }, [editedQuestions])

    const addOption = useCallback((questionIndex: number) =>
    {
        const updated = [...editedQuestions]
        const options = [...updated[questionIndex].options]
        options.push({
            option_text: '',
            is_correct: false,
            order_index: options.length
        })
        updated[questionIndex].options = options
        setEditedQuestions(updated)
    }, [editedQuestions])

    const removeOption = useCallback((questionIndex: number, optionIndex: number) =>
    {
        if (editedQuestions[questionIndex].options.length <= 2)
        {
            toast.error('В вопросе должно быть минимум 2 варианта ответа')
            return
        }

        const updated = [...editedQuestions]
        const options = [...updated[questionIndex].options]
        options.splice(optionIndex, 1)
        options.forEach((opt, idx) =>
        {
            opt.order_index = idx
        })
        updated[questionIndex].options = options
        setEditedQuestions(updated)
    }, [editedQuestions])

    const getTypeText = useCallback((type: string) =>
    {
        switch (type)
        {
            case 'single_choice': return 'Один ответ'
            case 'multiple_choice': return 'Несколько ответов'
            case 'ent': return 'ЕНТ'
            default: return type
        }
    }, [])

    const getTypeColor = useCallback((type: string) =>
    {
        switch (type)
        {
            case 'single_choice': return 'primary'
            case 'multiple_choice': return 'success'
            case 'ent': return 'warning'
            default: return 'secondary'
        }
    }, [])

    const getDifficultyText = useCallback((difficulty: string) =>
    {
        switch (difficulty)
        {
            case 'easy': return 'Легкий'
            case 'medium': return 'Средний'
            case 'hard': return 'Сложный'
            default: return difficulty
        }
    }, [])

    const getDifficultyColor = useCallback((difficulty: string) =>
    {
        switch (difficulty)
        {
            case 'easy': return 'success'
            case 'medium': return 'warning'
            case 'hard': return 'error'
            default: return 'secondary'
        }
    }, [])

    const hasLatexInQuestion = (question: ParsedQuestion): boolean =>
    {
        if (!question.original_data) return false;

        // Проверяем question_blocks
        if (question.original_data.question_blocks)
        {
            for (const block of question.original_data.question_blocks)
            {
                if (block.type === 'text' && (block.value?.includes('r"') || block.value?.includes("r'")))
                {
                    return true;
                }
            }
        }

        // Проверяем hint_blocks
        if (question.original_data.hint_blocks)
        {
            for (const block of question.original_data.hint_blocks)
            {
                if (block.type === 'text' && (block.value?.includes('r"') || block.value?.includes("r'")))
                {
                    return true;
                }
            }
        }

        return false;
    };

    const hasMediaInQuestion = (question: ParsedQuestion): boolean =>
    {
        if (!question.original_data) return false;

        // Проверяем question_blocks
        if (question.original_data.question_blocks)
        {
            for (const block of question.original_data.question_blocks)
            {
                if (block.type === 'media')
                {
                    return true;
                }
            }
        }

        // Проверяем hint_blocks
        if (question.original_data.hint_blocks)
        {
            for (const block of question.original_data.hint_blocks)
            {
                if (block.type === 'media')
                {
                    return true;
                }
            }
        }

        // Проверяем answer_blocks
        if (question.original_data.answer_blocks)
        {
            for (const variantBlocks of question.original_data.answer_blocks)
            {
                for (const block of variantBlocks)
                {
                    if (block.type === 'media')
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    };

    // useEffect(() =>
    // {
    //     if (parsedData && parsedData.questions.length > 10)
    //     {
    //         const testQuestion = parsedData.questions[10]; // Вопрос 11
    //         console.log("=== Testing Question 11 ===");
    //         console.log("Question text:", testQuestion.question_text);
    //         console.log("Contains LaTeX check:", containsLatex(testQuestion.question_text || ''));
    //         console.log("Contains Media check:", containsMedia(testQuestion.question_text || ''));
    //         console.log("Parsed parts:", parseTextWithFormulasAndMedia(testQuestion.question_text || ''));

    //         // Проверяем варианты ответов
    //         testQuestion.options?.forEach((option, idx) =>
    //         {
    //             console.log(`Option ${idx}:`, option.option_text);
    //             console.log(`Contains LaTeX:`, containsLatex(option.option_text || ''));
    //             console.log(`Contains Media:`, containsMedia(option.option_text || ''));
    //         });
    //     }
    // }, [parsedData]);

    const renderQuestionInfo = (question: ParsedQuestion) => (
        <div className="flex items-center space-x-3 mt-2">
            {question.difficulty && (
                <Badge type={getDifficultyColor(question.difficulty)} size="sm">
                    <Tag className="h-3 w-3 mr-1" />
                    {getDifficultyText(question.difficulty)}
                </Badge>
            )}
            {question.subject && (
                <Badge type="info" size="sm">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {question.subject}
                </Badge>
            )}
            {question.topic_name && (
                <Badge type="secondary" size="sm">
                    <Folder className="h-3 w-3 mr-1" />
                    {question.topic_name}
                </Badge>
            )}
            {question.ent_option_number && (
                <Badge type="warning" size="sm">
                    <Users className="h-3 w-3 mr-1" />
                    Вариант {question.ent_option_number}
                </Badge>
            )}
        </div>
    )

    const renderStep1 = () => (
        <form onSubmit={(e) => { e.preventDefault(); handleParseFile() }} className="space-y-6">
            {/* Тип импорта */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип импорта *
                </label>
                <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={formData.importType}
                    onChange={(e) => handleImportTypeChange(e.target.value)}
                    required
                    disabled={parsing}
                >
                    <option value="" disabled>Выберите тип импорта</option>
                    <option value="training">Вопросы тренажера</option>
                    <option value="ent">Вопросы тестов ЕНТ</option>
                </select>
                <div className="mt-2 text-sm">
                    {formData.importType === 'training' && (
                        <span className="text-green-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Вопросы будут использоваться в тренажерах
                        </span>
                    )}
                    {formData.importType === 'ent' && (
                        <span className="text-blue-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Вопросы будут использоваться в тестах ЕНТ
                        </span>
                    )}
                </div>
            </div>

            {/* Загрузка файла */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Выберите файл для импорта *
                </label>
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-primary-500 bg-primary-50'
                        : formData.file
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {formData.file ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-center text-green-600">
                                <FileSpreadsheet className="h-12 w-12" />
                            </div>
                            <div className="font-medium text-gray-900">{formData.file.name}</div>
                            <div className="text-sm text-gray-500">
                                {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                            <div className="flex justify-center space-x-3">
                                <button
                                    type="button"
                                    onClick={handleFileRemove}
                                    className="text-sm text-red-600 hover:text-red-800"
                                    disabled={parsing}
                                >
                                    Выбрать другой файл
                                </button>
                                <button
                                    type="button"
                                    onClick={handleParseFile}
                                    className="text-sm text-primary-600 hover:text-primary-800"
                                    disabled={parsing}
                                >
                                    {parsing ? 'Анализ...' : 'Проанализировать файл'}
                                </button>
                            </div>
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
                                        accept=".xlsx, .xls"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="sr-only"
                                        required
                                        disabled={parsing}
                                    />
                                </label>
                            </div>
                            <div className="text-xs text-gray-500">
                                Поддерживаемые форматы: .XLSX, .XLS
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                    Максимальный размер файла: 10MB
                </div>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={parsing}
                >
                    Отмена
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={!formData.file || parsing}
                    loading={parsing}
                >
                    Проанализировать файл
                </Button>
            </div>
        </form>
    )

    const renderStep2 = () =>
    {
        if (!parsedData) return null

        return (
            <div className="space-y-6">
                {/* Сообщение о результате парсинга */}
                <div className={`p-4 rounded-lg ${parsedData.errors_count > 0 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                    <div className="flex items-center">
                        {parsedData.errors_count > 0 ? (
                            <AlertCircle className="h-5 w-5 mr-2" />
                        ) : (
                            <CheckCircle className="h-5 w-5 mr-2" />
                        )}
                        <span>{parsedData.message || 'Файл успешно проанализирован'}</span>
                    </div>
                </div>

                {/* Статистика импорта */}
                {parsedData.metadata && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-blue-900 mb-4">Информация об импорте</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="text-sm text-blue-800">Тип импорта:</div>
                                <div className="font-medium text-blue-900">
                                    {parsedData.metadata.import_type === 'training' ? 'Тренажер' : 'ЕНТ'}
                                </div>
                            </div>
                            {parsedData.metadata.subjects.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-sm text-blue-800">Предметы:</div>
                                    <div className="font-medium text-blue-900">
                                        {parsedData.metadata.subjects.join(', ')}
                                    </div>
                                </div>
                            )}
                            {parsedData.metadata.topics.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-sm text-blue-800">Темы:</div>
                                    <div className="font-medium text-blue-900">
                                        {parsedData.metadata.topics.join(', ')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Статистика вопросов */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Статистика</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="text-2xl font-bold text-gray-900">{parsedData.questions_count}</div>
                            <div className="text-sm text-gray-600">Всего вопросов</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="text-2xl font-bold text-primary-600">
                                {parsedData.analysis?.question_types?.single_choice || 0}
                            </div>
                            <div className="text-sm text-gray-600">Одиночный выбор</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="text-2xl font-bold text-green-600">
                                {parsedData.analysis?.question_types?.multiple_choice || 0}
                            </div>
                            <div className="text-sm text-gray-600">Множественный выбор</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="text-2xl font-bold text-red-600">{parsedData.errors_count}</div>
                            <div className="text-sm text-gray-600">Ошибок при импорте</div>
                        </div>
                    </div>
                </div>

                {/* Вопросы */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Вопросы ({editedQuestions.length})
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            Вы можете просмотреть и отредактировать вопросы перед импортом
                        </span>
                    </h3>

                    <div className="space-y-4">
                        {editedQuestions.map((question, questionIndex) =>
                        {
                            const hasLatex = hasLatexInQuestion(question);
                            const hasMedia = hasMediaInQuestion(question);
                            const shouldShowPreviewButton = hasLatexInQuestion || hasMediaInQuestion

                            console.log(`Question ${questionIndex} text:`, question.question_text);
                            console.log(`Contains LaTeX:`, hasLatex);
                            console.log(`Contains Media:`, hasMedia);

                            return (
                                <div key={questionIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleQuestion(questionIndex)}
                                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center">
                                            <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                            <div className="text-left">
                                                <div className="font-medium text-gray-900">
                                                    Вопрос #{questionIndex + 1}
                                                    <Badge type={getTypeColor(question.question_type)} size="sm" className="ml-2">
                                                        {getTypeText(question.question_type)}
                                                    </Badge>
                                                    {hasLatex && (
                                                        <Badge type="info" size="sm" className="ml-2">
                                                            <Code className="h-3 w-3 mr-1" />
                                                            LaTeX
                                                        </Badge>
                                                    )}
                                                    {hasMedia && (
                                                        <Badge type="secondary" size="sm" className="ml-2">
                                                            <ImageIcon className="h-3 w-3 mr-1" />
                                                            Медиа
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 truncate max-w-2xl">
                                                    {question.question_text ?
                                                        (question.question_text.length > 100 ?
                                                            question.question_text.substring(0, 100) + '...' :
                                                            question.question_text
                                                        ) :
                                                        'Нет текста вопроса'}
                                                </div>
                                                {renderQuestionInfo(question)}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-500 mr-3">
                                                {question.options?.length || 0} вариантов
                                            </span>
                                            {expandedQuestions.includes(questionIndex) ? (
                                                <ChevronUp className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {expandedQuestions.includes(questionIndex) && (
                                        <div className="p-6 border-t border-gray-200">
                                            <div className="space-y-4">
                                                {/* Текст вопроса */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-sm font-medium text-gray-700">
                                                            Текст вопроса
                                                            {hasLatex && (
                                                                <span className="ml-2 text-xs text-blue-600">
                                                                    <Code className="h-3 w-3 inline mr-1" />
                                                                    Содержит LaTeX формулы
                                                                </span>
                                                            )}
                                                            {hasMedia && (
                                                                <span className="ml-2 text-xs text-gray-600">
                                                                    <ImageIcon className="h-3 w-3 inline mr-1" />
                                                                    Содержит медиа
                                                                </span>
                                                            )}
                                                        </label>
                                                        {shouldShowPreviewButton && (
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePreview(questionIndex)}
                                                                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
                                                            >
                                                                {showPreview[questionIndex] ? (
                                                                    <>
                                                                        <EyeOff className="h-4 w-4 mr-1" />
                                                                        Скрыть предпросмотр
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Eye className="h-4 w-4 mr-1" />
                                                                        Показать предпросмотр
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <textarea
                                                        value={question.question_text || ''}
                                                        onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                                                        rows={3}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-mono"
                                                        placeholder="Введите текст вопроса (используйте r&quot;...&quot; для LaTeX формул, {...} для медиа)..."
                                                    />

                                                    {showPreview[questionIndex] && shouldShowPreviewButton && (
                                                        <div className="mt-3 p-4 border border-gray-200 rounded-md bg-gray-50">
                                                            <div className="text-xs text-gray-500 mb-2 flex items-center">
                                                                <Eye className="h-3 w-3 mr-1" />
                                                                Предпросмотр:
                                                            </div>
                                                            <div className="whitespace-pre-wrap">
                                                                <RichTextPreview
                                                                    text={question.question_text || ''}
                                                                    showMediaPreview={true}
                                                                    maxMediaHeight={150}
                                                                    showLaTeXPreview={true}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Тип вопроса */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Тип вопроса
                                                    </label>
                                                    <select
                                                        value={question.question_type}
                                                        onChange={(e) => updateQuestion(questionIndex, 'question_type', e.target.value)}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                                    >
                                                        <option value="single_choice">Один правильный ответ</option>
                                                        <option value="multiple_choice">Несколько правильных ответов</option>
                                                    </select>
                                                </div>

                                                {/* Варианты ответов */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="block text-sm font-medium text-gray-700">
                                                            Варианты ответов
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => addOption(questionIndex)}
                                                            className="text-sm text-primary-600 hover:text-primary-800"
                                                        >
                                                            + Добавить ответ
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {question.options.map((option, optionIndex) =>
                                                        {
                                                            const hasLatexInOption = containsLatex(option.option_text || '')
                                                            const hasMediaInOption = containsMedia(option.option_text || '')
                                                            const shouldShowOptionPreview = hasLatexInOption || hasMediaInOption
                                                            const isOptionPreviewVisible = showPreview[questionIndex] && shouldShowOptionPreview

                                                            console.log(`Option ${optionIndex} text:`, option.option_text);
                                                            console.log(`Option Contains LaTeX:`, hasLatexInOption);
                                                            console.log(`Option Contains Media:`, hasMediaInOption);

                                                            return (
                                                                <div key={optionIndex} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                                                                    <div className="flex items-center h-10">
                                                                        <input
                                                                            type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                                                                            name={`question-${questionIndex}`}
                                                                            checked={option.is_correct}
                                                                            onChange={(e) => updateOption(questionIndex, optionIndex, 'is_correct', e.target.checked)}
                                                                            className={`h-4 w-4 ${question.question_type === 'single_choice' ? 'rounded-full' : 'rounded'} text-primary-600 border-gray-300 focus:ring-primary-500`}
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <label className="block text-sm font-medium text-gray-700">
                                                                                Ответ #{optionIndex + 1}
                                                                                {option.is_correct && (
                                                                                    <Badge type="success" size="sm" className="ml-2">
                                                                                        Правильный
                                                                                    </Badge>
                                                                                )}
                                                                                {hasLatexInOption && (
                                                                                    <Badge type="info" size="sm" className="ml-2">
                                                                                        <Code className="h-3 w-3 mr-1" />
                                                                                        LaTeX
                                                                                    </Badge>
                                                                                )}
                                                                                {hasMediaInOption && (
                                                                                    <Badge type="secondary" size="sm" className="ml-2">
                                                                                        <ImageIcon className="h-3 w-3 mr-1" />
                                                                                        Медиа
                                                                                    </Badge>
                                                                                )}
                                                                            </label>
                                                                            {shouldShowOptionPreview && (
                                                                                <span className="text-xs text-gray-500">
                                                                                    Нажмите "Показать предпросмотр" в вопросе для отображения
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <textarea
                                                                            value={option.option_text || ''}
                                                                            onChange={(e) => updateOption(questionIndex, optionIndex, 'option_text', e.target.value)}
                                                                            rows={2}
                                                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-mono"
                                                                            placeholder={`Текст ответа ${optionIndex + 1} (используйте r&quot;...&quot; для LaTeX формул, {...} для медиа)`}
                                                                        />

                                                                        {isOptionPreviewVisible && (
                                                                            <div className="mt-2 p-2 border border-gray-200 rounded-md bg-white">
                                                                                <div className="text-xs text-gray-500 mb-1">Предпросмотр ответа:</div>
                                                                                <div className="text-sm">
                                                                                    <RichTextPreview
                                                                                        text={option.option_text || ''}
                                                                                        showMediaPreview={true}
                                                                                        maxMediaHeight={100}
                                                                                        showLaTeXPreview={true}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeOption(questionIndex, optionIndex)}
                                                                        className="text-red-600 hover:text-red-800 p-2"
                                                                        disabled={question.options.length <= 2}
                                                                    >
                                                                        Удалить
                                                                    </button>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Объяснение */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Объяснение (подсказка)
                                                        {containsLatex(question.explanation || '') && (
                                                            <span className="ml-2 text-xs text-blue-600">
                                                                <Code className="h-3 w-3 inline mr-1" />
                                                                Содержит LaTeX формулы
                                                            </span>
                                                        )}
                                                        {containsMedia(question.explanation || '') && (
                                                            <span className="ml-2 text-xs text-gray-600">
                                                                <ImageIcon className="h-3 w-3 inline mr-1" />
                                                                Содержит медиа
                                                            </span>
                                                        )}
                                                    </label>
                                                    <textarea
                                                        value={question.explanation || ''}
                                                        onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                                                        rows={2}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-mono"
                                                        placeholder="Объяснение к вопросу (используйте r&quot;...&quot; для LaTeX формул)..."
                                                    />

                                                    {/* Предпросмотр для объяснения */}
                                                    {showPreview[questionIndex] && question.explanation && (
                                                        <div className="mt-2 p-3 border border-gray-200 rounded-md bg-blue-50">
                                                            <div className="text-xs text-gray-500 mb-2 flex items-center">
                                                                <Eye className="h-3 w-3 mr-1" />
                                                                Предпросмотр объяснения:
                                                            </div>
                                                            <div className="prose prose-sm max-w-none">
                                                                <RichTextPreview
                                                                    text={question.explanation}
                                                                    showMediaPreview={true}
                                                                    maxMediaHeight={150}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Ошибки импорта */}
                {parsedData.errors_count > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center text-yellow-800 mb-2">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            <span className="font-medium">Ошибки при импорте:</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                            {parsedData.errors.map((error, idx) => (
                                <div key={idx} className="text-sm text-yellow-700 mb-1">
                                    • {error}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Кнопки */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={handleBackToImport}
                        disabled={loading}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Вернуться к загрузке
                    </Button>

                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Отмена
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={loading || editedQuestions.length === 0}
                            loading={loading}
                            icon={<Save className="h-4 w-4" />}
                        >
                            Импортировать {editedQuestions.length} вопросов
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={parsedData ? "Предпросмотр импортированных вопросов" : "Импорт вопросов"}
            subtitle={parsedData ? `Файл: ${parsedData.file_name}` : "Загрузка из XLSX файла"}
            maxWidth="6xl"
            showFooter={false}
            scrollable
        >
            {parsing ? (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner message="Анализ файла..." />
                </div>
            ) : parsedData ? (
                renderStep2()
            ) : (
                renderStep1()
            )}
        </FormModal>
    )
}

export default ImportModal