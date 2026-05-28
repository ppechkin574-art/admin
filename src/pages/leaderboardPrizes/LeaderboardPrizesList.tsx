import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, RefreshCw, Trash2, X, Check } from "lucide-react";

import { leaderboardPrizesService } from "@/services/api";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";

/**
 * Admin CRUD for `leaderboard_prizes` — what each top-N user sees in
 * the iOS leaderboard «gift bubble» modal.
 *
 * Inline edit + a top-of-table «New» row. We don't reuse the generic
 * EntityForm because the form is tiny (5 fields) and the icon is
 * picked from a server-driven dropdown — easier to wire here than to
 * extend the generic form schema.
 *
 * Icon picker pulls allowed keys from
 * `GET /admin/leaderboard-prizes/icon-keys` so the admin never has
 * to keep a hardcoded list in sync with the iOS bundle.
 */

interface Prize {
  id: number;
  rank: number;
  icon_key: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type Draft = Omit<Prize, "id" | "created_at" | "updated_at">;

const emptyDraft: Draft = {
  rank: 1,
  icon_key: "trophy",
  title: "",
  description: "",
  is_active: true,
};

export const LeaderboardPrizesList: React.FC = () => {
  const [items, setItems] = useState<Prize[]>([]);
  const [iconKeys, setIconKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prizes, keys] = await Promise.all([
        leaderboardPrizesService.list(),
        leaderboardPrizesService.iconKeys(),
      ]);
      setItems(prizes);
      setIconKeys(keys.icon_keys);
    } catch (err: any) {
      console.error("Error loading prizes:", err);
      setError(err.message || "Ошибка загрузки призов");
      toast.error("Не удалось загрузить призы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (prize: Prize) => {
    setEditingId(prize.id);
    setDraft({
      rank: prize.rank,
      icon_key: prize.icon_key,
      title: prize.title,
      description: prize.description,
      is_active: prize.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const startCreate = () => {
    setCreating(true);
    // suggest next free rank
    const taken = new Set(items.map((p) => p.rank));
    let next = 1;
    while (taken.has(next)) next += 1;
    setDraft({ ...emptyDraft, rank: next });
  };

  const cancelCreate = () => {
    setCreating(false);
    setDraft(emptyDraft);
  };

  const submitCreate = useCallback(async () => {
    if (!draft.title.trim()) {
      toast.error("Заголовок обязателен");
      return;
    }
    setSaving(true);
    try {
      const created = await leaderboardPrizesService.create({
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
      });
      setItems((prev) =>
        [...prev, created as Prize].sort((a, b) => a.rank - b.rank),
      );
      toast.success(`Создан приз для позиции #${created.rank}`);
      setCreating(false);
      setDraft(emptyDraft);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? `Ошибка: ${detail}`
          : "Не удалось создать приз",
      );
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const submitEdit = useCallback(async () => {
    if (!editingId) return;
    if (!draft.title.trim()) {
      toast.error("Заголовок обязателен");
      return;
    }
    setSaving(true);
    try {
      const updated = await leaderboardPrizesService.update(editingId, {
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
      });
      setItems((prev) =>
        prev
          .map((p) => (p.id === editingId ? (updated as Prize) : p))
          .sort((a, b) => a.rank - b.rank),
      );
      toast.success("Изменения сохранены");
      cancelEdit();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? `Ошибка: ${detail}`
          : "Не удалось сохранить",
      );
    } finally {
      setSaving(false);
    }
  }, [draft, editingId]);

  const remove = useCallback(async (prize: Prize) => {
    if (
      !window.confirm(
        `Удалить приз для позиции #${prize.rank} «${prize.title}»?`,
      )
    ) {
      return;
    }
    try {
      await leaderboardPrizesService.delete(prize.id);
      setItems((prev) => prev.filter((p) => p.id !== prize.id));
      toast.success("Удалено");
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось удалить");
    }
  }, []);

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <Button variant="secondary" onClick={load}>
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <ListContainer>
      <ListHeader title="Подарки для топов лидерборда">
        <Button
          variant="secondary"
          onClick={load}
          disabled={loading || saving}
          icon={
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          }
        >
          {loading ? "Загрузка..." : "Обновить"}
        </Button>
        <Button
          variant="primary"
          onClick={startCreate}
          disabled={creating || saving}
          icon={<Plus className="h-4 w-4" />}
        >
          Создать
        </Button>
      </ListHeader>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th>Позиция</Th>
              <Th>Иконка</Th>
              <Th>Заголовок</Th>
              <Th>Описание</Th>
              <Th>Активно</Th>
              <Th className="w-24 text-right">Действия</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {creating && (
              <DraftRow
                draft={draft}
                setDraft={setDraft}
                iconKeys={iconKeys}
                saving={saving}
                onSave={submitCreate}
                onCancel={cancelCreate}
              />
            )}
            {items.map((item) =>
              editingId === item.id ? (
                <DraftRow
                  key={item.id}
                  draft={draft}
                  setDraft={setDraft}
                  iconKeys={iconKeys}
                  saving={saving}
                  onSave={submitEdit}
                  onCancel={cancelEdit}
                />
              ) : (
                <ReadRow
                  key={item.id}
                  prize={item}
                  onEdit={() => startEdit(item)}
                  onDelete={() => remove(item)}
                />
              ),
            )}
            {!loading && !items.length && !creating && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  Призы ещё не настроены — нажми «Создать»
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 px-4 text-sm text-gray-500">
        💡 Список читается iOS-приложением для модалки «топ-3 получает
        подарок». Поле <code className="font-mono">icon_key</code> должно
        совпадать с одним из SVG-ассетов, который шипается в iOS-бандл
        (см. <code className="font-mono">assets/grand/icons/prizes/</code>).
      </div>
    </ListContainer>
  );
};

// ─── helpers ───────────────────────────────────────────────────────

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

interface ReadRowProps {
  prize: Prize;
  onEdit: () => void;
  onDelete: () => void;
}

const ReadRow: React.FC<ReadRowProps> = ({ prize, onEdit, onDelete }) => (
  <tr className={prize.is_active ? "" : "opacity-50"}>
    <td className="px-4 py-3 font-mono text-sm">#{prize.rank}</td>
    <td className="px-4 py-3 font-mono text-sm text-gray-700">
      {prize.icon_key}
    </td>
    <td className="px-4 py-3 text-sm font-semibold">{prize.title}</td>
    <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
      {prize.description || <span className="text-gray-400">—</span>}
    </td>
    <td className="px-4 py-3 text-sm">
      {prize.is_active ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">
          ✓ да
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">
          — нет
        </span>
      )}
    </td>
    <td className="px-4 py-3 text-right text-sm">
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-800"
          title="Редактировать"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800"
          title="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </td>
  </tr>
);

interface DraftRowProps {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  iconKeys: string[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const DraftRow: React.FC<DraftRowProps> = ({
  draft,
  setDraft,
  iconKeys,
  saving,
  onSave,
  onCancel,
}) => {
  const upd = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <tr className="bg-blue-50/50">
      <td className="px-4 py-3">
        <input
          type="number"
          min="1"
          max="100"
          value={draft.rank}
          onChange={(e) => upd("rank", Number(e.target.value) || 1)}
          disabled={saving}
          className="w-16 border border-gray-300 rounded px-2 py-1 font-mono"
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={draft.icon_key}
          onChange={(e) => upd("icon_key", e.target.value)}
          disabled={saving}
          className="border border-gray-300 rounded px-2 py-1 font-mono text-sm"
        >
          {iconKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => upd("title", e.target.value)}
          disabled={saving}
          placeholder="Заголовок приза"
          className="w-full border border-gray-300 rounded px-2 py-1"
          maxLength={120}
        />
      </td>
      <td className="px-4 py-3">
        <textarea
          value={draft.description}
          onChange={(e) => upd("description", e.target.value)}
          disabled={saving}
          placeholder="Что именно получает топ"
          rows={2}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          maxLength={1000}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(e) => upd("is_active", e.target.checked)}
          disabled={saving}
          className="w-4 h-4"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            title="Сохранить"
            className="text-green-600 hover:text-green-800 disabled:opacity-50"
          >
            <Check className="h-5 w-5" />
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            title="Отменить"
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
