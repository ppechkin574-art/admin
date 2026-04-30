import { create } from "zustand";
import { subjectService } from "@/services/api";
import { Subject, SubjectType } from "@/types";
import { transformSubject } from "@/utils/apiTransform";

const CACHE_DURATION = 5 * 60 * 1000;

interface SubjectState {
  subjects: Subject[];
  currentSubject: Subject | null;
  loading: boolean;
  error: string | null;

  lastFetchTime: number | null;
  lastFetchParams: any | null;

  fetchSubjects: (force?: boolean) => Promise<void>;
  refreshSubjects: () => Promise<void>;
  fetchSubjectsDetailed: (force?: boolean) => Promise<void>;
  refreshSubjectsDetailed: () => Promise<void>;
  fetchSubject: (id: number) => Promise<void>;
  createSubject: (data: {
    name: string;
    type: SubjectType;
    image?: string;
    description?: string;
  }) => Promise<Subject>;
  updateSubject: (
    id: number,
    data: {
      name?: string;
      type?: SubjectType;
      image?: string;
      description?: string;
    },
  ) => Promise<Subject>;
  deleteSubject: (id: number) => Promise<void>;

  getSubjectById: (id: number) => Subject | undefined;
  clearCurrentSubject: () => void;
  clearError: () => void;
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  currentSubject: null,
  loading: false,
  error: null,
  lastFetchTime: null,
  lastFetchParams: null,

  fetchSubjects: async (force = false) => {
    const { subjects, lastFetchTime } = get();

    if (
      !force &&
      subjects.length > 0 &&
      lastFetchTime &&
      Date.now() - lastFetchTime < CACHE_DURATION
    ) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const response = await subjectService.getAll({ length: 1000 });
      const subjectsData = Array.isArray(response)
        ? response
        : response.data || [];
      const convertedSubjects = subjectsData.map(transformSubject);
      set({
        subjects: convertedSubjects,
        loading: false,
        lastFetchTime: Date.now(),
        lastFetchParams: { length: 1000 },
      });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки предметов",
        loading: false,
      });
    }
  },

  refreshSubjects: async () => {
    await get().fetchSubjects(true);
  },

  fetchSubjectsDetailed: async (force = false) => {
    const { subjects, lastFetchTime } = get();

    if (
      !force &&
      subjects.length > 0 &&
      lastFetchTime &&
      Date.now() - lastFetchTime < CACHE_DURATION
    ) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const detailedData = await subjectService.getAllDetailed();
      const subjectsData = Array.isArray(detailedData)
        ? detailedData
        : detailedData.data || [];
      const convertedSubjects = subjectsData.map(transformSubject);
      set({
        subjects: convertedSubjects,
        loading: false,
        lastFetchTime: Date.now(),
        lastFetchParams: { detailed: true },
      });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки детальных данных предметов",
        loading: false,
      });
    }
  },

  refreshSubjectsDetailed: async () => {
    await get().fetchSubjectsDetailed(true);
  },

  fetchSubject: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const subject = await subjectService.getById(id);
      console.log("API response for subject:", subject);
      const convertedSubject = transformSubject(subject);
      set({ currentSubject: convertedSubject });

      const { subjects } = get();
      const updatedSubjects = subjects.map((s) =>
        s.id === id ? { ...s, ...convertedSubject } : s,
      );
      set({ subjects: updatedSubjects });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки предмета",
        loading: false,
      });
    } finally {
      set({ loading: false });
    }
  },

  createSubject: async (data) => {
    set({ loading: true, error: null });
    try {
      const newSubject = await subjectService.create(data);
      const convertedSubject = transformSubject(newSubject);
      set((state) => ({
        subjects: [...state.subjects, convertedSubject],
        currentSubject: convertedSubject,
        lastFetchTime: null,
      }));
      return convertedSubject;
    } catch (error: any) {
      set({
        error: error.message || "Ошибка создания предмета",
        loading: false,
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateSubject: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedSubject = await subjectService.update(id, data);
      const convertedSubject = transformSubject(updatedSubject);
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === id ? { ...s, ...convertedSubject } : s,
        ),
        currentSubject:
          state.currentSubject?.id === id
            ? { ...state.currentSubject, ...convertedSubject }
            : state.currentSubject,
        lastFetchTime: null,
      }));
      return convertedSubject;
    } catch (error: any) {
      set({
        error: error.message || "Ошибка обновления предмета",
        loading: false,
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteSubject: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await subjectService.delete(id);
      set((state) => ({
        subjects: state.subjects.filter((s) => s.id !== id),
        currentSubject:
          state.currentSubject?.id === id ? null : state.currentSubject,
        lastFetchTime: null,
      }));
    } catch (error: any) {
      set({
        error: error.message || "Ошибка удаления предмета",
        loading: false,
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getSubjectById: (id: number) => {
    return get().subjects.find((subject) => subject.id === id);
  },

  clearCurrentSubject: () => set({ currentSubject: null }),
  clearError: () => set({ error: null }),
}));
