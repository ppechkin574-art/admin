import { create } from "zustand";
import { questionService, topicService } from "@/services/api";

const CACHE_DURATION = 5 * 60 * 1000;

interface Topic {
  id: number;
  name: string;
  description: string;
  subject_id: number;
  question_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface TopicState {
  topics: Topic[];
  currentTopic: Topic | null;
  topicQuestions: Record<number, any[]>;
  loading: boolean;
  loadingQuestions: boolean;
  error: string | null;
  lastFetchTime: number | null;
  lastFetchParams: any | null;

  fetchTopics: (force?: boolean) => Promise<void>;
  fetchTopicsDetailed: () => Promise<void>;
  fetchTopic: (id: number) => Promise<void>;
  fetchTopicQuestions: (topicId: number, filters?: any) => Promise<void>;
  createTopic: (data: Partial<Topic>) => Promise<void>;
  updateTopic: (id: number, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: number) => Promise<void>;

  getTopicById: (id: number) => Topic | undefined;
  getTopicsBySubject: (subjectId: number) => Topic[];
  clearCurrentTopic: () => void;
  clearError: () => void;
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: [],
  currentTopic: null,
  topicQuestions: {},
  loading: false,
  loadingQuestions: false,
  error: null,
  lastFetchTime: null,
  lastFetchParams: null,

  fetchTopics: async (force = false) => {
    const { topics, lastFetchTime } = get();
    if (
      !force &&
      topics.length > 0 &&
      lastFetchTime &&
      Date.now() - lastFetchTime < CACHE_DURATION
    )
      return;

    set({ loading: true, error: null });
    try {
      const response = await topicService.getAll({ length: 1000 });
      const topicsData = Array.isArray(response)
        ? response
        : response.data || [];
      set({
        topics: topicsData,
        loading: false,
        lastFetchTime: Date.now(),
        lastFetchParams: { length: 1000 },
      });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки тем", loading: false });
    }
  },

  fetchTopicsDetailed: async () => {
    set({ loading: true, error: null });
    try {
      const detailedData = await topicService.getAllDetailed();
      const topicsData = Array.isArray(detailedData)
        ? detailedData
        : detailedData.data || [];
      set({ topics: topicsData, loading: false, lastFetchTime: Date.now() });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки детальных данных тем",
        loading: false,
      });
    }
  },

  fetchTopic: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const topic = await topicService.getById(id);
      set({ currentTopic: topic });

      const { topics } = get();
      const updatedTopics = topics.map((t) =>
        t.id === id ? { ...t, ...topic } : t,
      );
      set({ topics: updatedTopics });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки темы" });
    } finally {
      set({ loading: false });
    }
  },

  fetchTopicQuestions: async (topicId: number, filters = {}) => {
    set({ loadingQuestions: true });
    try {
      const response = await questionService.getAll({
        topic_ids: [topicId],
        ...filters,
        page_size: 1000,
      });

      let questionsData = [];
      if (Array.isArray(response)) {
        questionsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        questionsData = response.data;
      }

      set((state) => ({
        topicQuestions: {
          ...state.topicQuestions,
          [topicId]: questionsData,
        },
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки вопросов темы" });
    } finally {
      set({ loadingQuestions: false });
    }
  },

  createTopic: async (data: Partial<Topic>) => {
    set({ loading: true, error: null });
    try {
      const newTopic = await topicService.create(data);
      set((state) => ({
        topics: [...state.topics, newTopic],
        currentTopic: newTopic,
        lastFetchTime: null,
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка создания темы", loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateTopic: async (id: number, data: Partial<Topic>) => {
    set({ loading: true, error: null });
    try {
      const updatedTopic = await topicService.update(id, data);
      set((state) => ({
        topics: state.topics.map((t) =>
          t.id === id ? { ...t, ...updatedTopic } : t,
        ),
        currentTopic:
          state.currentTopic?.id === id
            ? { ...state.currentTopic, ...updatedTopic }
            : state.currentTopic,
        lastFetchTime: null,
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка обновления темы", loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteTopic: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await topicService.delete(id);
      set((state) => ({
        topics: state.topics.filter((t) => t.id !== id),
        currentTopic: state.currentTopic?.id === id ? null : state.currentTopic,
        topicQuestions: Object.fromEntries(
          Object.entries(state.topicQuestions).filter(
            ([topicId]) => parseInt(topicId) !== id,
          ),
        ),
        lastFetchTime: null,
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка удаления темы", loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getTopicById: (id: number) => {
    return get().topics.find((topic) => topic.id === id);
  },

  getTopicsBySubject: (subjectId: number) => {
    return get().topics.filter((topic) => topic.subject_id === subjectId);
  },

  clearCurrentTopic: () => set({ currentTopic: null }),
  clearError: () => set({ error: null }),
}));
