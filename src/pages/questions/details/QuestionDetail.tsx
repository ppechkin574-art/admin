import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import
{
  ArrowLeft,
  Save,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Hash,
  HelpCircle,
  Image,
  Video,
  Type,
  Code,
} from 'lucide-react'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useQuestionForm } from '@/hooks/useQuestionForm'
import { QuestionBlocks } from '@/pages/questions/blocks/QuestionBlocks'
import { BasicFields } from '@/pages/questions/common/BasicFields/BasicFields'
import { LocalizationFields } from '@/pages/questions/common/LocalizationFields/LocalizationFields'
import { HintSection } from '@/pages/questions/common/HintSection/HintSection'
import { VariantsSection } from '@/pages/questions/common/VariantsSection/VariantsSection'
import { questionService } from '@/services/api'
import { useQuestionStore } from '@/stores/questionStore'
import { useSubjectStore } from '@/stores/subjectStore'
import { useTopicStore } from '@/stores/topicStore'
import { useEntStore } from '@/stores/entStore'
import { BlockType, Question, QuestionType } from '@/types'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import ConfirmModal from '@/components/common/ConfirmModal'
import { useResourceLoading } from '@/hooks/useResourceLoading'
import { DetailWrapper } from '@/components/details/DetailWrapper'
import RichTextPreview from '@/components/common/RichTextPreview'
import { containsLatex } from '../../../utils/textParser'

const CLOUDFLARE_IFRAME_PREFIX = "https://customer-udg2rk5bpm1tzy74.cloudflarestream.com/"

const getSafeArray = (data: any): any[] =>
{
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'object' && data.data)
    return Array.isArray(data.data) ? data.data : []
  return []
}

export const QuestionDetail: React.FC = () =>
{
  const { id } = useParams<{ id: string }>()
  const { handleApiError } = useApiErrorHandler()
  const navigate = useNavigate()

  const { allQuestions, updateQuestionInCache, updateQuestion } = useQuestionStore()
  const { subjects } = useSubjectStore()
  const { topics } = useTopicStore()
  const { entOptions } = useEntStore()

  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const {
    resource: question,
    loading,
    error,
    refresh: refreshQuestion
  } = useResourceLoading<Question>({
    id: id ? parseInt(id) : undefined,
    storeIdGetter: () => allQuestions.find(q => q.id === parseInt(id!)),
    apiFetcher: questionService.getById,
    resourceName: 'вопрос'
  })

  const {
    formData,
    loadingSubjects,
    handleSubjectChange,
    handleChange,
    handleQuestionBlockChange,
    addQuestionBlock,
    removeQuestionBlock,
    handleVariantChange,
    addVariantBlock,
    removeVariantBlock,
    addVariant,
    removeVariant,
    handleHintChange,
    addHintBlock,
    removeHintBlock,
    handleCorrectAnswerChange,
    resetForm,
    resetToQuestion,
  } = useQuestionForm(question)

  const safeSubjects = useMemo(() => getSafeArray(subjects), [subjects])
  const safeTopics = useMemo(() => getSafeArray(topics), [topics])
  const safeEntOptions = useMemo(() => getSafeArray(entOptions), [entOptions])

  const buildCloudflareIframeLink = useCallback((videoId: string) =>
  {
    if (!videoId) return ""
    return `${CLOUDFLARE_IFRAME_PREFIX}${videoId}/iframe`
  }, [])

  const handleSave = useCallback(async () =>
  {
    if (!id || !question) return;

    if (!formData.variants || formData.variants.length < 2)
    {
      toast.error('Добавьте минимум два варианта ответа');
      return;
    }

    const correctCount = formData.variants.filter(v => v.is_correct).length;

    if (formData.question_type === QuestionType.SINGLE_CHOICE)
    {
      if (correctCount !== 1)
      {
        toast.error('Для одиночного выбора должен быть отмечен ровно один правильный ответ');
        return;
      }
    } else if (formData.question_type === QuestionType.MULTIPLE_CHOICE)
    {
      if (correctCount < 2)
      {
        toast.error('Для множественного выбора необходимо отметить не менее двух правильных ответов');
        return;
      }
    }

    setSaving(true);
    try
    {
      const formattedHint = formData.hint
        ? {
          ...formData.hint,
          blocks: formData.hint.blocks.map((block) =>
            block.type === BlockType.VIDEO
              ? { ...block, value: buildCloudflareIframeLink(block.value) }
              : block
          ),
        }
        : formData.hint;

      const submitData = {
        ...formData,
        hint: formattedHint,
        type: formData.question_type,
        topic_id: formData.topic_id,
        subject_id: formData.subject_id,
        ent_option_id: formData.ent_option_id,
      };
      delete submitData.question_type;

      const updatedQuestion = await questionService.update(parseInt(id), submitData);

      updateQuestionInCache(updatedQuestion);

      setIsEditing(false);
      toast.success("Вопрос успешно обновлен");
    } catch (error: any)
    {
      console.error("Error updating question:", error);
      handleApiError(error, "Ошибка обновления вопроса");
      toast.error("Ошибка обновления вопроса");
    } finally
    {
      setSaving(false);
    }
  }, [id, formData, handleApiError, buildCloudflareIframeLink, updateQuestionInCache, question]);

  const handleDelete = useCallback(async () =>
  {
    if (!id) return

    try
    {
      await questionService.delete(parseInt(id))
      toast.success("Вопрос успешно удален")
      navigate('/questions')
    } catch (error: any)
    {
      console.error("Error deleting question:", error)
      handleApiError(error, "Ошибка удаления вопроса")
      toast.error("Ошибка удаления вопроса")
    }
  }, [id, navigate, handleApiError])

  const toggleEditMode = useCallback(() =>
  {
    if (isEditing)
      resetToQuestion()
    setIsEditing(!isEditing)
  }, [isEditing, resetToQuestion])

  const getTypeBadgeType = useCallback((type: QuestionType): any =>
  {
    switch (type)
    {
      case QuestionType.SINGLE_CHOICE:
        return "success"
      case QuestionType.MULTIPLE_CHOICE:
        return "primary"
      case QuestionType.ENT:
        return "warning"
      default:
        return "secondary"
    }
  }, [])

  const getTypeText = useCallback((type: QuestionType): string =>
  {
    switch (type)
    {
      case QuestionType.SINGLE_CHOICE:
        return "Одиночный выбор"
      case QuestionType.MULTIPLE_CHOICE:
        return "Множественный выбор"
      case QuestionType.ENT:
        return "ЕНТ"
      default:
        return type
    }
  }, [])

  const getDifficultyBadgeType = useCallback((difficulty: string): any =>
  {
    switch (difficulty)
    {
      case "easy":
        return "success"
      case "medium":
        return "warning"
      case "hard":
        return "error"
      default:
        return "secondary"
    }
  }, [])

  const getDifficultyText = useCallback((difficulty: string): string =>
  {
    switch (difficulty)
    {
      case "easy":
        return "Легкий"
      case "medium":
        return "Средний"
      case "hard":
        return "Сложный"
      default:
        return difficulty
    }
  }, [])

  const currentQuestionType = useMemo(
    () => question?.question_type || question?.type || QuestionType.SINGLE_CHOICE,
    [question]
  )

  const currentDifficulty = useMemo(
    () => question?.difficulty || "medium",
    [question]
  )

  const variantsForComponent = formData.variants as any
  const hintForComponent = formData.hint as any

  const hasMediaAnywhere = (question: Question): boolean =>
  {
    if (question.blocks?.some(block => block.type === 'media' || block.type === 'video')) return true;
    if (question.variants?.some(v => v.blocks?.some(b => b.type === 'media' || b.type === 'video'))) return true;
    if (question.hint?.blocks?.some(b => b.type === 'media' || b.type === 'video')) return true;
    return false;
  };

  const hasLatexAnywhere = (question: Question): boolean =>
  {
    const check = (text: string) => containsLatex(text);
    if (question.blocks?.some(b => b.type === 'text' && check(b.value))) return true;
    if (question.variants?.some(v => v.blocks?.some(b => b.type === 'text' && check(b.value)))) return true;
    if (question.hint?.blocks?.some(b => b.type === 'text' && check(b.value))) return true;
    return false;
  };

  const questionStats = useMemo(() =>
  {
    if (!question) return []
    const hasMedia = hasMediaAnywhere(question);
    const hasLatex = hasLatexAnywhere(question);
    const hasHint = !!(question.hint && question.hint.blocks && question.hint.blocks.length > 0)

    const correctVariants = question.variants?.filter(v => v.is_correct).length || 0

    const totalVariants = question.variants?.length || 0

    return [
      { label: "Вариантов ответа", value: totalVariants, icon: <Hash className="h-4 w-4 text-gray-400" /> },
      { label: "Правильных ответов", value: correctVariants, icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
      { label: "Медиа", value: hasMedia ? "Есть" : "Нет", icon: hasMedia ? <Image className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" /> },
      { label: "Latex", value: hasLatex ? "Есть" : "Нет", icon: hasLatex ? <Code className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" /> },
      { label: "Подсказка", value: hasHint ? "Есть" : "Нет", icon: hasHint ? <HelpCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" /> }
    ]
  }, [question])

  useEffect(() =>
  {
    return () =>
    {
      if (typeof resetForm === "function") resetForm()
    }
  }, [resetForm])

  const renderBlock = (block: any, index: number) =>
  {
    switch (block.type)
    {
      case 'text':
        return (
          <div key={index} className="mb-4 last:mb-0">
            <RichTextPreview
              text={block.value}
              showMediaPreview={false}
              showLaTeXPreview={true}
            />
          </div>
        )
      case 'media':
        return (
          <div key={index} className="mb-4 last:mb-0">
            {block.value && (
              <img
                src={block.value}
                alt="Медиа контент"
                className="max-w-full h-auto rounded-lg border border-gray-200"
              />
            )}
          </div>
        )
      case 'video':
        return (
          <div key={index} className="mb-4 last:mb-0">
            {block.value && (
              <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden bg-black">
                <iframe
                  src={block.value}
                  className="absolute top-0 left-0 w-full h-full"
                  allowFullScreen
                  title="Видео"
                />
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <DetailWrapper
      loading={loading}
      error={error}
      entity={question}
      entityName="вопрос"
      onRetry={refreshQuestion}
    >
      {question && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    icon={<ArrowLeft className="h-4 w-4" />}
                    size="sm"
                    disabled={saving || isEditing}
                  >
                    Назад
                  </Button>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                      Вопрос #{question.id}
                    </h1>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge type={getTypeBadgeType(currentQuestionType)}>
                        {getTypeText(currentQuestionType)}
                      </Badge>
                      <Badge type={getDifficultyBadgeType(currentDifficulty)}>
                        {getDifficultyText(currentDifficulty)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={toggleEditMode}
                        disabled={saving}
                      >
                        Отмена
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving}
                        loading={saving}
                        icon={<Save className="h-4 w-4" />}
                      >
                        Сохранить
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteConfirmOpen(true)}
                        icon={<Trash2 className="h-4 w-4" />}
                      >
                        Удалить
                      </Button>
                      <Button
                        variant="primary"
                        onClick={toggleEditMode}
                        icon={<Edit className="h-4 w-4" />}
                      >
                        Редактировать
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {questionStats.map((stat, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {stat.icon}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                      <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">Основные параметры</h3>
                    </div>
                    <div className="p-6">
                      {loadingSubjects ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        </div>
                      ) : (
                        <BasicFields
                          formData={formData}
                          subjects={safeSubjects}
                          topics={safeTopics}
                          entOptions={safeEntOptions}
                          loadingSubjects={loadingSubjects}
                          onSubjectChange={handleSubjectChange}
                          onChange={handleChange}
                        />
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6">
                      <LocalizationFields
                        task_description_ru={formData.task_description_ru}
                        task_description_kk={formData.task_description_kk}
                        question_translation_ru={formData.question_translation_ru}
                        question_translation_kk={formData.question_translation_kk}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center">
                        <Type className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Содержание вопроса</h3>
                      </div>
                      <p className="text-sm text-gray-500">Текст и медиа-контент вопроса</p>
                    </div>
                    <div className="p-6">
                      <QuestionBlocks
                        blocks={formData.blocks}
                        onChange={handleQuestionBlockChange}
                        onAdd={addQuestionBlock}
                        onRemove={removeQuestionBlock}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Варианты ответов</h3>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formData.question_type === QuestionType.SINGLE_CHOICE
                          ? "Выберите один правильный ответ"
                          : "Отметьте все правильные ответы"}
                      </p>
                    </div>
                    <div className="p-6">
                      <VariantsSection
                        variants={variantsForComponent}
                        onVariantChange={handleVariantChange}
                        onAddVariantBlock={addVariantBlock}
                        onRemoveVariantBlock={removeVariantBlock}
                        onAddVariant={addVariant}
                        onRemoveVariant={removeVariant}
                        onCorrectAnswerChange={handleCorrectAnswerChange}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Подсказка</h3>
                      </div>
                      <p className="text-sm text-gray-500">Опциональная подсказка для вопроса</p>
                    </div>
                    <div className="p-6">
                      <HintSection
                        hint={hintForComponent}
                        onChange={handleHintChange}
                        onAdd={addHintBlock}
                        onRemove={removeHintBlock}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center">
                      <Type className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">Содержание вопроса</h3>
                    </div>
                    <div className="p-6">
                      <div className="prose prose-sm max-w-none">
                        {question.blocks?.map((block, index) => renderBlock(block, index))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Варианты ответов</h3>
                      </div>
                      <Badge type={currentQuestionType === QuestionType.SINGLE_CHOICE ? 'success' : 'primary'}>
                        {currentQuestionType === QuestionType.SINGLE_CHOICE
                          ? 'Один правильный ответ'
                          : 'Несколько правильных ответов'}
                      </Badge>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {question.variants?.map((variant, index) =>
                        {
                          const hasMedia = variant.blocks?.some(b => b.type === 'media') || false
                          const hasVideo = variant.blocks?.some(b => b.type === 'video') || false
                          return (
                            <div
                              key={index}
                              className={`p-4 border rounded-lg ${variant.is_correct
                                ? 'border-green-200 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">
                                  {variant.is_correct ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      Вариант {index + 1}
                                      {hasMedia && <Image className="h-4 w-4 inline ml-2 text-blue-500" />}
                                      {hasVideo && <Video className="h-4 w-4 inline ml-2 text-purple-500" />}
                                    </span>
                                    {variant.is_correct && (
                                      <Badge type="success" size="sm">
                                        Правильный
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="prose prose-sm max-w-none">
                                    {variant.blocks?.map((block, blockIndex) => renderBlock(block, blockIndex))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {question.hint && question.hint.blocks && question.hint.blocks.length > 0 && (
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200 flex items-center">
                        <HelpCircle className="h-5 w-5 text-blue-500 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Подсказка</h3>
                      </div>
                      <div className="p-6">
                        <div className="prose prose-sm max-w-none">
                          {question.hint.blocks.map((block, index) => renderBlock(block, index))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <ConfirmModal
            isOpen={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
            onConfirm={handleDelete}
            title="Удаление вопроса"
            message={`Вы уверены, что хотите удалить вопрос #${question.id}? Это действие нельзя отменить.`}
            confirmText="Удалить"
            cancelText="Отмена"
            type="danger"
            isLoading={saving}
          />
        </div>
      )}
    </DetailWrapper>
  )
}

export default QuestionDetail