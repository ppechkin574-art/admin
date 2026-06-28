import { create } from "zustand";
import { securityService } from "@/services/api";

export interface FraudEvent {
  id: number;
  user_id: string;
  ip_address: string | null;
  device_id: string | null;
  event_type: string;
  risk_score: number;
  reason: string | null;
  status: "open" | "reviewed" | "false_positive" | string;
  endpoint: string | null;
  method: string | null;
  user_agent: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface UserRiskProfile {
  id: number;
  user_id: string;
  status: "normal" | "watched" | "restricted" | "blocked" | string;
  current_risk_score: number;
  last_suspicious_activity_at: string | null;
  total_suspicious_events: number;
  restricted_until: string | null;
  blocked_at: string | null;
  restriction_reason: string | null;
  is_watchlisted: boolean;
  points_frozen: boolean;
  referral_disabled: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface SecurityOverview {
  suspicious_users_24h: number;
  suspicious_events_24h: number;
  blocked_accounts: number;
  restricted_accounts: number;
  open_events: number;
  suspicious_points_24h: number;
}

interface SecurityState {
  overview: SecurityOverview | null;
  events: { items: FraudEvent[]; total: number; page: number; limit: number } | null;
  riskyUsers: { items: UserRiskProfile[]; total: number } | null;
  loading: boolean;
  error: string | null;

  fetchOverview: () => Promise<void>;
  fetchEvents: (params?: {
    page?: number; limit?: number; status?: string; event_type?: string;
    min_risk?: number; user_id?: string; ip?: string; device_id?: string;
    from_date?: string; to_date?: string;
  }) => Promise<void>;
  fetchRiskyUsers: (params?: {
    page?: number; limit?: number; search?: string; status?: string; min_risk?: number;
  }) => Promise<void>;
  markEventReviewed: (eventId: number) => Promise<void>;
  restrictUser: (userId: string, data: { reason: string; until?: string }) => Promise<void>;
  blockUser: (userId: string, data: { reason: string }) => Promise<void>;
  unrestrictUser: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  overview: null,
  events: null,
  riskyUsers: null,
  loading: false,
  error: null,

  fetchOverview: async () => {
    set({ loading: true, error: null });
    try {
      const data = await securityService.getOverview();
      set({ overview: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки обзора безопасности", loading: false });
    }
  },

  fetchEvents: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await securityService.getEvents(params);
      set({ events: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки событий безопасности", loading: false });
    }
  },

  fetchRiskyUsers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await securityService.getRiskyUsers(params);
      set({ riskyUsers: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки подозрительных пользователей", loading: false });
    }
  },

  markEventReviewed: async (eventId: number) => {
    try {
      await securityService.markEventReviewed(eventId);
      const events = get().events;
      if (events) {
        set({
          events: {
            ...events,
            items: events.items.map(e =>
              e.id === eventId ? { ...e, status: "reviewed" } : e
            ),
          },
        });
      }
    } catch (error: any) {
      set({ error: error.message || "Ошибка при отметке события" });
      throw error;
    }
  },

  restrictUser: async (userId: string, data: { reason: string; until?: string }) => {
    try {
      await securityService.restrictUser(userId, data);
    } catch (error: any) {
      set({ error: error.message || "Ошибка при ограничении пользователя" });
      throw error;
    }
  },

  blockUser: async (userId: string, data: { reason: string }) => {
    try {
      await securityService.blockUser(userId, data);
    } catch (error: any) {
      set({ error: error.message || "Ошибка при блокировке пользователя" });
      throw error;
    }
  },

  unrestrictUser: async (userId: string) => {
    try {
      await securityService.unrestrictUser(userId);
    } catch (error: any) {
      set({ error: error.message || "Ошибка при снятии ограничений" });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
