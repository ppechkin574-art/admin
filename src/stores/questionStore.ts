import { create } from "zustand";
import { questionService } from "@/services/api";
import { Question, Difficulty, QuestionType } from "@/types";
import { transformQuestion } from "@/utils/apiTransform";

interface QuestionState {
  questions: Question[];
  allQuestions: Question[];
  currentQuestion: Question | null;
  loading: boolean;
  loadingQuestions: boolean;
  error: string | null;
  lastFetched: number | null;
  cacheDuration: number;

  fetchAllQuestions: (force?: boolean) => Promise<void>;
  fetchQuestions: (filters?: any) => Promise<void>;
  fetchQuestion: (id: number) => Promise<void>;
  createQuestion: (data: Partial<Question>) => Promise<void>;
  updateQuestion: (id: number, data: Partial<Question>) => Promise<void>;
  deleteQuestion: (id: number) => Promise<void>;

  updateQuestionInCache: (updatedQuestion: Question) => void;
  addQuestionToCache: (newQuestion: Question) => void;
  removeQuestionFromCache: (questionId: number) => void;
  getPaginatedQuestions: (
    page: number,
    pageSize: number,
    filters?: any
  ) => {
    questions: Question[];
    totalCount: number;
    totalPages: number;
  };

  getQuestionById: (id: number) => Question | undefined;
  clearCurrentQuestion: () => void;
  clearError: () => void;
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  allQuestions: [],
  currentQuestion: null,
  loading: false,
  loadingQuestions: false,
  error: null,
  lastFetched: null,
  cacheDuration: 5 * 60 * 1000,

  fetchAllQuestions: async (force = false) => {
    set({ loadingQuestions: true, error: null });
    try {
      const response = await questionService.getAll({ length: 10000 });

      let questionsData: any[] = [];
      if (Array.isArray(response)) {
        questionsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        questionsData = response.data;
      } else {
        questionsData = response;
      }

      const convertedQuestions: Question[] =
        questionsData.map(transformQuestion);

      set({
        allQuestions: convertedQuestions,
        lastFetched: Date.now(),
      });

    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки вопросов" });
    } finally {
      set({ loadingQuestions: false });
    }
  },

  fetchQuestions: async (filters = {}) => {
    set({ loadingQuestions: true, error: null });
    try {
      const apiParams: any = { ...filters };

      if (filters.start !== undefined && filters.length !== undefined) {
        apiParams.start = filters.start;
        apiParams.length = filters.length;
        apiParams.draw = 1;
        apiParams.order = '[{"column": "id", "dir": "asc"}]';
      }

      const response = await questionService.getAll(apiParams);

      let questionsData: any[] = [];
      if (Array.isArray(response)) {
        questionsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        questionsData = response.data;
      } else if (response.records && Array.isArray(response.records)) {
        questionsData = response.records;
      } else {
        questionsData = response;
      }

      const convertedQuestions: Question[] =
        questionsData.map(transformQuestion);
      set({ questions: convertedQuestions });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки вопросов" });
    } finally {
      set({ loadingQuestions: false });
    }
  },

  getPaginatedQuestions: (page: number, pageSize: number, filters = {}) => {
    const { allQuestions } = get();

    let filteredQuestions = [...allQuestions];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredQuestions = filteredQuestions.filter(
        (q) =>
          q.blocks?.some(
            (block: any) =>
              block.type === "text" &&
              block.value?.toLowerCase().includes(searchLower)
          ) || q.id.toString().includes(searchLower)
      );
    }

    if (filters.difficulty?.length > 0)
      filteredQuestions = filteredQuestions.filter((q) =>
        filters.difficulty.includes(q.difficulty)
      );

    if (filters.type?.length > 0)
      filteredQuestions = filteredQuestions.filter((q) =>
        filters.type.includes(q.question_type)
      );

    if (filters.subject_ids?.length > 0)
      filteredQuestions = filteredQuestions.filter((q) =>
        filters.subject_ids.includes(q.subject_id.toString())
      );

    if (filters.topic_ids?.length > 0)
      filteredQuestions = filteredQuestions.filter((q) =>
        filters.topic_ids.includes(q.topic_id?.toString())
      );

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      questions: filteredQuestions.slice(startIndex, endIndex),
      totalCount: filteredQuestions.length,
      totalPages: Math.ceil(filteredQuestions.length / pageSize),
    };
  },

  updateQuestionInCache: (updatedQuestion: Question) =>
    set((state) => ({
      allQuestions: state.allQuestions.map((q) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      ),
      questions: state.questions.map((q) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      ),
      currentQuestion:
        state.currentQuestion?.id === updatedQuestion.id
          ? updatedQuestion
          : state.currentQuestion,
    })),
  addQuestionToCache: (newQuestion: Question) =>
    set((state) => ({
      allQuestions: [newQuestion, ...state.allQuestions],
      questions: [newQuestion, ...state.questions],
    })),
  removeQuestionFromCache: (questionId: number) =>
    set((state) => ({
      allQuestions: state.allQuestions.filter((q) => q.id !== questionId),
      questions: state.questions.filter((q) => q.id !== questionId),
      currentQuestion:
        state.currentQuestion?.id === questionId ? null : state.currentQuestion,
    })),
  fetchQuestion: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const question = await questionService.getById(id);
      const convertedQuestion = transformQuestion(question);

      set({ currentQuestion: convertedQuestion });

      const { questions, allQuestions } = get();
      const updatedQuestions = questions.map((q) =>
        q.id === id ? { ...q, ...convertedQuestion } : q
      );
      const updatedAllQuestions = allQuestions.map((q) =>
        q.id === id ? { ...q, ...convertedQuestion } : q
      );

      set({
        questions: updatedQuestions,
        allQuestions: updatedAllQuestions,
      });
    } catch (error: any) {
      set({ error: error.message || "Ошибка загрузки вопроса" });
    } finally {
      set({ loading: false });
    }
  },

  createQuestion: async (data: Partial<Question>) => {
    set({ loading: true, error: null });
    try {
      const apiData = {
        ...data,
        type: data.question_type,
      };
      delete apiData.question_type;

      const newQuestion = await questionService.create(apiData);
      const convertedQuestion = transformQuestion(newQuestion);

      set((state) => ({
        questions: [convertedQuestion, ...state.questions],
        allQuestions: [convertedQuestion, ...state.allQuestions],
        currentQuestion: convertedQuestion,
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка создания вопроса" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateQuestion: async (id: number, data: Partial<Question>) => {
    set({ loading: true, error: null });
    try {
      const apiData = { ...data };
      if (data.question_type) {
        apiData.type = data.question_type;
        delete apiData.question_type;
      }

      const updatedQuestion = await questionService.update(id, apiData);
      const convertedQuestion = transformQuestion(updatedQuestion);

      set((state) => ({
        questions: state.questions.map((q) =>
          q.id === id ? { ...q, ...convertedQuestion } : q
        ),
        allQuestions: state.allQuestions.map((q) =>
          q.id === id ? { ...q, ...convertedQuestion } : q
        ),
        currentQuestion:
          state.currentQuestion?.id === id
            ? { ...state.currentQuestion, ...convertedQuestion }
            : state.currentQuestion,
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка обновления вопроса" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteQuestion: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await questionService.delete(id);

      set((state) => ({
        questions: state.questions.filter((q) => q.id !== id),
        allQuestions: state.allQuestions.filter((q) => q.id !== id),
        currentQuestion:
          state.currentQuestion?.id === id ? null : state.currentQuestion,
      }));
    } catch (error: any) {
      set({ error: error.message || "Ошибка удаления вопроса" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchQuestionStats: async (topicId: number) => {
    try {
      const [questionsResponse] = await Promise.all([
        questionService.getAll({ topic_ids: [topicId], page_size: 1000 }),
      ]);

      let questionsData: any[] = [];
      if (Array.isArray(questionsResponse)) {
        questionsData = questionsResponse;
      } else if (
        questionsResponse.data &&
        Array.isArray(questionsResponse.data)
      ) {
        questionsData = questionsResponse.data;
      }

      return {
        totalQuestions: questionsData.length,
        trainingQuestions: 0,
        entQuestions: 0,
      };
    } catch (error) {
      return {
        totalQuestions: 0,
        trainingQuestions: 0,
        entQuestions: 0,
      };
    }
  },

  getQuestionById: (id: number) => {
    const state = get();
    return (
      state.allQuestions.find((question) => question.id === id) ||
      state.questions.find((question) => question.id === id)
    );
  },

  clearCurrentQuestion: () => set({ currentQuestion: null }),
  clearError: () => set({ error: null }),
}));
