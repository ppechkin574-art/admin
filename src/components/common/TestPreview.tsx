import React, { useState } from 'react'
import
    {
        ChevronDown,
        ChevronUp,
        Eye,
        EyeOff,
        CheckCircle,
        XCircle,
        FileText,
        AlertCircle,
        BarChart3,
        Clock,
        Users
    } from 'lucide-react'

interface Question
{
    question_text: string
    question_type: string
    options: Array<{
        option_text: string
        is_correct: boolean
        order_index: number
    }>
    order_index: number
    explanation?: string
    original_question_number?: number
    points?: number
}

interface TestPreviewProps
{
    questions: Question[]
    errors?: string[]
    errorsCount?: number
    questionsCount?: number
    fileName?: string
    analysis?: {
        has_media: boolean
        has_latex: boolean
        question_types: {
            single_choice: number
            multiple_choice: number
        }
        total_options: number
    }
    onEdit?: () => void
    onSave?: () => void
    isViewMode?: boolean
    isLoading?: boolean
}

const TestPreview: React.FC<TestPreviewProps> = ({
    questions = [],
    errors = [],
    errorsCount = 0,
    questionsCount = 0,
    fileName = 'файла',
    analysis,
    onEdit,
    onSave,
    isViewMode = false,
    isLoading = false
}) =>
{
    const [expandedQuestions, setExpandedQuestions] = useState<number[]>([])
    const [showPreview, setShowPreview] = useState<{ [key: number]: boolean }>({})

    const toggleQuestion = (questionIndex: number) =>
    {
        if (expandedQuestions.includes(questionIndex))
        {
            setExpandedQuestions(expandedQuestions.filter(q => q !== questionIndex))
        } else
        {
            setExpandedQuestions([...expandedQuestions, questionIndex])
        }
    }

    const togglePreview = (questionIndex: number) =>
    {
        setShowPreview(prev => ({
            ...prev,
            [questionIndex]: !prev[questionIndex]
        }))
    }

    const questionTypes = analysis?.question_types || { single_choice: 0, multiple_choice: 0 }

    return (
        <div className="space-y-6">
            {/* Заголовок и статистика */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-4">
                    Статистика импорта
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                        <div className="text-sm text-blue-800">Всего вопросов</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-green-600">
                            {questions.filter(q => q.question_type === 'single_choice').length}
                        </div>
                        <div className="text-sm text-blue-800">Вопросов с одним ответом</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-purple-600">
                            {questions.filter(q => q.question_type === 'multiple_choice').length}
                        </div>
                        <div className="text-sm text-blue-800">Вопросов с несколькими ответами</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-red-600">{errorsCount}</div>
                        <div className="text-sm text-blue-800">Ошибок при импорте</div>
                    </div>
                </div>

                {/* Дополнительная информация */}
                {analysis && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center text-sm text-blue-700">
                            {analysis.has_media ? (
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 mr-2 text-gray-400" />
                            )}
                            <span>Медиа: {analysis.has_media ? 'Есть' : 'Нет'}</span>
                        </div>
                        <div className="flex items-center text-sm text-blue-700">
                            {analysis.has_latex ? (
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 mr-2 text-gray-400" />
                            )}
                            <span>Формулы LaTeX: {analysis.has_latex ? 'Есть' : 'Нет'}</span>
                        </div>
                        <div className="flex items-center text-sm text-blue-700">
                            <FileText className="h-4 w-4 mr-2 text-blue-600" />
                            <span>Всего вариантов: {analysis.total_options || 0}</span>
                        </div>
                    </div>
                )}

                {errorsCount > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center text-red-600 mb-2">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            <span className="font-medium">Ошибки при импорте:</span>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                            {errors.map((error, idx) => (
                                <div key={idx} className="text-sm text-red-700 mb-1">
                                    • {error}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Вопросы */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                        Вопросы ({questions.length})
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            {isViewMode ? 'Просмотр вопросов' : 'Вы можете редактировать любой вопрос перед сохранением'}
                        </span>
                    </h3>
                    {!isViewMode && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                            disabled={isLoading}
                        >
                            Редактировать
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {questions.map((question, questionIndex) => (
                        <div key={questionIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => toggleQuestion(questionIndex)}
                                    className="flex-1 flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    type="button"
                                >
                                    <div className="flex items-center">
                                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                        <div className="text-left">
                                            <div className="font-medium text-gray-900">
                                                Вопрос #{question.original_question_number || questionIndex + 1}
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    {question.question_type === 'single_choice' ? 'Один ответ' :
                                                        question.question_type === 'multiple_choice' ? 'Несколько ответов' : 'Текстовый ответ'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 truncate max-w-2xl">
                                                {question.question_text ?
                                                    (question.question_text.length > 100 ?
                                                        question.question_text.substring(0, 100) + '...' :
                                                        question.question_text
                                                    ) :
                                                    'Нет текста вопроса'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-500 mr-3">
                                            {question.options?.length || 0} вариантов ответа
                                        </span>
                                        {expandedQuestions.includes(questionIndex) ? (
                                            <ChevronUp className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                </button>
                            </div>

                            {expandedQuestions.includes(questionIndex) && (
                                <div className="p-6 border-t border-gray-200">
                                    <div className="space-y-4">
                                        {/* Текст вопроса */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Текст вопроса
                                                </label>
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
                                            </div>

                                            {isViewMode ? (
                                                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                                                    <div className="prose prose-sm max-w-none">
                                                        {question.question_text}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <textarea
                                                        value={question.question_text || ''}
                                                        readOnly={isViewMode}
                                                        rows={3}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                                        placeholder="Введите текст вопроса..."
                                                    />

                                                    {showPreview[questionIndex] && (
                                                        <div className="mt-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                                                            <div className="text-xs text-gray-500 mb-2">Предпросмотр:</div>
                                                            <div className="prose prose-sm max-w-none">
                                                                {question.question_text}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Варианты ответов */}
                                        {question.question_type !== 'text' && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Варианты ответов
                                                    </label>
                                                </div>

                                                <div className="space-y-3">
                                                    {question.options.map((option, optionIndex) => (
                                                        <div key={optionIndex} className={`flex items-start space-x-3 p-3 rounded-lg ${option.is_correct ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                                            <div className="flex items-center h-10">
                                                                <div className={`h-4 w-4 ${question.question_type === 'single_choice' ? 'rounded-full' : 'rounded'} border-2 ${option.is_correct ? 'border-green-500 bg-green-500' : 'border-gray-300'}`} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <label className="block text-sm font-medium text-gray-700">
                                                                        Ответ #{optionIndex + 1}
                                                                        {option.is_correct && (
                                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                                Правильный
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                </div>
                                                                <div className="p-2 border border-gray-200 rounded-md bg-white">
                                                                    <div className="text-sm">
                                                                        {option.option_text}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Объяснение */}
                                        {question.explanation && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Объяснение (подсказка)
                                                </label>
                                                <div className="p-2 border border-gray-200 rounded-md bg-blue-50">
                                                    {question.explanation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Кнопки действий */}
            {!isViewMode && onSave && (
                <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button
                        onClick={onSave}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Сохранение...
                            </>
                        ) : (
                            'Сохранить тест'
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}

export default TestPreview