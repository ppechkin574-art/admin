import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Gift } from "lucide-react";

import { rewardGoalSettingsService } from "@/services/api";
import Button from "@/components/common/Button";

/**
 * Admin config for the mobile home «До следующей награды» card
 * (placement: «Турнир → Награды за баллы»).
 *
 * One global goal — not a ladder: the operator sets a single points
 * target; the app shows each user's progress toward it (Ещё N ★ +
 * шкала). Two controls only:
 *   • enabled       — master on/off;
 *   • target_points — the goal (баллы). null/0 == no active goal.
 *
 * When disabled OR target is empty/0, the mobile card renders its
 * «Скоро новые цели» empty state instead of a progress bar. Editing
 * here never touches the points-reset schedule (separate backend
 * path — see `save_reward_goal`).
 */
export const RewardGoalSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [target, setTarget] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await rewardGoalSettingsService.get();
      setEnabled(s.enabled);
      setTarget(s.target_points ? String(s.target_points) : "");
      setUpdatedBy(s.updated_by);
    } catch (err: any) {
      console.error("Error loading reward-goal settings:", err);
      toast.error("Не удалось загрузить настройки наград");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parsedTarget = (): number | null => {
    const n = parseInt(target.replace(/\s/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const save = async () => {
    const t = parsedTarget();
    if (enabled && t === null) {
      toast.error("Укажи цель в баллах (или выключи карточку)");
      return;
    }
    setSaving(true);
    try {
      const s = await rewardGoalSettingsService.update(enabled, t);
      setEnabled(s.enabled);
      setTarget(s.target_points ? String(s.target_points) : "");
      setUpdatedBy(s.updated_by);
      toast.success("Сохранено");
    } catch (err: any) {
      console.error("Error saving reward-goal settings:", err);
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const goalActive = enabled && parsedTarget() !== null;

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" /> Загрузка…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Gift className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900">Награды за баллы</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Карточка «До следующей награды» на Главной приложения. Задай одну цель в
        баллах — приложение покажет каждому его прогресс к ней.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* master toggle */}
        <div className="flex items-start justify-between">
          <div className="pr-6">
            <div className="font-semibold text-gray-800">Карточка включена</div>
            <div className="text-sm text-gray-500 mt-0.5">
              Выключишь — на Главной вместо прогресса покажется «Скоро новые
              цели».
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(v => !v)}
            className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full transition-colors ${
              enabled ? "bg-primary-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* target */}
        <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
          <label className="block font-semibold text-gray-800 mb-1">
            Цель, баллов ★
          </label>
          <input
            type="number"
            min={0}
            max={1000000}
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="например, 1000"
            className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="text-sm text-gray-500 mt-1">
            Пусто или 0 — активной цели нет (карточка покажет «Скоро новые
            цели»).
          </div>
        </div>

        {/* live preview of the resulting state */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm">
          <div className="text-gray-500 mb-1">Что увидит пользователь:</div>
          {goalActive ? (
            <div className="text-gray-800">
              «До следующей награды» → прогресс к{" "}
              <b>{parsedTarget()!.toLocaleString("ru-RU")} ★</b> (Ещё N ★ + шкала).
            </div>
          ) : (
            <div className="text-gray-800">
              Серая карточка <b>«Скоро новые цели»</b> (без прогресса).
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-400">
            {updatedBy ? `Последнее изменение: ${updatedBy}` : ""}
          </div>
          <Button variant="primary" loading={saving} onClick={save}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RewardGoalSettings;
