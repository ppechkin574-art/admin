/**
 * One row from `/admin/app-settings` — the editable runtime-config
 * store backing knobs like the daily SMS cap and per-IP abuse threshold.
 * Operators tune these from the admin panel without redeploying.
 * `description` is set when the setting is introduced (migration) and
 * stays immutable — only `value` can be updated through the API.
 */
export interface AppSetting {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface AppSettingUpdatePayload {
  value: string;
}
