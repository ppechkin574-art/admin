export interface Promocode {
  id: number;
  code: string;
  description?: string | null;
  duration_days: 7 | 14 | 30;
  max_activations: number;
  activations_count: number;
  expires_at?: string | null;
  created_at: string;
}

export interface PromocodeHistoryItem {
  id: number;
  student_guid: string;
  activated_at: string;
  access_expires_at: string;
}

export interface PromocodeCreateRequest {
  duration_days: 7 | 14 | 30;
  max_activations: number;
  code?: string | null;
  expires_at?: string | null;
  description?: string | null;
}

export interface PromocodeFormData {
  duration_days: 7 | 14 | 30;
  max_activations: number;
  code?: string;
  expires_at?: string | null;
  description?: string;
}

