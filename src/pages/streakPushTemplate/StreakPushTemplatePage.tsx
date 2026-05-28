import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, RefreshCw } from "lucide-react";

import {
  streakPushTemplateService,
  type StreakPushTemplate,
} from "@/services/api";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";

/**
 * Admin form for the streak-reminder push template (singleton row).
 *
 * Backend cron re-reads this row on every tick, so changes saved here
 * take effect on the next daily firing (no redeploy). `{streak}` in
 * title/body is substituted per audience group at send time.
 */

export const StreakPushTemplatePage: React.FC = () => {
  const [template, setTemplate] = useState<StreakPushTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — controlled inputs decoupled from the loaded template
  // so the user can edit without intermediate API hits.
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hoursBeforeReset, setHoursBeforeReset] = useState(8);
  const [timezone, setTimezone] = useState("Asia/Almaty");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await streakPushTemplateService.get();
      setTemplate(t);
      setEnabled(t.enabled);
      setTitle(t.title);
      setBody(t.body);
      setHoursBeforeReset(t.hours_before_reset);
      setTimezone(t.timezone);
    } catch (err: any) {
      console.error("Failed to load streak push template:", err);
      setError(err.message || "Ошибка загрузки шаблона");
      toast.error("Не удалось загрузить шаблон пуша");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Заголовок и текст не могут быть пустыми");
      return;
    }
    if (hoursBeforeReset < 1 || hoursBeforeReset > 23) {
      toast.error("Сдвиг должен быть от 1 до 23 часов");
      return;
    }
    setSaving(true);
    try {
      const updated = await streakPushTemplateService.update({
        enabled,
        title: title.trim(),
        body: body.trim(),
        hours_before_reset: hoursBeforeReset,
        timezone: timezone.trim() || "Asia/Almaty",
      });
      setTemplate(updated);
      toast.success("Шаблон сохранён");
    } catch (err: any) {
      console.error("Failed to save streak push template:", err);
      const detail = err?.response?.data?.detail || err.message;
      toast.error(`Ошибка сохранения: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ListContainer>
      <ListHeader
        title="Push: напоминание о стрике"
        actionButtons={[
          {
            label: "Обновить",
            onClick: () => void load(),
            icon: RefreshCw,
            variant: "outline",
            disabled: loading || saving,
          },
        ]}
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Загрузка…</div>
      ) : (
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Cron шлёт пуш всем у кого активный стрик ≥ 1 и кто ещё не забрал
            бонус сегодня, за <b>{hoursBeforeReset}</b> часов до полуночи в
            таймзоне <b>{timezone}</b>. В тексте можно использовать{" "}
            <code className="rounded bg-gray-100 px-1">{"{streak}"}</code> —
            подставится число дней стрика пользователя.
          </p>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">
              Включить отправку пуша
            </span>
          </label>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Заголовок
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Не теряй стрик! 🔥"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="text-xs text-gray-400">{title.length}/200</div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Текст
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="У тебя {streak} дн. подряд. Зайди до полуночи — иначе серия сгорит."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="text-xs text-gray-400">{body.length}/500</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                За сколько часов до сгорания (1–23)
              </label>
              <input
                type="number"
                min={1}
                max={23}
                value={hoursBeforeReset}
                onChange={(e) =>
                  setHoursBeforeReset(parseInt(e.target.value || "0", 10))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Таймзона
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                maxLength={64}
                placeholder="Asia/Almaty"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-xs text-gray-400">
              {template?.updated_at &&
                `Обновлено: ${new Date(template.updated_at).toLocaleString("ru-RU")}`}
            </div>
            <Button
              onClick={() => void save()}
              icon={<Save className="h-4 w-4" />}
              variant="primary"
              disabled={saving}
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </div>
      )}
    </ListContainer>
  );
};
