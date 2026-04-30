import { create } from "zustand";
import { entService } from "@/services/api";
import { Subject } from "../types";

export interface EntOption {
  id: number;
  guid: string;
  option_number: number;
  subject_id: number;
  subject?: Subject;
  name?: string;
  subject_name?: string;
  questions_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface EntState {
  entOptions: EntOption[];
  loading: boolean;
  error: string | null;
  entQuestions: Record<number, any[]>;
  questionsLoading: boolean;
  questionsError: string | null;

  fetchEntOptions: () => Promise<void>;
  createEntOption: (data: Partial<EntOption>) => Promise<void>;
  updateEntOption: (id: number, data: Partial<EntOption>) => Promise<void>;
  deleteEntOption: (id: number) => Promise<void>;

  fetchEntQuestions: (entId: number, params?: any) => Promise<void>;
  clearEntQuestions: (entId?: number) => void;

  getEntOptionById: (id: number) => EntOption | undefined;
  clearError: () => void;
}

export const useEntStore = create<EntState>((set, get) => ({
  entOptions: [],
  loading: false,
  error: null,
  entQuestions: {},
  questionsLoading: false,
  questionsError: null,

  fetchEntOptions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await entService.getAll();
      const entOptionsData = Array.isArray(response)
        ? response
        : response.data || [];
      set({ entOptions: entOptionsData });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки вариантов ЕНТ" });
    } finally {
      set({ loading: false });
    }
  },

  createEntOption: async (data: Partial<EntOption>) => {
    set({ loading: true, error: null });
    try {
      const newEntOption = await entService.create(data);
      set((state) => ({
        entOptions: [...state.entOptions, newEntOption],
      }));
      return newEntOption;
    } catch (error: any) {
      set({ error: error.message || "Ошибка создания варианта ЕНТ" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateEntOption: async (id: number, data: Partial<EntOption>) => {
    set({ loading: true, error: null });
    try {
      const updatedEntOption = await entService.update(id, data);
      set((state) => ({
        entOptions: state.entOptions.map((opt) =>
          opt.id === id ? { ...opt, ...updatedEntOption } : opt
        ),
      }));
      return updatedEntOption;
    } catch (error: any) {
      set({ error: error.message || "Ошибка обновления варианта ЕНТ" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteEntOption: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await entService.delete(id);
      set((state) => ({
        entOptions: state.entOptions.filter((opt) => opt.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка удаления варианта ЕНТ" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getEntOptionById: (id: number) => {
    return get().entOptions.find((option) => option.id === id);
  },

  clearError: () => set({ error: null }),

  fetchEntQuestions: async (entId: number, params?: any) => {
    set({ questionsLoading: true, questionsError: null });
    try {
      const response = await entService.getQuestions(entId, params);
      const questions = response.questions || [];
      set((state) => ({
        entQuestions: {
          ...state.entQuestions,
          [entId]: questions,
        },
        questionsLoading: false,
      }));
    } catch (error: any) {
      set({
        questionsError:
          error.message || "Ошибка загрузки вопросов варианта ЕНТ",
        questionsLoading: false,
      });
    }
  },

  clearEntQuestions: (entId?: number) => {
    if (entId) {
      set((state) => {
        const newQuestions = { ...state.entQuestions };
        delete newQuestions[entId];
        return { entQuestions: newQuestions };
      });
    } else {
      set({ entQuestions: {} });
    }
  },
}));
