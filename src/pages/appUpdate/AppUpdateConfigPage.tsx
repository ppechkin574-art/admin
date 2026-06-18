import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Save,
  RefreshCw,
  Smartphone,
  AlertTriangle,
  RotateCcw,
  History as HistoryIcon,
} from "lucide-react";

import {
  appUpdateConfigService,
  type AppUpdateConfig,
  type AppUpdateConfigAudit,
} from "@/services/api";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";
import ConfirmModal from "@/components/common/ConfirmModal";
import { useConfirmation } from "@/hooks/useConfirmation";

/**
 * Admin form for the mobile force-update config (singleton).
 *
 * Per-platform thresholds + store URL. Three build numbers per platform:
 * - min_build         — HARD gate: build < min → blocking "update required".
 * - recommended_build — SOFT tier: min ≤ build < recommended → dismissible
 *                       prompt (once/day). 0 = no soft prompt.
 * - last_known_build  — highest build actually live in the store; the backend
 *                       rejects min/recommended above it (422), and the form
 *                       blocks Save + warns inline, so an operator can never
 *                       brick users onto a not-yet-published version.
 * A confirmation modal summarises the impact before every save. The history
 * section (audit log) supports one-click rollback (loads an old snapshot into
 * the form for review, then re-saves through the same validated PUT).
 * Saved values take effect on the next app launch (no redeploy).
 */

interface PlatformState {
  label: string;
  placeholder: string;
  minBuild: string;
  setMinBuild: (v: string) => void;
  recommended: string;
  setRecommended: (v: string) => void;
  lastKnown: string;
  setLastKnown: (v: string) => void;
  storeUrl: string;
  setStoreUrl: (v: string) => void;
  minTooHigh: boolean;
  recTooLow: boolean;
  recTooHigh: boolean;
}

export const AppUpdateConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AppUpdateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled form state, decoupled from the loaded config so the user
  // can edit without intermediate API hits. Builds kept as strings to
  // allow an empty intermediate state while typing.
  const [iosMinBuild, setIosMinBuild] = useState("0");
  const [androidMinBuild, setAndroidMinBuild] = useState("0");
  const [iosRecommended, setIosRecommended] = useState("0");
  const [androidRecommended, setAndroidRecommended] = useState("0");
  const [iosLastKnown, setIosLastKnown] = useState("0");
  const [androidLastKnown, setAndroidLastKnown] = useState("0");
  const [iosStoreUrl, setIosStoreUrl] = useState("");
  const [androidStoreUrl, setAndroidStoreUrl] = useState("");
  const [history, setHistory] = useState<AppUpdateConfigAudit[]>([]);

  const { confirm, confirmation, isOpen, onConfirm, onCancel } =
    useConfirmation();

  const apply = (c: AppUpdateConfig) => {
    setConfig(c);
    setIosMinBuild(String(c.ios_min_build ?? 0));
    setAndroidMinBuild(String(c.android_min_build ?? 0));
    setIosRecommended(String(c.ios_recommended_build ?? 0));
    setAndroidRecommended(String(c.android_recommended_build ?? 0));
    setIosLastKnown(String(c.ios_last_known_build ?? 0));
    setAndroidLastKnown(String(c.android_last_known_build ?? 0));
    setIosStoreUrl(c.ios_store_url ?? "");
    setAndroidStoreUrl(c.android_store_url ?? "");
  };

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await appUpdateConfigService.history(20));
    } catch (err) {
      // History is non-critical — don't block the page if it fails.
      console.error("Failed to load app update history:", err);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await appUpdateConfigService.get();
      apply(c);
    } catch (err: any) {
      console.error("Failed to load app update config:", err);
      setError(err.message || "Ошибка загрузки конфигурации");
      toast.error("Не удалось загрузить конфигурацию обновления");
    } finally {
      setLoading(false);
    }
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    void load();
  }, [load]);

  const parseBuild = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const n = parseInt(trimmed, 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };

  // Parsed values (null while the field holds a non-numeric intermediate).
  const iosMinN = parseBuild(iosMinBuild);
  const androidMinN = parseBuild(androidMinBuild);
  const iosRecN = parseBuild(iosRecommended);
  const androidRecN = parseBuild(androidRecommended);
  const iosLkN = parseBuild(iosLastKnown);
  const androidLkN = parseBuild(androidLastKnown);

  // Per-platform coherence guards (mirror the backend 422 rules).
  const guards = (
    min: number | null,
    rec: number | null,
    lk: number | null,
  ) => {
    const minTooHigh = min !== null && lk !== null && lk > 0 && min > lk;
    const recTooLow =
      rec !== null && rec > 0 && min !== null && rec < min;
    const recTooHigh =
      rec !== null && rec > 0 && lk !== null && lk > 0 && rec > lk;
    return { minTooHigh, recTooLow, recTooHigh };
  };
  const iosG = guards(iosMinN, iosRecN, iosLkN);
  const androidG = guards(androidMinN, androidRecN, androidLkN);
  const hasBlockingError =
    iosG.minTooHigh ||
    iosG.recTooLow ||
    iosG.recTooHigh ||
    androidG.minTooHigh ||
    androidG.recTooLow ||
    androidG.recTooHigh;

  const platformSummary = (
    name: string,
    min: number,
    rec: number,
    lastKnown: number,
  ): string => {
    const lines: string[] = [];
    if (min === 0) {
      lines.push(`${name}: жёсткий форс ВЫКЛЮЧЕН (0).`);
    } else {
      lines.push(
        `${name}: заблокирует всех с build < ${min} (жёсткий форс на ${min}).`,
      );
    }
    if (rec > 0) {
      lines.push(
        `${name}: мягкое окно «Позже/Обновить» для build от ${min} до ${rec - 1}.`,
      );
    }
    if (lastKnown > 0) {
      lines.push(`${name}: последний build в сторе — ${lastKnown}.`);
    } else {
      lines.push(`${name}: последний build в сторе не указан — проверьте вручную.`);
    }
    return lines.join(" ");
  };

  const save = async () => {
    if (
      iosMinN === null ||
      androidMinN === null ||
      iosRecN === null ||
      androidRecN === null ||
      iosLkN === null ||
      androidLkN === null
    ) {
      toast.error("Build — целое число ≥ 0");
      return;
    }

    if (hasBlockingError) {
      toast.error(
        "Есть несогласованные пороги (подсвечены красным). " +
          "min не может быть выше последнего build в сторе; " +
          "recommended должен быть между min и последним build в сторе.",
      );
      return;
    }

    const ok = await confirm({
      title: "Подтвердите изменение обновления",
      message:
        `${platformSummary("iOS", iosMinN, iosRecN, iosLkN)}\n\n` +
        `${platformSummary("Android", androidMinN, androidRecN, androidLkN)}\n\n` +
        "Убедитесь, что указанные билды реально доступны в сторах. " +
        "Изменение применяется при следующем запуске приложения у пользователей.",
      confirmText: "Сохранить",
      cancelText: "Отмена",
      type: "warning",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await appUpdateConfigService.update({
        ios_min_build: iosMinN,
        android_min_build: androidMinN,
        ios_recommended_build: iosRecN,
        android_recommended_build: androidRecN,
        ios_last_known_build: iosLkN,
        android_last_known_build: androidLkN,
        ios_store_url: iosStoreUrl.trim(),
        android_store_url: androidStoreUrl.trim(),
      });
      apply(updated);
      toast.success("Сохранено");
      void loadHistory();
    } catch (err: any) {
      console.error("Failed to save app update config:", err);
      const detail = err?.response?.data?.detail || err.message;
      toast.error(`Ошибка сохранения: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  // Rollback = load an older snapshot into the form. The operator then
  // reviews and presses Save, which re-runs validation + confirmation and
  // appends a fresh audit entry — no destructive direct write.
  const rollbackTo = (snap: Partial<AppUpdateConfig>) => {
    if (snap.ios_min_build != null) setIosMinBuild(String(snap.ios_min_build));
    if (snap.android_min_build != null)
      setAndroidMinBuild(String(snap.android_min_build));
    if (snap.ios_recommended_build != null)
      setIosRecommended(String(snap.ios_recommended_build));
    if (snap.android_recommended_build != null)
      setAndroidRecommended(String(snap.android_recommended_build));
    if (snap.ios_last_known_build != null)
      setIosLastKnown(String(snap.ios_last_known_build));
    if (snap.android_last_known_build != null)
      setAndroidLastKnown(String(snap.android_last_known_build));
    if (snap.ios_store_url != null) setIosStoreUrl(snap.ios_store_url);
    if (snap.android_store_url != null)
      setAndroidStoreUrl(snap.android_store_url);
    toast("Значения загружены в форму. Проверьте и нажмите «Сохранить».", {
      icon: "↩️",
    });
  };

  const fmtTime = (iso: string | null): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ru-RU");
  };

  // Compact human diff of a history entry (only the fields that changed).
  const FIELD_LABELS: Record<string, string> = {
    ios_min_build: "iOS min",
    android_min_build: "Android min",
    ios_recommended_build: "iOS recommended",
    android_recommended_build: "Android recommended",
    ios_last_known_build: "iOS в сторе",
    android_last_known_build: "Android в сторе",
    ios_store_url: "iOS URL",
    android_store_url: "Android URL",
  };
  const entryDiff = (e: AppUpdateConfigAudit): string => {
    const before = e.before_values as Record<string, any>;
    const after = e.after_values as Record<string, any>;
    const parts: string[] = [];
    for (const key of Object.keys(FIELD_LABELS)) {
      const b = before?.[key];
      const a = after?.[key];
      if (String(b ?? "") !== String(a ?? "")) {
        parts.push(`${FIELD_LABELS[key]}: ${b ?? "—"} → ${a ?? "—"}`);
      }
    }
    return parts.length ? parts.join(", ") : "без изменений";
  };

  const numberInputClass = (bad: boolean) =>
    `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
      bad
        ? "border-red-400 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
    }`;

  const renderPlatform = (p: PlatformState) => (
    <div className="space-y-4 rounded-md border border-gray-200 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Smartphone className="h-4 w-4" /> {p.label}
      </h3>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Минимальный build (жёсткий форс)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={p.minBuild}
          onChange={(e) => p.setMinBuild(e.target.value)}
          className={numberInputClass(p.minTooHigh)}
        />
        {p.minTooHigh && (
          <p className="flex items-start gap-1 text-xs text-red-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Превышает последний build в сторе ({p.lastKnown}). Сохранение
            заблокировано — пользователи остались бы без доступного обновления.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Рекомендуемый build (мягкое окно)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={p.recommended}
          onChange={(e) => p.setRecommended(e.target.value)}
          className={numberInputClass(p.recTooLow || p.recTooHigh)}
        />
        {p.recTooLow && (
          <p className="flex items-start gap-1 text-xs text-red-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Меньше минимального build — мягкое окно не имеет смысла (всё ниже min
            уже форсится жёстко).
          </p>
        )}
        {p.recTooHigh && (
          <p className="flex items-start gap-1 text-xs text-red-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Превышает последний build в сторе ({p.lastKnown}) — нельзя
            рекомендовать версию, которой ещё нет.
          </p>
        )}
        <p className="text-xs text-gray-400">
          Ниже этого build показывается закрываемое окно «Позже / Обновить» (раз
          в день). 0 = не показывать.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Последний build в сторе
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={p.lastKnown}
          onChange={(e) => p.setLastKnown(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-400">
          Build, реально опубликованный и доступный для скачивания в сторе.
          Защищает от форса на ещё не вышедшую версию. 0 = не указано.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Ссылка на стор
        </label>
        <input
          type="text"
          value={p.storeUrl}
          onChange={(e) => p.setStoreUrl(e.target.value)}
          placeholder={p.placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );

  return (
    <ListContainer>
      <ListHeader
        title="Обновление приложения"
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
            <b>Минимальный build</b> — ниже него блокирующее окно (0 = не
            форсить). <b>Рекомендуемый build</b> — мягкое закрываемое окно. Поле{" "}
            <b>«Последний build в сторе»</b> не даёт случайно заблокировать
            пользователей на неопубликованную версию. Ставьте номера только ПОСЛЕ
            выхода обновления в сторе.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {renderPlatform({
              label: "iOS",
              placeholder: "https://apps.apple.com/app/...",
              minBuild: iosMinBuild,
              setMinBuild: setIosMinBuild,
              recommended: iosRecommended,
              setRecommended: setIosRecommended,
              lastKnown: iosLastKnown,
              setLastKnown: setIosLastKnown,
              storeUrl: iosStoreUrl,
              setStoreUrl: setIosStoreUrl,
              ...iosG,
            })}
            {renderPlatform({
              label: "Android",
              placeholder:
                "https://play.google.com/store/apps/details?id=...",
              minBuild: androidMinBuild,
              setMinBuild: setAndroidMinBuild,
              recommended: androidRecommended,
              setRecommended: setAndroidRecommended,
              lastKnown: androidLastKnown,
              setLastKnown: setAndroidLastKnown,
              storeUrl: androidStoreUrl,
              setStoreUrl: setAndroidStoreUrl,
              ...androidG,
            })}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-xs text-gray-400">
              {config &&
                `Текущее: iOS ≥ ${config.ios_min_build}, Android ≥ ${config.android_min_build}`}
            </div>
            <Button
              onClick={() => void save()}
              icon={<Save className="h-4 w-4" />}
              variant="primary"
              disabled={saving || hasBlockingError}
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="mt-6 space-y-3 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <HistoryIcon className="h-4 w-4" /> История изменений
          </h3>
          <ul className="divide-y divide-gray-100">
            {history.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">
                    {fmtTime(e.changed_at)} · {e.changed_by || "—"}
                  </div>
                  <div className="break-words text-sm text-gray-700">
                    {entryDiff(e)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => rollbackTo(e.after_values)}
                  className="flex flex-shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  title="Загрузить эти значения в форму для отката"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Откатить
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmModal
        isOpen={isOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title={confirmation?.title ?? ""}
        message={confirmation?.message ?? ""}
        confirmText={confirmation?.confirmText}
        cancelText={confirmation?.cancelText}
        type={(confirmation?.type as "danger" | "warning" | "info") ?? "warning"}
      />
    </ListContainer>
  );
};
