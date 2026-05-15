import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, Pencil, RefreshCw, X } from "lucide-react";

import { appSettingsService } from "@/services/api";
import { AppSetting } from "@/types/appSettings";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";

/**
 * Editor for runtime-config knobs backing the SMS abuse defences and
 * future feature flags. Each setting renders as a row with an inline
 * "Edit → input → Save" affordance: the admin clicks the pencil, types
 * a new value, hits the green tick. We do NOT use the standard table
 * `actions` slot because settings have no detail page — the entire
 * mutable surface is the single `value` field.
 *
 * Description is shown next to each row so the person editing knows
 * what they're flipping. Descriptions come from the seed migrations
 * and never change at runtime, on purpose: the meaning of a key
 * shouldn't drift silently.
 */
export const AppSettingsList: React.FC = () => {
  const [items, setItems] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appSettingsService.getAll();
      setItems(data);
    } catch (err: any) {
      console.error("Error loading app settings:", err);
      setError(err.message || "Ошибка загрузки настроек");
      toast.error("Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (item: AppSetting) => {
    setEditingKey(item.key);
    setEditValue(item.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = useCallback(async () => {
    if (!editingKey) return;
    if (editValue.trim() === "") {
      toast.error("Значение не может быть пустым");
      return;
    }
    setSaving(true);
    try {
      const updated = await appSettingsService.updateValue(editingKey, editValue.trim());
      setItems((prev) =>
        prev.map((s) => (s.key === editingKey ? (updated as AppSetting) : s)),
      );
      toast.success(`Сохранено: ${editingKey}`);
      setEditingKey(null);
      setEditValue("");
    } catch (err: any) {
      console.error("Error saving app setting:", err);
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? `Ошибка: ${detail}`
          : "Не удалось сохранить — проверьте формат значения",
      );
    } finally {
      setSaving(false);
    }
  }, [editingKey, editValue]);

  const formatDate = (s: string): string => new Date(s).toLocaleString("ru-RU");

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Button variant="secondary" onClick={load}>
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ListContainer>
      <ListHeader title="Настройки сервиса">
        <Button
          variant="secondary"
          onClick={load}
          disabled={loading}
          icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
        >
          {loading ? "Загрузка..." : "Обновить"}
        </Button>
      </ListHeader>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Настроек пока нет</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Ключ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Значение
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  Обновлено
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const isEditing = editingKey === item.key;
                return (
                  <tr key={item.key}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                      {item.key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          className="border border-blue-400 rounded px-2 py-1 font-mono w-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
                          disabled={saving}
                        />
                      ) : (
                        <span className="font-mono font-semibold text-gray-900">
                          {item.value}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(item.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            title="Сохранить"
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            title="Отменить"
                            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          title="Изменить"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 px-4 text-sm text-gray-500">
        💡 Изменения применяются на бэкенде в течение ~60 секунд (Redis-кэш TTL).
        Чтобы протестировать сразу — можно подождать или вручную сбросить кэш в Redis.
      </div>
    </ListContainer>
  );
};
