import React, { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  Save,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  Ban,
  ShieldCheck,
  BookOpen,
  Copy,
  Type,
  Image as ImageIcon,
} from "lucide-react";

import { questionDraftService } from "@/services/api";
import {
  DraftBlock,
  DraftVariant,
  QuestionDraft,
  QuestionDraftUpdate,
} from "@/types/questionDrafts";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import ConfirmModal from "@/components/common/ConfirmModal";
import RichTextPreview from "@/components/common/RichTextPreview";
import { LocalizationFields } from "@/pages/questions/common/LocalizationFields/LocalizationFields";
import {
  STATUS_META,
  confidenceBadgeType,
  formatScore,
  getDifficultyBadgeType,
  getDifficultyText,
  getQuestionTypeText,
  isMultiCorrectType,
} from "./utils";

interface Props {
  draft: QuestionDraft;
  isOpen: boolean;
  onClose: () => void;
  // Called after a successful patch/publish/reject/delete so the list can
  // refresh / drop the row. `removed` => publish/reject/delete (leaves the
  // `draft` filter); otherwise it's an in-place edit.
  onChanged: (updated: QuestionDraft | null, removed: boolean) => void;
}

// Local editable copy of the operator-editable fields.
interface EditState {
  blocks: DraftBlock[];
  variants: DraftVariant[];
  task_description_ru: string;
  task_description_kk: string;
  question_translation_ru: string;
  question_translation_kk: string;
  explanation_ru: string;
  explanation_kk: string;
}

const buildEditState = (d: QuestionDraft): EditState => ({
  blocks: (d.blocks ?? []).map((b) => ({ ...b })),
  variants: (d.variants ?? []).map((v) => ({
    ...v,
    blocks: v.blocks ? v.blocks.map((b) => ({ ...b })) : undefined,
  })),
  task_description_ru: d.task_description_ru ?? "",
  task_description_kk: d.task_description_kk ?? "",
  question_translation_ru: d.question_translation_ru ?? "",
  question_translation_kk: d.question_translation_kk ?? "",
  explanation_ru: d.explanation_ru ?? "",
  explanation_kk: d.explanation_kk ?? "",
});

// A variant's display text: prefer a flat `value`, else its first text block.
const variantText = (v: DraftVariant): string => {
  if (v.value != null) return v.value;
  const tb = v.blocks?.find((b) => b.type === "text");
  return tb?.value ?? "";
};

const apiError = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return err?.response?.data?.message || err?.message || fallback;
};

const sectionClass = "bg-white rounded-lg border border-gray-200";
const sectionHeader =
  "px-5 py-3 border-b border-gray-200 flex items-center gap-2";

export const QuestionDraftReviewModal: React.FC<Props> = ({
  draft,
  isOpen,
  onClose,
  onChanged,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<EditState>(() => buildEditState(draft));
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const multiCorrect = isMultiCorrectType(draft.question_type);
  const isTerminal =
    draft.status === "published" || draft.status === "rejected";

  // ── edit-state mutators ────────────────────────────────────────────
  const setBlockValue = useCallback((index: number, value: string) => {
    setEdit((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b, i) => (i === index ? { ...b, value } : b)),
    }));
  }, []);

  const setVariantValue = useCallback((index: number, value: string) => {
    setEdit((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => {
        if (i !== index) return v;
        // Keep editing path consistent with how the value is read: if the
        // variant stores text in blocks, write back into the first text block.
        if (v.value == null && v.blocks?.some((b) => b.type === "text")) {
          return {
            ...v,
            blocks: v.blocks.map((b) =>
              b.type === "text" ? { ...b, value } : b,
            ),
          };
        }
        return { ...v, value };
      }),
    }));
  }, []);

  const toggleCorrect = useCallback(
    (index: number) => {
      setEdit((prev) => ({
        ...prev,
        variants: prev.variants.map((v, i) => {
          if (multiCorrect) {
            return i === index ? { ...v, is_correct: !v.is_correct } : v;
          }
          // single_choice → radio behaviour
          return { ...v, is_correct: i === index };
        }),
      }));
    },
    [multiCorrect],
  );

  const setLocalization = useCallback(
    (field: keyof EditState, value: string) => {
      setEdit((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const startEdit = () => {
    setEdit(buildEditState(draft));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEdit(buildEditState(draft));
    setIsEditing(false);
  };

  const handleSave = useCallback(async () => {
    const correctCount = edit.variants.filter((v) => v.is_correct).length;
    if (edit.variants.length < 2) {
      toast.error("Должно быть минимум два варианта ответа");
      return;
    }
    if (!multiCorrect && correctCount !== 1) {
      toast.error("Для одиночного выбора отметьте ровно один правильный ответ");
      return;
    }
    if (multiCorrect && correctCount < 1) {
      toast.error("Отметьте хотя бы один правильный ответ");
      return;
    }

    setSaving(true);
    try {
      const payload: QuestionDraftUpdate = {
        blocks: edit.blocks,
        variants: edit.variants,
        task_description_ru: edit.task_description_ru,
        task_description_kk: edit.task_description_kk,
        question_translation_ru: edit.question_translation_ru,
        question_translation_kk: edit.question_translation_kk,
        explanation_ru: edit.explanation_ru,
        explanation_kk: edit.explanation_kk,
      };
      const updated = await questionDraftService.update(draft.id, payload);
      toast.success("Черновик сохранён");
      setIsEditing(false);
      onChanged(updated, false);
    } catch (err: any) {
      toast.error(apiError(err, "Не удалось сохранить черновик"));
    } finally {
      setSaving(false);
    }
  }, [draft.id, edit, multiCorrect, onChanged]);

  const handlePublish = useCallback(async () => {
    setActing(true);
    try {
      const published = await questionDraftService.publish(draft.id);
      toast.success(
        published.published_question_id
          ? `Опубликовано — вопрос #${published.published_question_id}`
          : "Черновик опубликован",
      );
      setPublishConfirm(false);
      onChanged(published, true);
    } catch (err: any) {
      toast.error(apiError(err, "Не удалось опубликовать"));
    } finally {
      setActing(false);
    }
  }, [draft.id, onChanged]);

  const handleReject = useCallback(async () => {
    setActing(true);
    try {
      const rejected = await questionDraftService.reject(draft.id);
      toast.success("Черновик отклонён");
      setRejectConfirm(false);
      onChanged(rejected, true);
    } catch (err: any) {
      toast.error(apiError(err, "Не удалось отклонить"));
    } finally {
      setActing(false);
    }
  }, [draft.id, onChanged]);

  const handleDelete = useCallback(async () => {
    setActing(true);
    try {
      await questionDraftService.delete(draft.id);
      toast.success("Черновик удалён");
      setDeleteConfirm(false);
      onChanged(null, true);
    } catch (err: any) {
      toast.error(apiError(err, "Не удалось удалить"));
    } finally {
      setActing(false);
    }
  }, [draft.id, onChanged]);

  const validation = draft.validation;
  const source = draft.source;

  const sourceText = useMemo(() => {
    if (!source) return "";
    return [
      source.book && `${source.book}`,
      source.chapter && `гл. ${source.chapter}`,
      source.page != null && source.page !== "" && `стр. ${source.page}`,
    ]
      .filter(Boolean)
      .join(", ");
  }, [source]);

  if (!isOpen) return null;

  const renderBlockPreview = (block: DraftBlock, index: number) => {
    if (block.type === "media") {
      return (
        <div key={index} className="mb-3 last:mb-0">
          {block.value && (
            <img
              src={block.value}
              alt="Медиа"
              className="max-w-full h-auto rounded-lg border border-gray-200"
            />
          )}
        </div>
      );
    }
    return (
      <div key={index} className="mb-3 last:mb-0">
        <RichTextPreview
          text={block.value}
          showMediaPreview={false}
          showLaTeXPreview
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen px-4 py-8">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={!saving && !acting ? onClose : undefined}
        />

        <div className="relative bg-gray-50 rounded-lg shadow-xl w-full max-w-4xl">
          {/* Header */}
          <div className="bg-white rounded-t-lg px-6 py-4 border-b border-gray-200 flex items-start justify-between sticky top-0 z-10">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Черновик #{draft.id}
                </h2>
                <Badge type={STATUS_META[draft.status]?.badge ?? "secondary"}>
                  {STATUS_META[draft.status]?.label ?? draft.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge type="info">
                  {getQuestionTypeText(draft.question_type)}
                </Badge>
                <Badge type={getDifficultyBadgeType(draft.difficulty)}>
                  {getDifficultyText(draft.difficulty)}
                </Badge>
                {(draft.subject_name || draft.topic_name) && (
                  <span className="text-sm text-gray-500">
                    {draft.subject_name}
                    {draft.topic_name ? ` · ${draft.topic_name}` : ""}
                  </span>
                )}
                {draft.published_question_id && (
                  <Badge type="success">
                    Вопрос #{draft.published_question_id}
                  </Badge>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || acting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Validation panel */}
            {(validation || draft.dedup_of_question_id) && (
              <div className={sectionClass}>
                <div className={sectionHeader}>
                  <ShieldCheck className="h-5 w-5 text-gray-400" />
                  <h3 className="text-base font-medium text-gray-900">
                    Валидация AI
                  </h3>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Уверенность</div>
                    <div className="mt-1">
                      <Badge
                        type={confidenceBadgeType(validation?.confidence)}
                      >
                        {formatScore(validation?.confidence)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Вердикт</div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {validation?.verifier || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      Обоснованность
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {formatScore(validation?.groundedness)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      Похожесть (dedup)
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {formatScore(validation?.dedup_similarity)}
                    </div>
                  </div>
                  {draft.dedup_of_question_id != null && (
                    <div className="col-span-2 md:col-span-4">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-50 text-yellow-800 text-sm">
                        <Copy className="h-4 w-4" />
                        Похож на вопрос #{draft.dedup_of_question_id}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Source provenance */}
            {sourceText && (
              <div className={sectionClass}>
                <div className={sectionHeader}>
                  <BookOpen className="h-5 w-5 text-gray-400" />
                  <h3 className="text-base font-medium text-gray-900">
                    Источник
                  </h3>
                </div>
                <div className="p-5 text-sm text-gray-700">{sourceText}</div>
              </div>
            )}

            {/* Question content */}
            <div className={sectionClass}>
              <div className={sectionHeader}>
                <Type className="h-5 w-5 text-gray-400" />
                <h3 className="text-base font-medium text-gray-900">
                  Содержание вопроса
                </h3>
              </div>
              <div className="p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    {edit.blocks.map((block, index) =>
                      block.type === "media" ? (
                        <div key={index} className="space-y-1">
                          <label className="text-xs text-gray-500 flex items-center gap-1">
                            <ImageIcon className="h-3.5 w-3.5" /> URL медиа
                          </label>
                          <input
                            type="text"
                            value={block.value}
                            onChange={(e) =>
                              setBlockValue(index, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          {block.value && (
                            <img
                              src={block.value}
                              alt="Медиа"
                              className="max-h-40 rounded border border-gray-200 mt-1"
                            />
                          )}
                        </div>
                      ) : (
                        <div key={index} className="space-y-1">
                          <label className="text-xs text-gray-500 flex items-center gap-1">
                            <Type className="h-3.5 w-3.5" /> Текст
                          </label>
                          <textarea
                            rows={3}
                            value={block.value}
                            onChange={(e) =>
                              setBlockValue(index, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {draft.blocks?.map((block, index) =>
                      renderBlockPreview(block, index),
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Variants */}
            <div className={sectionClass}>
              <div className={`${sectionHeader} justify-between`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-gray-400" />
                  <h3 className="text-base font-medium text-gray-900">
                    Варианты ответов
                  </h3>
                </div>
                <Badge type={multiCorrect ? "primary" : "success"}>
                  {multiCorrect
                    ? "Несколько правильных"
                    : "Один правильный"}
                </Badge>
              </div>
              <div className="p-5 space-y-3">
                {(isEditing ? edit.variants : draft.variants)?.map(
                  (variant, index) => {
                    const text = variantText(variant);
                    return (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          variant.is_correct
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isEditing ? (
                            <input
                              type={multiCorrect ? "checkbox" : "radio"}
                              checked={variant.is_correct}
                              onChange={() => toggleCorrect(index)}
                              className="mt-1.5 h-4 w-4"
                              title="Правильный ответ"
                            />
                          ) : (
                            <div className="flex-shrink-0 mt-1">
                              {variant.is_correct ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium text-gray-900">
                                Вариант {index + 1}
                              </span>
                              {variant.is_correct && (
                                <Badge type="success" size="sm">
                                  Правильный
                                </Badge>
                              )}
                            </div>
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={text}
                                onChange={(e) =>
                                  setVariantValue(index, e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                            ) : (
                              <div className="prose prose-sm max-w-none">
                                {variant.blocks?.length ? (
                                  variant.blocks.map((b, bi) =>
                                    renderBlockPreview(b, bi),
                                  )
                                ) : (
                                  <RichTextPreview
                                    text={text}
                                    showMediaPreview={false}
                                    showLaTeXPreview
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Localization (RU + KK) */}
            <div className={sectionClass}>
              <div className="p-5">
                {isEditing ? (
                  <LocalizationFields
                    task_description_ru={edit.task_description_ru}
                    task_description_kk={edit.task_description_kk}
                    question_translation_ru={edit.question_translation_ru}
                    question_translation_kk={edit.question_translation_kk}
                    explanation_ru={edit.explanation_ru}
                    explanation_kk={edit.explanation_kk}
                    onChange={(field, value) =>
                      setLocalization(field as keyof EditState, value)
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    <LocalizationRow
                      label="Описание задачи"
                      ru={draft.task_description_ru}
                      kk={draft.task_description_kk}
                    />
                    <LocalizationRow
                      label="Перевод вопроса"
                      ru={draft.question_translation_ru}
                      kk={draft.question_translation_kk}
                    />
                    <LocalizationRow
                      label="Объяснение"
                      ru={draft.explanation_ru}
                      kk={draft.explanation_kk}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="bg-white rounded-b-lg px-6 py-4 border-t border-gray-200 flex items-center justify-between sticky bottom-0">
            <div>
              {!isEditing && !isTerminal && (
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={acting}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Удалить
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                    disabled={saving}
                    icon={<Save className="h-4 w-4" />}
                  >
                    Сохранить
                  </Button>
                </>
              ) : (
                <>
                  {!isTerminal && (
                    <>
                      <Button
                        variant="outline"
                        onClick={startEdit}
                        disabled={acting}
                        icon={<Edit className="h-4 w-4" />}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setRejectConfirm(true)}
                        disabled={acting}
                        icon={<Ban className="h-4 w-4" />}
                      >
                        Отклонить
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setPublishConfirm(true)}
                        disabled={acting}
                        icon={<Send className="h-4 w-4" />}
                      >
                        Опубликовать
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={publishConfirm}
        onClose={() => setPublishConfirm(false)}
        onConfirm={handlePublish}
        title="Публикация черновика"
        message={`Опубликовать черновик #${draft.id}? Будет создан живой вопрос. Действие нельзя отменить.`}
        confirmText="Опубликовать"
        cancelText="Отмена"
        type="info"
        isLoading={acting}
      />
      <ConfirmModal
        isOpen={rejectConfirm}
        onClose={() => setRejectConfirm(false)}
        onConfirm={handleReject}
        title="Отклонение черновика"
        message={`Отклонить черновик #${draft.id}?`}
        confirmText="Отклонить"
        cancelText="Отмена"
        type="warning"
        isLoading={acting}
      />
      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Удаление черновика"
        message={`Удалить черновик #${draft.id}? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
        isLoading={acting}
      />
    </div>
  );
};

const LocalizationRow: React.FC<{
  label: string;
  ru?: string;
  kk?: string;
}> = ({ label, ru, kk }) => {
  if (!ru && !kk) return null;
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="text-sm text-gray-600">
          <span className="text-xs text-gray-400">RU: </span>
          {ru || "—"}
        </div>
        <div className="text-sm text-gray-600">
          <span className="text-xs text-gray-400">KZ: </span>
          {kk || "—"}
        </div>
      </div>
    </div>
  );
};

export default QuestionDraftReviewModal;
