import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Eye, ChevronLeft, ChevronRight } from "lucide-react";

import { questionDraftService } from "@/services/api";
import { useSubjectStore } from "@/stores/subjectStore";
import {
  QuestionDraft,
  QuestionDraftStatus,
} from "@/types/questionDrafts";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import { QuestionDraftReviewModal } from "./QuestionDraftReviewModal";
import {
  STATUS_META,
  confidenceBadgeType,
  formatScore,
  getDifficultyBadgeType,
  getDifficultyText,
  getFirstTextValue,
  truncate,
} from "./utils";

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: QuestionDraftStatus; label: string }[] = [
  { value: "draft", label: "Черновики" },
  { value: "approved", label: "Одобренные" },
  { value: "published", label: "Опубликованные" },
  { value: "rejected", label: "Отклонённые" },
];

export const QuestionDraftList: React.FC = () => {
  const { subjects, fetchSubjects } = useSubjectStore();

  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<QuestionDraftStatus>("draft");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [offset, setOffset] = useState(0);

  const [selected, setSelected] = useState<QuestionDraft | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await questionDraftService.getAll({
        status,
        subject_id: subjectId === "" ? undefined : subjectId,
        limit: PAGE_SIZE,
        offset,
      });
      setDrafts(result.drafts);
      setTotal(result.total);
    } catch (err: any) {
      console.error("Error loading question drafts:", err);
      setError(err?.message || "Ошибка загрузки черновиков");
      toast.error("Не удалось загрузить черновики");
    } finally {
      setLoading(false);
    }
  }, [status, subjectId, offset]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page whenever a filter changes.
  const onStatusChange = (next: QuestionDraftStatus) => {
    setStatus(next);
    setOffset(0);
  };
  const onSubjectChange = (next: number | "") => {
    setSubjectId(next);
    setOffset(0);
  };

  // Modal callback: in-place edit updates the row; publish/reject/delete
  // drops the row from the current (status-filtered) view.
  const handleChanged = useCallback(
    (updated: QuestionDraft | null, removed: boolean) => {
      if (removed) {
        setDrafts((prev) => prev.filter((d) => d.id !== selected?.id));
        setTotal((t) => Math.max(0, t - 1));
        setSelected(null);
      } else if (updated) {
        setDrafts((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d)),
        );
        setSelected(updated);
      }
    },
    [selected],
  );

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterText = useMemo(() => {
    const parts: string[] = [
      `статус: ${STATUS_META[status]?.label ?? status}`,
    ];
    if (subjectId !== "") {
      const s = subjects.find((x) => x.id === subjectId);
      if (s) parts.push(`предмет: ${s.name}`);
    }
    return parts.join(", ");
  }, [status, subjectId, subjects]);

  if (error) {
    return (
      <ListContainer>
        <ListHeader title="Черновики вопросов" />
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Button variant="secondary" onClick={load}>
            Попробовать снова
          </Button>
        </div>
      </ListContainer>
    );
  }

  return (
    <ListContainer>
      <ListHeader title="Черновики вопросов" filterDisplayText={filterText}>
        <Button
          variant="secondary"
          onClick={load}
          disabled={loading}
          icon={
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          }
        >
          {loading ? "Загрузка..." : "Обновить"}
        </Button>
      </ListHeader>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Статус
            </label>
            <select
              value={status}
              onChange={(e) =>
                onStatusChange(e.target.value as QuestionDraftStatus)
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Предмет
            </label>
            <select
              value={subjectId}
              onChange={(e) =>
                onSubjectChange(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все предметы</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Предмет / тема</Th>
                <Th>Вопрос</Th>
                <Th>Сложность</Th>
                <Th>Статус</Th>
                <Th>Уверенность</Th>
                <Th>Источник</Th>
                <Th className="text-right w-20">Действия</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drafts.map((d) => {
                const preview = truncate(getFirstTextValue(d.blocks));
                const sourceLabel = d.source
                  ? [
                      d.source.book,
                      d.source.chapter && `гл. ${d.source.chapter}`,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "";
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelected(d)}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {d.subject_name || `Предмет ${d.subject_id}`}
                      </div>
                      {d.topic_name && (
                        <div className="text-xs text-gray-500">
                          {d.topic_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                      {preview || (
                        <span className="text-gray-400">— без текста —</span>
                      )}
                      {d.published_question_id && (
                        <span className="ml-2 text-xs text-green-600">
                          → #{d.published_question_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge type={getDifficultyBadgeType(d.difficulty)} size="sm">
                        {getDifficultyText(d.difficulty)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        type={STATUS_META[d.status]?.badge ?? "secondary"}
                        size="sm"
                      >
                        {STATUS_META[d.status]?.label ?? d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        type={confidenceBadgeType(d.validation?.confidence)}
                        size="sm"
                      >
                        {formatScore(d.validation?.confidence)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[12rem] truncate">
                      {sourceLabel || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(d);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Просмотр / ревью"
                      >
                        <Eye className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10">
                    Загрузка черновиков...
                  </td>
                </tr>
              )}
              {!loading && drafts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10">
                    Черновики не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <div>
              Всего: {total} · стр. {currentPage} из {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Вперёд
              </Button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <QuestionDraftReviewModal
          draft={selected}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          onChanged={handleChanged}
        />
      )}
    </ListContainer>
  );
};

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <th
    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);

export default QuestionDraftList;
