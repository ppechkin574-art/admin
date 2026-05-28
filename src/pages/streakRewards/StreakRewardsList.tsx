import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { streakRewardTiersService } from "@/services/api";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";

/**
 * Admin CRUD for `streak_reward_tiers` — operator tweaks how many
 * coins a daily-streak user gets depending on their streak length.
 *
 * UX mirrors LeaderboardPrizesList: inline edit + a draft row at the
 * top when «Создать» is pressed. Each row is just (min_streak, coins,
 * is_active) — no descriptions to preserve, fast to scan.
 *
 * Service rule (mirrored in backend): for a user with streak N the
 * client gets coins from the row with the largest `min_streak <= N`
 * that is active. So leaving gaps is fine («1 → 100», «30 → 500»);
 * a streak-of-15 user falls back to the day-1 tier.
 */

interface Tier {
  min_streak: number;
  coins: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type Draft = { min_streak: number; coins: number; is_active: boolean };

const emptyDraft: Draft = { min_streak: 1, coins: 100, is_active: true };

export const StreakRewardsList: React.FC = () => {
  const [items, setItems] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMinStreak, setEditingMinStreak] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tiers = await streakRewardTiersService.list();
      setItems(tiers);
    } catch (err: any) {
      console.error("Error loading streak reward tiers:", err);
      setError(err.message || "Ошибка загрузки наград");
      toast.error("Не удалось загрузить награды");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (tier: Tier) => {
    setEditingMinStreak(tier.min_streak);
    setDraft({
      min_streak: tier.min_streak,
      coins: tier.coins,
      is_active: tier.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingMinStreak(null);
    setDraft(emptyDraft);
  };

  const startCreate = () => {
    setCreating(true);
    const taken = new Set(items.map((t) => t.min_streak));
    let next = 1;
    while (taken.has(next)) next += 1;
    setDraft({ min_streak: next, coins: 100, is_active: true });
  };

  const cancelCreate = () => {
    setCreating(false);
    setDraft(emptyDraft);
  };

  const submitCreate = useCallback(async () => {
    if (draft.min_streak < 1) {
      toast.error("Минимальный стрик ≥ 1");
      return;
    }
    setSaving(true);
    try {
      const created = await streakRewardTiersService.create(draft);
      setItems((prev) =>
        [...prev, created as Tier].sort((a, b) => a.min_streak - b.min_streak),
      );
      toast.success(`Создан тиер для стрика ≥ ${created.min_streak}`);
      setCreating(false);
      setDraft(emptyDraft);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? `Ошибка: ${detail}`
          : "Не удалось создать тиер",
      );
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const submitEdit = useCallback(async () => {
    if (editingMinStreak == null) return;
    setSaving(true);
    try {
      const updated = await streakRewardTiersService.update(editingMinStreak, {
        coins: draft.coins,
        is_active: draft.is_active,
      });
      setItems((prev) =>
        prev
          .map((t) =>
            t.min_streak === editingMinStreak ? (updated as Tier) : t,
          )
          .sort((a, b) => a.min_streak - b.min_streak),
      );
      toast.success("Сохранено");
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
  }, [draft, editingMinStreak]);

  const remove = useCallback(async (tier: Tier) => {
    if (
      !window.confirm(
        `Удалить тиер для стрика ≥ ${tier.min_streak} (${tier.coins} монет)?`,
      )
    ) {
      return;
    }
    try {
      await streakRewardTiersService.delete(tier.min_streak);
      setItems((prev) => prev.filter((t) => t.min_streak !== tier.min_streak));
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
      <ListHeader title="Награды за стрик">
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
              <Th>Минимум дней стрика</Th>
              <Th>Монеты</Th>
              <Th>Активно</Th>
              <Th className="w-24 text-right">Действия</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {creating && (
              <DraftRow
                draft={draft}
                setDraft={setDraft}
                saving={saving}
                isCreating
                onSave={submitCreate}
                onCancel={cancelCreate}
              />
            )}
            {items.map((item) =>
              editingMinStreak === item.min_streak ? (
                <DraftRow
                  key={item.min_streak}
                  draft={draft}
                  setDraft={setDraft}
                  saving={saving}
                  isCreating={false}
                  onSave={submitEdit}
                  onCancel={cancelEdit}
                />
              ) : (
                <ReadRow
                  key={item.min_streak}
                  tier={item}
                  onEdit={() => startEdit(item)}
                  onDelete={() => remove(item)}
                />
              ),
            )}
            {!loading && !items.length && !creating && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-8">
                  Награды ещё не настроены — нажми «Создать»
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 px-4 text-sm text-gray-500">
        💡 Логика: пользователю со стриком <code className="font-mono">N</code>{" "}
        выдаются монеты тиера с наибольшим{" "}
        <code className="font-mono">min_streak ≤ N</code> среди активных.
        Можно оставлять пропуски (1 / 7 / 30) — система найдёт ближайший.
      </div>
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

interface ReadRowProps {
  tier: Tier;
  onEdit: () => void;
  onDelete: () => void;
}

const ReadRow: React.FC<ReadRowProps> = ({ tier, onEdit, onDelete }) => (
  <tr className={tier.is_active ? "" : "opacity-50"}>
    <td className="px-4 py-3 font-mono text-sm">≥ {tier.min_streak} дн.</td>
    <td className="px-4 py-3 font-mono font-semibold text-sm">
      {tier.coins}
    </td>
    <td className="px-4 py-3 text-sm">
      {tier.is_active ? (
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
  saving: boolean;
  isCreating: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const DraftRow: React.FC<DraftRowProps> = ({
  draft,
  setDraft,
  saving,
  isCreating,
  onSave,
  onCancel,
}) => {
  const upd = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <tr className="bg-blue-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="text-sm">≥</span>
          <input
            type="number"
            min="1"
            max="365"
            value={draft.min_streak}
            onChange={(e) =>
              upd("min_streak", Number(e.target.value) || 1)
            }
            disabled={saving || !isCreating}
            className="w-20 border border-gray-300 rounded px-2 py-1 font-mono"
          />
          <span className="text-sm">дн.</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min="0"
          max="100000"
          step="1"
          value={draft.coins}
          onChange={(e) => upd("coins", Number(e.target.value) || 0)}
          disabled={saving}
          className="w-24 border border-gray-300 rounded px-2 py-1 font-mono"
        />
      </td>
      <td className="px-4 py-3">
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
