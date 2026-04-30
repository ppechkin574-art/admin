import { create } from "zustand";
import { moduleService } from "@/services/api";
import { ModuleLesson, SubjectModule } from "@/types/modules";

const CACHE_DURATION = 5 * 60 * 1000;

interface ModuleStore {
  modules: SubjectModule[];
  modulesById: Record<number, { data: SubjectModule; timestamp: number }>;
  cache: Map<string, { data: SubjectModule[]; timestamp: number; params: any }>;
  currentModule: SubjectModule | null;
  lessonsByModuleId: Record<number, ModuleLesson[]>;
  lessonsTimestamps: Record<number, number>;
  loadingLessons: Record<number, boolean>;
  loading: boolean;
  error: string | null;

  fetchModules: (params?: any, force?: boolean) => Promise<void>;
  fetchModuleById: (id: number, force?: boolean) => Promise<SubjectModule>;
  refreshModules: (params?: any) => Promise<void>;
  fetchModule: (id: number) => Promise<void>;
  deleteModule: (id: number) => Promise<void>;
  fetchModuleLessons: (moduleId: number, force?: boolean) => Promise<void>;
  refreshModuleLessons: (moduleId: number) => Promise<void>;
  setLesson: (moduleId: number, lesson: ModuleLesson) => void;
  invalidateCacheForSubject: (subjectId: number) => void;
  clearError: () => void;
  clearCurrentModule: () => void;
}

export const useModuleStore = create<ModuleStore>((set, get) => ({
  modules: [],
  modulesById: {},
  cache: new Map(),
  currentModule: null,
  lessonsByModuleId: {},
  lessonsTimestamps: {},
  loadingLessons: {},
  loading: false,
  error: null,

  fetchModules: async (params?: any, force = false) => {
    const cacheKey = JSON.stringify(params || {});
    const cached = get().cache.get(cacheKey);

    if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      set({ modules: cached.data, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      let fetchedModules: SubjectModule[];
      if (params?.subject_id)
        fetchedModules = await moduleService.getBySubject(
          params.subject_id,
          params,
        );
      else if (params?.search)
        fetchedModules = await moduleService.getAll(params);
      else fetchedModules = await moduleService.getAll();

      get().cache.set(cacheKey, {
        data: fetchedModules,
        timestamp: Date.now(),
        params,
      });

      set({ modules: fetchedModules, loading: false });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки модулей",
        loading: false,
      });
    }
  },

  fetchModuleById: async (id: number, force = false) => {
    const cached = get().modulesById[id];
    if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION)
      return cached.data;

    set({ loading: true, error: null });
    try {
      const module = await moduleService.getById(id);
      set((state) => ({
        modulesById: {
          ...state.modulesById,
          [id]: { data: module, timestamp: Date.now() },
        },
        loading: false,
      }));
      return module;
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки модуля", loading: false });
      throw error;
    }
  },

  refreshModules: async (params?: any) => {
    await get().fetchModules(params, true);
  },

  fetchModule: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const module = await moduleService.getById(id);
      set({ currentModule: module, loading: false });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки модуля", loading: false });
    }
  },

  deleteModule: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await moduleService.delete(id);

      get().cache.clear();

      const { lessonsByModuleId, lessonsTimestamps } = get();
      const newLessonsByModuleId = { ...lessonsByModuleId };
      const newLessonsTimestamps = { ...lessonsTimestamps };
      delete newLessonsByModuleId[id];
      delete newLessonsTimestamps[id];

      set((state) => ({
        modules: state.modules.filter((m) => m.id !== id),
        currentModule:
          state.currentModule?.id === id ? null : state.currentModule,
        lessonsByModuleId: newLessonsByModuleId,
        lessonsTimestamps: newLessonsTimestamps,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка удаления модуля", loading: false });
      throw error;
    }
  },

  fetchModuleLessons: async (moduleId: number, force = false) => {
    const timestamp = get().lessonsTimestamps[moduleId];
    if (!force && timestamp && Date.now() - timestamp < CACHE_DURATION) return;

    set((state) => ({
      loadingLessons: { ...state.loadingLessons, [moduleId]: true },
      error: null,
    }));

    try {
      const lessons = await moduleService.getModuleLessons(moduleId);

      set((state) => ({
        lessonsByModuleId: { ...state.lessonsByModuleId, [moduleId]: lessons },
        lessonsTimestamps: {
          ...state.lessonsTimestamps,
          [moduleId]: Date.now(),
        },
        loadingLessons: { ...state.loadingLessons, [moduleId]: false },
      }));
    } catch (error: any) {
      set((state) => ({
        error: error.message || "Ошибка загрузки уроков",
        loadingLessons: { ...state.loadingLessons, [moduleId]: false },
      }));
    }
  },

  refreshModuleLessons: async (moduleId: number) => {
    await get().fetchModuleLessons(moduleId, true);
  },

  clearError: () => set({ error: null }),

  clearCurrentModule: () => set({ currentModule: null }),

  setLesson: (moduleId: number, lesson: ModuleLesson) => {
    set((state) => {
      const currentLessons = state.lessonsByModuleId[moduleId] || [];
      const index = currentLessons.findIndex((l) => l.id === lesson.id);
      let newLessons;
      if (index >= 0) {
        newLessons = [...currentLessons];
        newLessons[index] = { ...newLessons[index], ...lesson };
      } else newLessons = [...currentLessons, lesson];
      return {
        lessonsByModuleId: {
          ...state.lessonsByModuleId,
          [moduleId]: newLessons,
        },
      };
    });
  },

  invalidateCacheForSubject: (subjectId: number) => {
    set((state) => {
      const newCache = new Map(state.cache);
      for (const [key, value] of newCache.entries())
        if (value.params?.subject_id === subjectId) newCache.delete(key);
      newCache.delete(JSON.stringify({}));
      return { cache: newCache };
    });
  },
}));
