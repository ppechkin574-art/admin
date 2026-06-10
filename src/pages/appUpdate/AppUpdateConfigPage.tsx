import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, RefreshCw, Smartphone } from "lucide-react";

import {
  appUpdateConfigService,
  type AppUpdateConfig,
} from "@/services/api";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";

/**
 * Admin form for the mobile force-update config (singleton).
 *
 * Per-platform minimum build number + store URL. The app compares the
 * installed build against the platform minimum; if it's lower, a blocking
 * "update required" screen is shown. A minimum of 0 disables the gate.
 * Saved values take effect on the next app launch (no redeploy).
 */

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
  const [iosStoreUrl, setIosStoreUrl] = useState("");
  const [androidStoreUrl, setAndroidStoreUrl] = useState("");

  const apply = (c: AppUpdateConfig) => {
    setConfig(c);
    setIosMinBuild(String(c.ios_min_build ?? 0));
    setAndroidMinBuild(String(c.android_min_build ?? 0));
    setIosStoreUrl(c.ios_store_url ?? "");
    setAndroidStoreUrl(c.android_store_url ?? "");
  };

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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parseBuild = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const n = parseInt(trimmed, 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };

  const save = async () => {
    const ios = parseBuild(iosMinBuild);
    const android = parseBuild(androidMinBuild);
    if (ios === null || android === null) {
      toast.error("Минимальный build — целое число ≥ 0");
      return;
    }
    setSaving(true);
    try {
      const updated = await appUpdateConfigService.update({
        ios_min_build: ios,
        android_min_build: android,
        ios_store_url: iosStoreUrl.trim(),
        android_store_url: androidStoreUrl.trim(),
      });
      apply(updated);
      toast.success("Сохранено");
    } catch (err: any) {
      console.error("Failed to save app update config:", err);
      const detail = err?.response?.data?.detail || err.message;
      toast.error(`Ошибка сохранения: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

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
            Если build приложения у пользователя меньше указанного — показывается
            окно обязательного обновления. <b>0 = не форсить.</b> Ставьте номер
            только ПОСЛЕ выхода обновления в сторе.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* iOS */}
            <div className="space-y-4 rounded-md border border-gray-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Smartphone className="h-4 w-4" /> iOS
              </h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Минимальный build
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={iosMinBuild}
                  onChange={(e) => setIosMinBuild(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ссылка на стор
                </label>
                <input
                  type="text"
                  value={iosStoreUrl}
                  onChange={(e) => setIosStoreUrl(e.target.value)}
                  placeholder="https://apps.apple.com/app/..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Android */}
            <div className="space-y-4 rounded-md border border-gray-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Smartphone className="h-4 w-4" /> Android
              </h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Минимальный build
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={androidMinBuild}
                  onChange={(e) => setAndroidMinBuild(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ссылка на стор
                </label>
                <input
                  type="text"
                  value={androidStoreUrl}
                  onChange={(e) => setAndroidStoreUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
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
