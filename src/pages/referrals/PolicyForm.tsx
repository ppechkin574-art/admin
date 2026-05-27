import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, RefreshCw } from "lucide-react";

import { appSettingsService } from "@/services/api";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import Button from "@/components/common/Button";

/**
 * Dedicated screen for tuning the referral reward bundle.
 *
 * Backed by four `app_settings` rows (referral_inviter_stars /
 * referral_inviter_days / referral_invitee_stars / referral_invitee_days).
 * Same `appSettingsService.updateValue` admin endpoint as the generic
 * `Настройки сервиса` screen — this form just gives the four knobs
 * named labels and a single Save button so the operator doesn't have
 * to remember keys.
 *
 * Validation kept minimal: positive integers, ≤ 9999 (a sanity ceiling
 * — anything higher is almost certainly a typo and would flood the
 * leaderboard / Pro grant in one wrong save).
 */

const POLICY_KEYS = {
  inviterStars: "referral_inviter_stars",
  inviterDays: "referral_inviter_days",
  inviteeStars: "referral_invitee_stars",
  inviteeDays: "referral_invitee_days",
} as const;

type PolicyField = keyof typeof POLICY_KEYS;

interface PolicyState {
  inviterStars: string;
  inviterDays: string;
  inviteeStars: string;
  inviteeDays: string;
}

const empty: PolicyState = {
  inviterStars: "",
  inviterDays: "",
  inviteeStars: "",
  inviteeDays: "",
};

export const ReferralPolicyForm: React.FC = () => {
  const [values, setValues] = useState<PolicyState>(empty);
  const [original, setOriginal] = useState<PolicyState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await appSettingsService.getAll();
      const byKey = new Map<string, string>(
        all.map((s) => [s.key as string, String(s.value)]),
      );
      const next: PolicyState = {
        inviterStars: byKey.get(POLICY_KEYS.inviterStars) ?? "",
        inviterDays: byKey.get(POLICY_KEYS.inviterDays) ?? "",
        inviteeStars: byKey.get(POLICY_KEYS.inviteeStars) ?? "",
        inviteeDays: byKey.get(POLICY_KEYS.inviteeDays) ?? "",
      };
      setValues(next);
      setOriginal(next);
    } catch (err: any) {
      console.error("Error loading referral policy:", err);
      setError(err.message || "Ошибка загрузки политики");
      toast.error("Не удалось загрузить политику");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const validate = (s: PolicyState): string | null => {
    const fields: [PolicyField, string][] = [
      ["inviterStars", "Звёзды пригласившему"],
      ["inviterDays", "Дни пригласившему"],
      ["inviteeStars", "Звёзды приглашённому"],
      ["inviteeDays", "Дни приглашённому"],
    ];
    for (const [k, label] of fields) {
      const raw = s[k].trim();
      if (raw === "") return `Поле «${label}» обязательно`;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0)
        return `«${label}» должно быть неотрицательным целым числом`;
      if (n > 9999) return `«${label}»: максимум 9999`;
    }
    return null;
  };

  const dirty = (Object.keys(values) as PolicyField[]).some(
    (k) => values[k] !== original[k],
  );

  const save = useCallback(async () => {
    const err = validate(values);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      // Only PUT the keys that actually changed — minimises admin
      // audit-log noise when only one knob was moved.
      const changes: Array<[string, string]> = [];
      (Object.keys(POLICY_KEYS) as PolicyField[]).forEach((field) => {
        if (values[field] !== original[field]) {
          changes.push([POLICY_KEYS[field], values[field].trim()]);
        }
      });
      for (const [key, value] of changes) {
        await appSettingsService.updateValue(key, value);
      }
      setOriginal(values);
      toast.success(
        changes.length === 1
          ? `Сохранено: ${changes[0][0]}`
          : `Сохранено ${changes.length} настроек`,
      );
    } catch (err: any) {
      console.error("Error saving referral policy:", err);
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? `Ошибка: ${detail}`
          : "Не удалось сохранить",
      );
    } finally {
      setSaving(false);
    }
  }, [values, original]);

  const setField = (field: PolicyField, value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

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
      <ListHeader title="Реферальная политика">
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
      </ListHeader>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <p className="text-sm text-gray-600">
          Награды, выдаваемые при использовании реферального промокода в iOS-приложении.
          Применяются в течение ~60 секунд после сохранения (Redis-кэш TTL).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FieldGroup
            title="Пригласивший (отправитель кода)"
            description="Бонус автору кода в момент, когда кто-то его активирует."
            disabled={loading || saving}
          >
            <NumberField
              label="Звёзды (очки лидерборда)"
              value={values.inviterStars}
              onChange={(v) => setField("inviterStars", v)}
              disabled={loading || saving}
            />
            <NumberField
              label="Дни Pro-подписки"
              value={values.inviterDays}
              onChange={(v) => setField("inviterDays", v)}
              disabled={loading || saving}
            />
          </FieldGroup>

          <FieldGroup
            title="Приглашённый (вводит код)"
            description="Бонус новому пользователю в момент ввода чужого кода."
            disabled={loading || saving}
          >
            <NumberField
              label="Звёзды (очки лидерборда)"
              value={values.inviteeStars}
              onChange={(v) => setField("inviteeStars", v)}
              disabled={loading || saving}
            />
            <NumberField
              label="Дни Pro-подписки"
              value={values.inviteeDays}
              onChange={(v) => setField("inviteeDays", v)}
              disabled={loading || saving}
            />
          </FieldGroup>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          {dirty && !saving && (
            <span className="text-sm text-amber-600">
              Есть несохранённые изменения
            </span>
          )}
          <Button
            variant="primary"
            onClick={save}
            disabled={!dirty || saving || loading}
            icon={<Save className="h-4 w-4" />}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      <div className="mt-4 px-4 text-sm text-gray-500">
        💡 Текущие значения хранятся в app_settings под ключами{" "}
        <code className="font-mono">referral_*</code>. Историю выданных
        наград не переписывает — каждое успешное активирование фиксирует
        тогдашние числа в строке таблицы <code>referral_redemptions</code>.
      </div>
    </ListContainer>
  );
};

interface FieldGroupProps {
  title: string;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const FieldGroup: React.FC<FieldGroupProps> = ({ title, description, children }) => (
  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
    <div>
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
    <div className="space-y-3 pt-1">{children}</div>
  </div>
);

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  disabled,
}) => (
  <label className="block">
    <span className="text-sm text-gray-700">{label}</span>
    <input
      type="number"
      min="0"
      max="9999"
      step="1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="mt-1 w-full border border-gray-300 rounded px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
    />
  </label>
);
