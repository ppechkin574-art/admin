import { create } from "zustand";
import { trainerService } from "@/services/api";

interface Trainer {
  id: number;
  name: string;
  description: string;
  topic_id?: number;
  questions: any[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface TrainerState {
  trainers: Trainer[];
  trainersById: Record<number, Trainer>;
  currentTrainer: Trainer | null;
  loading: boolean;
  error: string | null;

  fetchTrainers: () => Promise<void>;
  fetchTrainer: (id: number) => Promise<void>;
  createTrainer: (data: Partial<Trainer>) => Promise<void>;
  updateTrainer: (id: number, data: Partial<Trainer>) => Promise<void>;
  deleteTrainer: (id: number) => Promise<void>;
  addQuestionToTrainer: (
    trainerId: number,
    questionId: number,
  ) => Promise<void>;
  removeQuestionFromTrainer: (
    trainerId: number,
    questionId: number,
  ) => Promise<void>;

  getTrainerById: (id: number) => Trainer | undefined;
  clearCurrentTrainer: () => void;
  clearError: () => void;

  trainerQuestions: Record<number, any[]>;
  questionsLoading: boolean;
  questionsError: string | null;

  fetchTrainerQuestions: (trainerId: number, params?: any) => Promise<void>;
  clearTrainerQuestions: (trainerId?: number) => void;
}

export const useTrainerStore = create<TrainerState>((set, get) => ({
  trainers: [],
  trainersById: {},
  currentTrainer: null,
  loading: false,
  error: null,
  trainerQuestions: {},
  questionsLoading: false,
  questionsError: null,

  fetchTrainers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await trainerService.getAll();
      const trainersData = Array.isArray(response)
        ? response
        : response.data || [];
      set({ trainers: trainersData, loading: false });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки тренажеров",
        loading: false,
      });
    }
  },

  fetchTrainer: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const trainer = await trainerService.getById(id);
      set((state) => ({
        currentTrainer: trainer,
        trainersById: { ...state.trainersById, [id]: trainer },
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.message || "Ошибка загрузки тренажера",
        loading: false,
      });
    }
  },

  createTrainer: async (data: Partial<Trainer>) => {
    set({ loading: true, error: null });
    try {
      const newTrainer = await trainerService.create(data);
      set((state) => ({
        trainers: [...state.trainers, newTrainer],
        trainersById: { ...state.trainersById, [newTrainer.id]: newTrainer },
        currentTrainer: newTrainer,
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.message || "Ошибка создания тренажера",
        loading: false,
      });
      throw error;
    }
  },

  updateTrainer: async (id: number, data: Partial<Trainer>) => {
    set({ loading: true, error: null });
    try {
      const updatedTrainer = await trainerService.update(id, data);
      set((state) => ({
        trainers: state.trainers.map((t) => (t.id === id ? updatedTrainer : t)),
        trainersById: { ...state.trainersById, [id]: updatedTrainer },
        currentTrainer:
          state.currentTrainer?.id === id
            ? updatedTrainer
            : state.currentTrainer,
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.message || "Ошибка обновления тренажера",
        loading: false,
      });
      throw error;
    }
  },

  deleteTrainer: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await trainerService.delete(id);
      set((state) => {
        const { [id]: _, ...restTrainersById } = state.trainersById;
        return {
          trainers: state.trainers.filter((t) => t.id !== id),
          trainersById: restTrainersById,
          currentTrainer:
            state.currentTrainer?.id === id ? null : state.currentTrainer,
          loading: false,
        };
      });
    } catch (error: any) {
      set({
        error: error.message || "Ошибка удаления тренажера",
        loading: false,
      });
      throw error;
    }
  },

  addQuestionToTrainer: async (trainerId: number, questionId: number) => {
    try {
      await trainerService.addQuestion(trainerId, questionId);
      await get().fetchTrainer(trainerId);
    } catch (error: any) {
      set({ error: error.message || "Ошибка добавления вопроса в тренажер" });
      throw error;
    }
  },

  removeQuestionFromTrainer: async (trainerId: number, questionId: number) => {
    try {
      await trainerService.removeQuestion(trainerId, questionId);
      await get().fetchTrainer(trainerId);
    } catch (error: any) {
      set({ error: error.message || "Ошибка удаления вопроса из тренажера" });
      throw error;
    }
  },

  getTrainerById: (id: number) => {
    return get().trainersById[id] || get().trainers.find((t) => t.id === id);
  },

  clearCurrentTrainer: () => set({ currentTrainer: null }),

  clearError: () => set({ error: null }),

  fetchTrainerQuestions: async (trainerId: number, params?: any) => {
    set({ questionsLoading: true, questionsError: null });
    try {
      const response = await trainerService.getQuestions(trainerId, params);
      const questions = response.questions || [];
      set((state) => ({
        trainerQuestions: {
          ...state.trainerQuestions,
          [trainerId]: questions,
        },
        questionsLoading: false,
      }));
    } catch (error: any) {
      set({
        questionsError: error.message || "Ошибка загрузки вопросов тренажера",
        questionsLoading: false,
      });
    }
  },

  clearTrainerQuestions: (trainerId?: number) => {
    if (trainerId) {
      set((state) => {
        const newQuestions = { ...state.trainerQuestions };
        delete newQuestions[trainerId];
        return { trainerQuestions: newQuestions };
      });
    } else {
      set({ trainerQuestions: {} });
    }
  },
}));
