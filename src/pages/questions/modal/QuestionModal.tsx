// frontend/src/pages/questions/modal/QuestionModal.tsx
import React, { useCallback, useState, useEffect } from 'react'
import { useQuestionForm } from '@/hooks/useQuestionForm'
import { QuestionBlocks } from '@/pages/questions/blocks/QuestionBlocks'
import { BasicFields } from '@/pages/questions/common/BasicFields/BasicFields'
import { HintSection } from '@/pages/questions/common/HintSection/HintSection'
import { VariantsSection } from '@/pages/questions/common/VariantsSection/VariantsSection'
import { BlockType, Question, QuestionType } from '@/types'
import toast from 'react-hot-toast'
import FormModal from '@/components/common/FormModal'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const CLOUDFLARE_IFRAME_PREFIX = "https://customer-udg2rk5bpm1tzy74.cloudflarestream.com/"

const buildCloudflareIframeLink = (videoId: string) =>
{
  if (!videoId) return ""
  return `${CLOUDFLARE_IFRAME_PREFIX}${videoId}/iframe`
}

interface QuestionModalProps
{
  question?: Question | null
  onSubmit: (data: any) => Promise<void>
  onClose: () => void
  defaultType?: QuestionType
  isOpen: boolean
  preselectedSubjectId?: number | null
  preselectedTopicId?: number | null
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  question,
  onSubmit,
  onClose,
  defaultType = QuestionType.SINGLE_CHOICE,
  isOpen,
  preselectedSubjectId,
  preselectedTopicId
}) =>
{
  const [saving, setSaving] = useState(false)

  // Создаём начальные данные для предзаполнения
  const initialData = !question ? {
    subject_id: preselectedSubjectId || undefined,
    topic_id: preselectedTopicId || undefined,
    question_type: defaultType,
    // Добавляем один текстовый блок в blocks
    blocks: [{ type: BlockType.TEXT, value: '', order: 0 }],
    // Добавляем два варианта с текстовыми блоками
    variants: [
      {
        blocks: [{ type: BlockType.TEXT, value: '', order: 0 }],
        is_correct: false,
        weight: 0
      },
      {
        blocks: [{ type: BlockType.TEXT, value: '', order: 0 }],
        is_correct: false,
        weight: 0
      }
    ],
    hint: { blocks: [] } // пустая подсказка
  } : undefined

  const {
    formData,
    subjects,
    topics,
    entOptions,
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
  } = useQuestionForm(question, defaultType, initialData)

  const handleSubmit = useCallback(async (e?: React.FormEvent) =>
  {
    if (e) e.preventDefault()
    if (saving) return
    setSaving(true)

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
        : formData.hint

      const submitData = {
        ...formData,
        hint: formattedHint,
        type: formData.question_type,
        topic_id: formData.topic_id,
        subject_id: formData.subject_id,
        ent_option_id: formData.ent_option_id,
      }

      await onSubmit(submitData)
      onClose()
    } catch (error: any)
    {
      console.error("Error saving question:", error)
      toast.error(error.message || "Произошла ошибка при сохранении")
    } finally
    {
      setSaving(false)
    }
  }, [formData, onSubmit, saving, onClose])

  const handleSubjectChangeAdapter = useCallback(
    (value: string) => handleSubjectChange(value ? parseInt(value) : null),
    [handleSubjectChange]
  )

  const handleAddQuestionBlockAdapter = useCallback(
    (type: "media" | "text") => addQuestionBlock(type as BlockType),
    [addQuestionBlock]
  )

  const handleAddVariantBlockAdapter = useCallback(
    (variantIndex: number, type: "media" | "text") => addVariantBlock(variantIndex, type as BlockType),
    [addVariantBlock]
  )

  const handleAddHintBlockAdapter = useCallback(
    (type: "media" | "text" | "video") => addHintBlock(type as BlockType),
    [addHintBlock]
  )

  const modalTitle = question ? "Редактирование вопроса" : "Создание вопроса"
  const modalSubtitle = question ? `Вопрос #${question.id}` : "Новый вопрос"

  // Определяем, нужно ли блокировать поля
  const isSubjectReadOnly = !!preselectedSubjectId && !question
  const isTopicReadOnly = !!preselectedTopicId && !question
  const isTypeReadOnly = !!defaultType && !question

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      maxWidth="7xl"
      onSave={handleSubmit}
      saveText={question ? "Обновить вопрос" : "Создать вопрос"}
      isLoading={saving}
      scrollable
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {loadingSubjects ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner message="Загрузка данных..." />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Основные параметры */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-lg font-medium text-gray-900">Основные параметры</h4>
              </div>
              <BasicFields
                formData={formData}
                subjects={subjects}
                topics={topics}
                entOptions={entOptions}
                loadingSubjects={loadingSubjects}
                onSubjectChange={handleSubjectChangeAdapter}
                onChange={handleChange}
                subjectReadOnly={isSubjectReadOnly}
                topicReadOnly={isTopicReadOnly}
                typeReadOnly={isTypeReadOnly}
              />
            </div>

            {/* Содержание вопроса */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Содержание вопроса</h4>
                  <p className="text-sm text-gray-500">Текст и медиа-контент вопроса</p>
                </div>
              </div>
              <QuestionBlocks
                blocks={formData.blocks}
                onChange={handleQuestionBlockChange}
                onAdd={handleAddQuestionBlockAdapter}
                onRemove={removeQuestionBlock}
              />
            </div>

            {/* Варианты ответов */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Варианты ответов</h4>
                  <p className="text-sm text-gray-500">
                    {formData.question_type === QuestionType.SINGLE_CHOICE
                      ? "Выберите один правильный ответ"
                      : "Отметьте все правильные ответы"}
                  </p>
                </div>
              </div>
              <VariantsSection
                variants={formData.variants as any}
                onVariantChange={handleVariantChange}
                onAddVariantBlock={handleAddVariantBlockAdapter}
                onRemoveVariantBlock={removeVariantBlock}
                onAddVariant={addVariant}
                onRemoveVariant={removeVariant}
                onCorrectAnswerChange={handleCorrectAnswerChange}
              />
            </div>

            {/* Подсказка */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Подсказка</h4>
                  <p className="text-sm text-gray-500">Опциональная подсказка для вопроса</p>
                </div>
              </div>
              <HintSection
                hint={formData.hint as any}
                onChange={handleHintChange}
                onAdd={handleAddHintBlockAdapter}
                onRemove={removeHintBlock}
              />
            </div>
          </div>
        )}
      </form>
    </FormModal>
  )
}

export default QuestionModal