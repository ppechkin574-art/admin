import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: string[];
  login: (userData: any, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      permissions: [],

      login: (userData, token) => {
        localStorage.setItem("token", token);
        set({
          user: userData,
          token,
          isAuthenticated: true,
          permissions: userData?.realm_access?.roles || [],
        });
      },

      logout: () => {
        localStorage.removeItem("token");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: [],
        });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
