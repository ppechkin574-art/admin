import { create } from "zustand";
import { userService } from "@/services/api";

const CACHE_DURATION = 5 * 60 * 1000;

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  roles: string[];
  // Computed string from backend: "parent" | "child" | "user".
  // Mirrors UserDTO.role @computed_field — derived from `roles`,
  // safe even if backend ever stops emitting it.
  role?: "parent" | "child" | "user" | string;
  allowed_subject_ids: number[];
  // Школьный класс (5..11). null для родителей/учителей и для
  // legacy-юзеров зарегистрированных до 09.05.2026 (поле введено
  // задним числом). Backend стал отдавать это поле в коммите от
  // 2026-05-09.
  grade: number | null;
  plan: "FREE" | "PRO" | string;
  used_trial: boolean;
  subscription_end: string | null;
  subscription_cancelled: boolean;
  attendance_streak_days: number;
  attendance_total_points: number;
  // Leaderboard "stars" (user_points.total_points) + place. Backend now
  // sources these from user_points, matching what the app shows.
  points: number;
  rank: number | null;
  // Best-effort device/version/activity signals, enriched from the latest
  // analytics event (device-token platform fallback). Any may be null when
  // the user never sent an event / registered a push token (FCM disabled).
  device_platform: string | null;
  device_os_version: string | null;
  app_version: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface UserState {
  users: User[];
  usersById: Record<string, User>;
  cache: Map<string, { data: User[]; timestamp: number; params: any }>;
  loading: boolean;
  error: string | null;

  fetchUsers: (
    params?: { role?: string; search?: string },
    force?: boolean,
  ) => Promise<void>;
  fetchUserById: (id: string, force?: boolean) => Promise<User>;
  refreshUsers: (params?: { role?: string; search?: string }) => Promise<void>;
  createUser: (data: any) => Promise<User>;
  updateUser: (id: string, data: any) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  grantPro: (id: string, days?: number) => Promise<void>;
  resetToFree: (id: string) => Promise<void>;
  adjustPoints: (
    id: string,
    mode: "delta" | "set",
    value: number,
    reason?: string,
  ) => Promise<{ total_points: number; rank: number; applied_delta: number }>;

  clearCache: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  usersById: {},
  cache: new Map(),
  loading: false,
  error: null,

  fetchUsers: async (params = {}, force = false) => {
    const cacheKey = JSON.stringify(params);
    const cached = get().cache.get(cacheKey);

    if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      set({ users: cached.data, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const data = await userService.getAll(params);
      get().cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        params,
      });
      set({ users: data, loading: false });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки пользователей",
        loading: false,
      });
    }
  },

  fetchUserById: async (id: string, force = false) => {
    const cached = get().usersById[id];
    if (!force && cached) return cached;

    set({ loading: true, error: null });
    try {
      const user = await userService.getById(id);
      set((state) => ({
        usersById: { ...state.usersById, [id]: user },
        loading: false,
      }));
      return user;
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки пользователя",
        loading: false,
      });
      throw error;
    }
  },

  refreshUsers: async (params = {}) => {
    await get().fetchUsers(params, true);
  },

  createUser: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const newUser = await userService.create(data);
      get().cache.clear();
      set((state) => ({
        usersById: { ...state.usersById, [newUser.id]: newUser },
        loading: false,
      }));
      return newUser;
    } catch (error: any) {
      set({
        error: error.message || "Ошибка создания пользователя",
        loading: false,
      });
      throw error;
    }
  },

  updateUser: async (id: string, data: any) => {
    set({ loading: true, error: null });
    try {
      const updatedUser = await userService.update(id, data);
      get().cache.clear();
      set((state) => ({
        usersById: { ...state.usersById, [id]: updatedUser },
        loading: false,
      }));
      return updatedUser;
    } catch (error: any) {
      set({
        error: error.message || "Ошибка обновления пользователя",
        loading: false,
      });
      throw error;
    }
  },

  deleteUser: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await userService.delete(id);
      get().cache.clear();
      set((state) => {
        const { [id]: _, ...rest } = state.usersById;
        return {
          usersById: rest,
          loading: false,
        };
      });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка удаления пользователя",
        loading: false,
      });
      throw error;
    }
  },

  grantPro: async (id: string, days = 30) => {
    await userService.grantPro(id, days)
    get().cache.clear()
  },

  resetToFree: async (id: string) => {
    await userService.resetSubscription(id)
    get().cache.clear()
  },

  adjustPoints: async (id, mode, value, reason) => {
    const res = await userService.adjustPoints(id, mode, value, reason)
    // Points/rank changed → drop the cached list so the next fetch is fresh.
    get().cache.clear()
    return res
  },

  clearCache: () => set({ cache: new Map() }),
  clearError: () => set({ error: null }),
}));
