import { create } from "zustand";
import { subjectCombinationService } from "@/services/api";

interface SubjectCombinationState {
  combinations: any[];
  currentCombination: any | null;
  loading: boolean;
  error: string | null;

  fetchCombinations: () => Promise<void>;
  fetchCombinationById: (id: number) => Promise<void>;
  createCombination: (data: any) => Promise<any>;
  updateCombination: (id: number, data: any) => Promise<any>;
  deleteCombination: (id: number) => Promise<void>;
  clearCurrent: () => void;
  clearError: () => void;
}

export const useSubjectCombinationStore = create<SubjectCombinationState>(
  (set, get) => ({
    combinations: [],
    currentCombination: null,
    loading: false,
    error: null,

    fetchCombinations: async () => {
      if (get().loading) return;
      set({ loading: true, error: null });
      try {
        const combinations = await subjectCombinationService.getAll();
        set({ combinations, loading: false });
      } catch (error: any) {
        set({ error: error.message, loading: false });
      }
    },

    fetchCombinationById: async (id: number) => {
      const current = get().currentCombination;
      if (get().loading || (current && current.id === id)) return;
      set({ loading: true, error: null });
      try {
        const combination = await subjectCombinationService.getById(id);
        set({ currentCombination: combination, loading: false });
      } catch (error: any) {
        set({ error: error.message, loading: false });
      }
    },

    createCombination: async (data: any) => {
      set({ loading: true, error: null });
      try {
        const newCombination = await subjectCombinationService.create(data);
        await get().fetchCombinations();
        set({ loading: false });
        return newCombination;
      } catch (error: any) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    updateCombination: async (id: number, data: any) => {
      set({ loading: true, error: null });
      try {
        const updatedCombination = await subjectCombinationService.update(
          id,
          data
        );
        await get().fetchCombinations();
        set({ loading: false });
        return updatedCombination;
      } catch (error: any) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    deleteCombination: async (id: number) => {
      set({ loading: true, error: null });
      try {
        await subjectCombinationService.delete(id);
        await get().fetchCombinations();
        set({ loading: false });
      } catch (error: any) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    clearCurrent: () => {
      set({ currentCombination: null });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);
