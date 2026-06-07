import axios from "axios";
import { Subject, SubjectType, Topic } from "@/types";
import { ModuleLesson, SubjectModule } from "@/types/modules";
import {
  QuestionDraft,
  QuestionDraftListParams,
  QuestionDraftListResult,
  QuestionDraftUpdate,
} from "@/types/questionDrafts";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

let alreadyRedirectedToLogin = false;

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      console.warn("API 401 — not authenticated");

      if (window.location.pathname === "/login") return Promise.reject(error);

      if (!alreadyRedirectedToLogin) {
        alreadyRedirectedToLogin = true;

        try {
          window.history.replaceState({}, "", "/login");
          window.location.href = "/login";
        } catch (e) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const apiService = {
  get: (endpoint: string, params?: any) => api.get(endpoint, { params }),
  post: (endpoint: string, data?: any) => api.post(endpoint, data),
  patch: (endpoint: string, data?: any) => api.patch(endpoint, data),
  delete: (endpoint: string) => api.delete(endpoint),
};

export const questionService = {
  getAll: (params?: any): Promise<any> => {
    const transformedParams = { ...params };

    if (params?.subject_ids && Array.isArray(params.subject_ids))
      transformedParams.subject_ids = params.subject_ids.join(",");
    if (params?.topic_ids && Array.isArray(params.topic_ids))
      transformedParams.topic_ids = params.topic_ids.join(",");
    if (params?.difficulty && Array.isArray(params.difficulty))
      transformedParams.difficulty = params.difficulty.join(",");
    if (params?.question_type && Array.isArray(params.question_type))
      transformedParams.question_type = params.question_type.join(",");

    return api
      .get("/admin/questions", { params: transformedParams })
      .then((res) => res.data);
  },
  getById: (id: number): Promise<any> =>
    api.get(`/admin/questions/${id}`).then((res) => res.data),
  create: (data: any): Promise<any> =>
    api.post("/admin/questions", data).then((res) => res.data),
  update: (id: number, data: any): Promise<any> =>
    api.patch(`/admin/questions/${id}`, data).then((res) => res.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/admin/questions/${id}`).then((res) => res.data),
  import: (formData: FormData) =>
    api
      .post("/admin/questions/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res.data),
  getStats: () => apiService.get("/admin/questions/stats/overview"),
  getCountQuestionsBySubject: (subjectId: string): Promise<any> =>
    api
      .get(`/admin/questions/count-by-subject/${subjectId}`)
      .then((res) => res.data),
  previewImport: (formData: FormData) =>
    api
      .post("/admin/questions/import/preview", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res.data),
};

// ────────────────────────────────────────────────────────────────────
// Question Drafts — review queue for AI-generated questions. Same /admin
// auth as the rest of the panel (token interceptor above). «Publish»
// promotes a draft into a live question via a dedicated backend action;
// the response carries `published_question_id` so the UI can link out to
// the created question. List tolerates either a bare array or a
// `{ items|drafts|data, total }` envelope.
// ────────────────────────────────────────────────────────────────────
export const questionDraftService = {
  getAll: (params?: QuestionDraftListParams): Promise<QuestionDraftListResult> =>
    api.get("/admin/question-drafts", { params }).then((res) => {
      const data = res.data;
      if (Array.isArray(data)) {
        return { drafts: data as QuestionDraft[], total: data.length };
      }
      const drafts: QuestionDraft[] =
        data?.items ?? data?.drafts ?? data?.data ?? [];
      const total: number =
        typeof data?.total === "number" ? data.total : drafts.length;
      return { drafts, total };
    }),

  getById: (id: number): Promise<QuestionDraft> =>
    api.get(`/admin/question-drafts/${id}`).then((res) => res.data),

  update: (id: number, data: QuestionDraftUpdate): Promise<QuestionDraft> =>
    api.patch(`/admin/question-drafts/${id}`, data).then((res) => res.data),

  publish: (id: number): Promise<QuestionDraft> =>
    api
      .post(`/admin/question-drafts/${id}/publish`)
      .then((res) => res.data),

  reject: (id: number): Promise<QuestionDraft> =>
    api
      .post(`/admin/question-drafts/${id}/reject`)
      .then((res) => res.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/admin/question-drafts/${id}`).then(() => undefined),
};

export const subjectService = {
  getAll: (params?: any): Promise<any> =>
    api.get("/admin/subjects", { params }).then((res) => res.data),
  getAllDetailed: (params?: any): Promise<any> =>
    api.get("/admin/subjects/with-stats", { params }).then((res) => res.data),
  getById: (id: number): Promise<any> =>
    api.get(`/admin/subjects/${id}`).then((res) => res.data),
  create: (data: {
    name: string;
    type: SubjectType;
    image?: string;
    description?: string;
  }): Promise<any> => api.post("/admin/subjects", data).then((res) => res.data),
  update: (
    id: number,
    data: {
      name?: string;
      type?: SubjectType;
      image?: string;
      description?: string;
    },
  ): Promise<any> =>
    api.patch(`/admin/subjects/${id}`, data).then((res) => res.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/admin/subjects/${id}`).then((res) => res.data),
  getTopics: (subjectId: number): Promise<any> =>
    api.get(`/admin/subjects/${subjectId}/topics`).then((res) => res.data),
  getTopicCount: (subjectId: string): Promise<any> =>
    api.get(`/admin/subjects/${subjectId}/topic-count`).then((res) => res.data),
  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post(`/admin/subjects/${id}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data);
  },
  deleteImage: (id: number) =>
    api.delete(`/admin/subjects/${id}/image`).then((res) => res.data),
};

export const topicService = {
  getAll: (params?: any): Promise<any> =>
    api.get("/admin/topics", { params }).then((res) => res.data),
  getAllDetailed: (params?: any): Promise<any> =>
    api.get("/admin/topics/with-stats", { params }).then((res) => res.data),
  getById: (id: number): Promise<any> =>
    api.get(`/admin/topics/${id}`).then((res) => res.data),
  create: (data: any): Promise<any> =>
    api.post("/admin/topics", data).then((res) => res.data),
  update: (id: number, data: any): Promise<any> =>
    api.patch(`/admin/topics/${id}`, data).then((res) => res.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/admin/topics/${id}`).then((res) => res.data),
};

export const trainerService = {
  getAll: (params?: any): Promise<any> =>
    api.get("/admin/trainers", { params }).then((res) => res.data),
  getById: (id: number): Promise<any> =>
    api.get(`/admin/trainers/${id}`).then((res) => res.data),
  create: (data: any): Promise<any> =>
    api.post("/admin/trainers", data).then((res) => res.data),
  update: (id: number, data: any): Promise<any> =>
    api.patch(`/admin/trainers/${id}`, data).then((res) => res.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/admin/trainers/${id}`).then((res) => res.data),
  getQuestions: (trainingId: number, params?: any): Promise<any> =>
    api
      .get(`/admin/trainers/${trainingId}`, { params })
      .then((res) => res.data),
  addQuestion: (trainingId: number, questionId: number): Promise<any> =>
    api
      .post(`/admin/trainers/${trainingId}/questions`, {
        question_id: questionId,
      })
      .then((res) => res.data),
  removeQuestion: (trainingId: number, questionId: number): Promise<void> =>
    api
      .delete(`/admin/trainers/${trainingId}/questions/${questionId}`)
      .then((res) => res.data),
};

export const entService = {
  getAll: (params?: any): Promise<any> =>
    api.get("/admin/ents?length=50000", { params }).then((res) => res.data),
  getById: (id: number): Promise<any> =>
    api.get(`/admin/ents/${id}`).then((res) => res.data),
  getQuestions: (entOptionId: number, params?: any): Promise<any> =>
    api.get(`/admin/ents/${entOptionId}`, { params }).then((res) => res.data),
  create: (data: { option_number: number; subject_id: number }): Promise<any> =>
    api.post("/admin/ents/create", data).then((res) => res.data),
  update: (id: number, data: { subject_id: number }): Promise<any> =>
    api.patch(`/admin/ents/${id}`, data).then((res) => res.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/admin/ents/${id}`).then((res) => res.data),
  addQuestionsToEntOption: (
    entOptionId: number,
    questionIds: number[],
  ): Promise<any> =>
    api
      .post(`/admin/ents/${entOptionId}/questions/add`, {
        question_ids: questionIds,
      })
      .then((res) => res.data),

  removeQuestionsFromEntOption: (
    entOptionId: number,
    questionIds: number[],
  ): Promise<any> =>
    api
      .post(`/admin/ents/${entOptionId}/questions/remove`, {
        question_ids: questionIds,
      })
      .then((res) => res.data),

  getEntQuestionsCount: (entOptionId: number): Promise<any> =>
    api
      .get(`/admin/ents/${entOptionId}/questions/count`)
      .then((res) => res.data),

  checkQuestionInEntOption: (
    entOptionId: number,
    questionId: number,
  ): Promise<any> =>
    api
      .get(`/admin/ents/${entOptionId}/questions/check/${questionId}`)
      .then((res) => res.data),
  getMaxOptionNumber: (): Promise<{ max_option_number: number }> =>
    api.get("/admin/ents/max_option_number").then((res) => res.data),
};

export const adminService = {
  getSubjects: (): Promise<Subject[]> =>
    apiService.get("/admin/subjects").then((res) => res.data),

  getDashboard: (): Promise<any> =>
    apiService.get("/admin/dashboard").then((res) => res.data),

  getTrainers: (): Promise<any> =>
    apiService.get("/admin/trainers").then((res) => res.data),

  getEntOptions: (): Promise<any> =>
    apiService.get("/admin/ents?length=50000").then((res) => res.data),

  getEntDetails: (id: number): Promise<any> =>
    apiService.get(`/admin/ents/${id}`).then((res) => res.data),
};

export const filterService = {
  getFilterDisplayText: (
    filters: any,
    subjects: Subject[],
    allTopics: Topic[],
    difficultyOptions: any[],
    typeOptions: any[],
  ) => {
    const parts: string[] = [];

    if (filters.search) parts.push(`поиск: "${filters.search}"`);

    if (filters.difficulty?.length > 0) {
      const difficultyText = filters.difficulty
        .map((diff: string) => {
          const option = difficultyOptions.find((opt) => opt.value === diff);
          return option ? option.label : diff;
        })
        .join(", ");
      parts.push(`сложность: ${difficultyText}`);
    }

    if (filters.type?.length > 0) {
      const typeText = filters.type
        .map((type: string) => {
          const option = typeOptions.find((opt) => opt.value === type);
          return option ? option.label : type;
        })
        .join(", ");
      parts.push(`тип: ${typeText}`);
    }

    if (filters.subject_ids?.length > 0) {
      const subjectNames = filters.subject_ids
        .map((id: string) => {
          const subject = subjects.find((s) => s.id.toString() === id);
          return subject ? subject.name : id;
        })
        .join(", ");
      parts.push(`предметы: ${subjectNames}`);
    }

    if (filters.topic_ids?.length > 0) {
      const topicNames = filters.topic_ids
        .map((id: string) => {
          const topic = allTopics.find((t) => t.id.toString() === id);
          return topic ? topic.name : id;
        })
        .join(", ");
      parts.push(`темы: ${topicNames}`);
    }

    return parts.length > 0 ? parts.join(", ") : "все вопросы";
  },
};

export const subjectCombinationService = {
  getAll: (params?: any): Promise<any> =>
    api.get("/admin/subject-combinations", { params }).then((res) => res.data),

  getById: (id: number): Promise<any> =>
    api.get(`/admin/subject-combinations/${id}`).then((res) => res.data),

  create: (data: any): Promise<any> =>
    api.post("/admin/subject-combinations", data).then((res) => res.data),

  update: (id: number, data: any): Promise<any> =>
    api
      .patch(`/admin/subject-combinations/${id}`, data)
      .then((res) => res.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/admin/subject-combinations/${id}`).then((res) => res.data),
};

export const promocodeService = {
  getAll: (): Promise<any> =>
    api.get("/admin/promocodes").then((res) => res.data),

  create: (data: any): Promise<any> =>
    api.post("/admin/promocodes", data).then((res) => res.data),

  getHistory: (promocodeId: number): Promise<any> =>
    api.get(`/admin/promocodes/${promocodeId}/history`).then((res) => res.data),
};

// Content management — for now a single resource (subscription benefits),
// but kept under its own service so future content types (FAQ, banners,
// onboarding screens) can land alongside without ballooning api.ts.
export const subscriptionBenefitService = {
  getAll: (): Promise<any[]> =>
    api.get("/admin/content/subscription-benefits").then((res) => res.data),

  getById: (id: number): Promise<any> =>
    api
      .get(`/admin/content/subscription-benefits/${id}`)
      .then((res) => res.data),

  create: (data: any): Promise<any> =>
    api
      .post("/admin/content/subscription-benefits", data)
      .then((res) => res.data),

  update: (id: number, data: any): Promise<any> =>
    api
      .patch(`/admin/content/subscription-benefits/${id}`, data)
      .then((res) => res.data),

  delete: (id: number): Promise<void> =>
    api
      .delete(`/admin/content/subscription-benefits/${id}`)
      .then(() => undefined),
};

// ────────────────────────────────────────────────────────────────────
// App Settings — runtime-config knobs editable from admin without redeploy.
// Backend reads go through a 60s Redis cache so saves propagate across
// replicas within at most a minute. There is no create/delete: settings
// are seeded by migrations and only `value` is mutable.
// ────────────────────────────────────────────────────────────────────
export const appSettingsService = {
  getAll: (): Promise<any[]> =>
    api.get("/admin/app-settings").then((res) => res.data),

  getByKey: (key: string): Promise<any> =>
    api.get(`/admin/app-settings/${key}`).then((res) => res.data),

  updateValue: (key: string, value: string): Promise<any> =>
    api
      .put(`/admin/app-settings/${key}`, { value })
      .then((res) => res.data),
};

export const streakRewardTiersService = {
  list: (): Promise<any[]> =>
    api.get("/admin/streak-reward-tiers").then((r) => r.data),
  create: (payload: {
    min_streak: number;
    coins: number;
    is_active: boolean;
  }): Promise<any> =>
    api.post("/admin/streak-reward-tiers", payload).then((r) => r.data),
  update: (
    min_streak: number,
    payload: Partial<{ coins: number; is_active: boolean }>,
  ): Promise<any> =>
    api
      .patch(`/admin/streak-reward-tiers/${min_streak}`, payload)
      .then((r) => r.data),
  delete: (min_streak: number): Promise<void> =>
    api.delete(`/admin/streak-reward-tiers/${min_streak}`).then(() => undefined),
};

export const leaderboardPrizesService = {
  list: (): Promise<any[]> =>
    api.get("/admin/leaderboard-prizes").then((r) => r.data),
  iconKeys: (): Promise<{ icon_keys: string[] }> =>
    api.get("/admin/leaderboard-prizes/icon-keys").then((r) => r.data),
  create: (payload: {
    rank: number;
    icon_key: string;
    title: string;
    description: string;
    is_active: boolean;
  }): Promise<any> =>
    api.post("/admin/leaderboard-prizes", payload).then((r) => r.data),
  update: (id: number, payload: Partial<{
    rank: number;
    icon_key: string;
    title: string;
    description: string;
    is_active: boolean;
  }>): Promise<any> =>
    api.patch(`/admin/leaderboard-prizes/${id}`, payload).then((r) => r.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/admin/leaderboard-prizes/${id}`).then(() => undefined),
};

export interface StreakPushTemplate {
  enabled: boolean;
  title: string;
  body: string;
  hours_before_reset: number;
  timezone: string;
  updated_at: string;
}

export interface StreakPushTriggerResult {
  requested: number;
  delivered: number;
  failed: number;
  skipped_disabled: boolean;
}

export const streakPushTemplateService = {
  get: (): Promise<StreakPushTemplate> =>
    api.get("/admin/streak-push-template").then((r) => r.data),
  update: (
    payload: Partial<{
      enabled: boolean;
      title: string;
      body: string;
      hours_before_reset: number;
      timezone: string;
    }>,
  ): Promise<StreakPushTemplate> =>
    api.put("/admin/streak-push-template", payload).then((r) => r.data),
  trigger: (payload: {
    target_user_id?: string;
    fake_streak?: number;
  }): Promise<StreakPushTriggerResult> =>
    api
      .post("/admin/streak-push-template/trigger", payload)
      .then((r) => r.data),
};

export const moduleService = {
  getAll: async (params?: any): Promise<SubjectModule[]> => {
    const response = await api.get("/admin/modules", { params });
    return response.data;
  },

  getById: async (id: number): Promise<SubjectModule> => {
    const response = await api.get(`/admin/modules/${id}`);
    return response.data;
  },

  getModuleLessons: async (moduleId: number): Promise<ModuleLesson[]> => {
    const response = await api.get(`/admin/modules/${moduleId}/lessons`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/modules/${id}`);
  },

  create: async (data: any): Promise<SubjectModule> => {
    const response = await api.post("/admin/modules", data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<SubjectModule> => {
    const response = await api.patch(`/admin/modules/${id}`, data);
    return response.data;
  },

  getBySubject: async (
    subjectId: number,
    params?: any,
  ): Promise<SubjectModule[]> => {
    const response = await api.get(`/admin/modules/subject/${subjectId}`, {
      params,
    });
    return response.data;
  },

  updateLessonOrder: async (
    moduleId: number,
    lessonOrders: Array<{ id: number; order_index: number }>,
  ): Promise<void> => {
    await api.patch(`/admin/modules/${moduleId}/lessons/order`, {
      lesson_orders: lessonOrders,
    });
  },

  updateModuleOrder: async (
    subjectId: number,
    moduleOrders: Array<{ id: number; order_index: number }>,
  ): Promise<void> => {
    await api.patch(`/admin/modules/subject/${subjectId}/order`, {
      module_orders: moduleOrders,
    });
  },

  updateLessonMedia: async (
    lessonId: number,
    mediaData: { video_url?: string; presentation_url?: string },
  ): Promise<ModuleLesson> => {
    const response = await api.patch(
      `/admin/modules/lessons/${lessonId}/media`,
      mediaData,
    );
    return response.data;
  },

  createModuleTest: async (moduleId: number, testData: any): Promise<any> => {
    const response = await api.post(
      `/admin/modules/${moduleId}/test`,
      testData,
    );
    return response.data;
  },

  getModuleTest: async (moduleId: number): Promise<any> => {
    const response = await api.get(`/admin/modules/${moduleId}/test`);
    return response.data;
  },

  updateModuleTest: async (moduleId: number, testData: any): Promise<any> => {
    const response = await api.patch(
      `/admin/modules/${moduleId}/test`,
      testData,
    );
    return response.data;
  },

  deleteModuleTest: async (moduleId: number): Promise<void> => {
    await api.delete(`/admin/modules/${moduleId}/test`);
  },

  addQuestionsToModuleTest: async (
    moduleId: number,
    questionIds: number[],
  ): Promise<void> => {
    await api.post(`/admin/modules/${moduleId}/test/questions`, {
      question_ids: questionIds,
    });
  },

  removeQuestionFromModuleTest: async (
    moduleId: number,
    questionId: number,
  ): Promise<void> => {
    await api.delete(`/admin/modules/${moduleId}/test/questions/${questionId}`);
  },
};

export const lessonService = {
  getById: async (id: number): Promise<ModuleLesson> => {
    const response = await api.get(`/admin/modules/lessons/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/modules/lessons/${id}`);
  },

  create: async (data: any): Promise<ModuleLesson> => {
    const response = await api.post("/admin/modules/lessons", data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<ModuleLesson> => {
    const response = await api.patch(`/admin/modules/lessons/${id}`, data);
    return response.data;
  },

  updateMedia: async (
    lessonId: number,
    mediaData: { video_url?: string; presentation_url?: string },
  ): Promise<ModuleLesson> => {
    const response = await api.patch(
      `/admin/modules/lessons/${lessonId}/media`,
      mediaData,
    );
    return response.data;
  },

  publish: async (lessonId: number, data: any): Promise<ModuleLesson> => {
    const response = await api.post(
      `/admin/modules/lessons/${lessonId}/publish`,
      {
        is_published: data.is_published,
        published_at: data.published_at,
      },
    );
    return response.data;
  },

  getLessonWithTestInfo: async (lessonId: number): Promise<any> => {
    const response = await api.get(
      `/admin/modules/lessons/${lessonId}/with-test-info`,
    );
    return response.data;
  },

  getWithTestInfo: async (lessonId: number): Promise<any> => {
    const response = await api.get(
      `/admin/modules/lessons/${lessonId}/with-test-info`,
    );
    return response.data;
  },
};

export const userService = {
  getAll: (params?: { role?: string; search?: string }): Promise<any> =>
    api.get("/admin/users", { params }).then((res) => res.data),

  getById: (id: string): Promise<any> =>
    api.get(`/admin/users/${id}`).then((res) => res.data),

  create: (data: any): Promise<any> =>
    api.post("/admin/users", data).then((res) => res.data),

  update: (id: string, data: any): Promise<any> =>
    api.patch(`/admin/users/${id}`, data).then((res) => res.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/admin/users/${id}`).then((res) => res.data),

  // Forcibly grant PRO for `days` days. Backend writes plan=PRO +
  // subscription_end = now+days into Keycloak attrs. Used when an
  // IAP receipt fails to propagate or for reviewer/demo accounts.
  grantPro: (id: string, days: number = 30): Promise<any> =>
    api
      .post(`/admin/users/${id}/grant-pro-subscription`, { days })
      .then((res) => res.data),

  // Forcibly reset back to FREE (clears plan + subscription_end +
  // subscription_cancelled). Companion to grantPro. Existing endpoint,
  // exposed in the UI alongside the grant action.
  resetSubscription: (id: string): Promise<any> =>
    api
      .post(`/admin/users/${id}/reset-subscription`)
      .then((res) => res.data),
};

// Marketing dashboard data sources. Wraps the existing
// `/admin/analytics/*` endpoints — no new backend work needed.
// Each method returns `any` because the FastAPI side ships untyped
// response_models for these routes; the dashboard normalises shape
// on the React side, which lets us iterate on what's displayed
// without round-tripping a backend deploy.
export const analyticsService = {
  activity: (): Promise<any> =>
    api.get("/admin/analytics/activity").then((res) => res.data),

  retention: (): Promise<any> =>
    api.get("/admin/analytics/retention").then((res) => res.data),

  efficienty: (): Promise<any> =>
    api.get("/admin/analytics/efficienty").then((res) => res.data),

  paymentsInfo: (params?: {
    date_from?: string;
    date_to?: string;
    status?: string;
    period?: string;
  }): Promise<any> =>
    api.get("/admin/analytics/payments/info", { params }).then((res) => res.data),

  paymentsByYear: (): Promise<any> =>
    api.get("/admin/analytics/payments/by_year").then((res) => res.data),

  topClients: (showAll = false): Promise<any> =>
    api
      .get("/admin/analytics/top_clients", { params: { show_all: showAll } })
      .then((res) => res.data),

  // Revenue split by gateway (Google Play vs FreedomPay), paid only.
  paymentsByGateway: (hours = 720): Promise<any> =>
    api
      .get("/admin/analytics/payments/by-gateway", { params: { hours } })
      .then((res) => res.data),
};

// Push notifications — broadcast a message to a slice of the user
// base. Backend lives at POST /admin/notifications/send (see
// aima-backend@5216971). The legacy /admin/notifications/test/send
// is intentionally NOT used here — that endpoint is marked "remove
// in production" in the backend code.
export type PushTarget = "all" | "pro" | "ios";

export interface PushSendResult {
  target: string;
  matched_tokens: number;
  requested: number;
  delivered: number;
  failed: number;
  removed_tokens: number;
}

export const pushService = {
  send: (
    title: string,
    body: string,
    target: PushTarget = "all"
  ): Promise<PushSendResult> =>
    api
      .post("/admin/notifications/send", { title, body, target })
      .then((res) => res.data),
};

export default api;
