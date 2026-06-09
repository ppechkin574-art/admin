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
// Per-status cap for the merged client-side «Архив» view (200 total max).
const ARCHIVE_LIMIT = 100;

// The current view is either a single draft status or the combined archive.
type ViewKey = QuestionDraftStatus | "archive";

const VIEW_TABS: { value: ViewKey; label: string }[] = [
  { value: "draft", label: "Черновики" },
  { value: "approved", label: "Одобренные" },
  { value: "published", label: "Опубликованные" },
  { value: "rejected", label: "Отклонённые" },
  { value: "archive", label: "📦 Архив" },
];

const fmtDateTime = (iso?: string): string => {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const QuestionDraftList: React.FC = () => {
  const { subjects, fetchSubjects } = useSubjectStore();

  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ViewKey>("draft");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [offset, setOffset] = useState(0);

  const [selected, setSelected] = useState<QuestionDraft | null>(null);

  const isArchive = view === "archive";

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const subject_id = subjectId === "" ? undefined : subjectId;
    try {
      if (view === "archive") {
        // Archive = published + rejected, fetched in parallel and merged
        // client-side, newest first (updated_at desc, id desc as fallback).
        const [pub, rej] = await Promise.all([
          questionDraftService.getAll({
            status: "published",
            subject_id,
            limit: ARCHIVE_LIMIT,
            offset: 0,
          }),
          questionDraftService.getAll({
            status: "rejected",
            subject_id,
            limit: ARCHIVE_LIMIT,
            offset: 0,
          }),
        ]);
        const merged = [...pub.drafts, ...rej.drafts].sort((a, b) => {
          if (a.updated_at && b.updated_at) {
            return b.updated_at.localeCompare(a.updated_at);
          }
          return b.id - a.id;
        });
        setDrafts(merged);
        setTotal(pub.total + rej.total);
      } else {
        const result = await questionDraftService.getAll({
          status: view,
          subject_id,
          limit: PAGE_SIZE,
          offset,
        });
        setDrafts(result.drafts);
        setTotal(result.total);
      }
    } catch (err: any) {
      console.error("Error loading question drafts:", err);
      setError(err?.message || "Ошибка загрузки черновиков");
      toast.error("Не удалось загрузить черновики");
    } finally {
      setLoading(false);
    }
  }, [view, subjectId, offset]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page whenever a filter (tab or subject) changes.
  const onViewChange = (next: ViewKey) => {
    setView(next);
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
    const activeLabel =
      VIEW_TABS.find((t) => t.value === view)?.label ?? view;
    const parts: string[] = [`раздел: ${activeLabel}`];
    if (subjectId !== "") {
      const s = subjects.find((x) => x.id === subjectId);
      if (s) parts.push(`предмет: ${s.name}`);
    }
    return parts.join(", ");
  }, [view, subjectId, subjects]);

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

      {/* Filters: prominent status tabs + subject select */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            {VIEW_TABS.map((tab) => {
              const active = view === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onViewChange(tab.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 ${
                    active
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Subject filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Предмет</label>
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
                <Th>Когда</Th>
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
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {fmtDateTime(d.updated_at)}
                      {d.reviewed_by && (
                        <div className="text-gray-400 truncate max-w-[10rem]">
                          {d.reviewed_by}
                        </div>
                      )}
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
                  <td colSpan={8} className="text-center text-gray-500 py-10">
                    Загрузка черновиков...
                  </td>
                </tr>
              )}
              {!loading && drafts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-500 py-10">
                    Черновики не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (single-status views) */}
        {!isArchive && total > 0 && (
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

        {/* Archive note (merged client-side view, no server pagination) */}
        {isArchive && total > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            Всего в архиве: {total} · показано: {drafts.length}.
            Показаны последние опубликованные и отклонённые (до{" "}
            {ARCHIVE_LIMIT * 2}).
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
