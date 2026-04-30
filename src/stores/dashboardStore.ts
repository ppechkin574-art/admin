import { create } from "zustand";
import { adminService } from "@/services/api";

interface DashboardData {
  subjects: any[];
  topics: any[];
  trainers: any[];
  ent_options: any[];
  total_stats: {
    total_subjects: number;
    total_topics: number;
    total_trainers: number;
    total_ent_options: number;
    total_questions: number;
    total_questions_in_trainers: number;
    total_questions_in_ent: number;
  };
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;

  fetchDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  clearData: () => void;

  getSubjects: () => any[];
  getTopics: () => any[];
  getTrainers: () => any[];
  getEntOptions: () => any[];
  getSubjectById: (id: number) => any | undefined;
  getTopicById: (id: number) => any | undefined;
  getTrainerById: (id: number) => any | undefined;
  getEntOptionById: (id: number) => any | undefined;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  lastUpdated: null,

  fetchDashboard: async () => {
    const state = get();

    set({ loading: true, error: null });
    try {
      const dashboardData = await adminService.getDashboard();

      set({
        data: dashboardData,
        loading: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки данных",
        loading: false,
      });
    }
  },

  refreshDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const dashboardData = await adminService.getDashboard();

      set({
        data: dashboardData,
        loading: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка обновления данных",
        loading: false,
      });
    }
  },

  clearData: () => {
    set({
      data: null,
      lastUpdated: null,
    });
  },

  getSubjects: () => {
    const { data } = get();
    return data?.subjects || [];
  },

  getTopics: () => {
    const { data } = get();
    return data?.topics || [];
  },

  getTrainers: () => {
    const { data } = get();
    return data?.trainers || [];
  },

  getEntOptions: () => {
    const { data } = get();
    return data?.ent_options || [];
  },

  getSubjectById: (id: number) => {
    const subjects = get().getSubjects();
    return subjects.find((subject) => subject.id === id);
  },

  getTopicById: (id: number) => {
    const topics = get().getTopics();
    return topics.find((topic) => topic.id === id);
  },

  getTrainerById: (id: number) => {
    const trainers = get().getTrainers();
    return trainers.find((trainer) => trainer.id === id);
  },

  getEntOptionById: (id: number) => {
    const entOptions = get().getEntOptions();
    return entOptions.find((ent) => ent.id === id);
  },
}));
