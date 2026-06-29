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

// ── Leaderboard hide-list ────────────────────────────────────────────────
// Admin can hide selected users from the in-app leaderboard. The backend
// excludes hidden users from the ranking entirely (everyone below shifts
// up — gap-free positions), which also removes them from the top-3 podium
// prizes (display-by-rank only). The mobile app needs no change.
export const leaderboardHiddenService = {
  // Current hidden set — list of Keycloak user_ids the admin has hidden.
  get: (): Promise<{ user_ids: string[] }> =>
    api.get("/admin/leaderboard/hidden").then((r) => r.data),
  // Bulk hide (hidden=true) or show (hidden=false). Idempotent. Returns
  // the updated full hidden set so the caller can refresh its marked rows.
  set: (
    userIds: string[],
    hidden: boolean,
  ): Promise<{ user_ids: string[] }> =>
    api
      .post("/admin/leaderboard/hidden", { user_ids: userIds, hidden })
      .then((r) => r.data),
};

// Named convenience wrappers (per the requested signatures).
export const getLeaderboardHidden = (): Promise<{ user_ids: string[] }> =>
  leaderboardHiddenService.get();
export const setLeaderboardHidden = (
  userIds: string[],
  hidden: boolean,
): Promise<{ user_ids: string[] }> =>
  leaderboardHiddenService.set(userIds, hidden);

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

// ────────────────────────────────────────────────────────────────────
// Daily notification template — singleton settings for the daily push
// scheduler. Admin edits title/body/hour/minute/timezone; scheduler
// re-reads on every tick so changes propagate without a redeploy.
// ────────────────────────────────────────────────────────────────────
export interface DailyNotificationTemplate {
  enabled: boolean;
  title: string;
  body: string;
  hour: number;
  minute: number;
  timezone: string;
  updated_at: string;
}

export interface DailyNotificationTriggerResult {
  requested: number;
  delivered: number;
  failed: number;
  skipped_disabled: boolean;
}

export const dailyNotificationService = {
  get: (): Promise<DailyNotificationTemplate> =>
    api.get("/admin/daily-notification-template").then((r) => r.data),
  update: (
    payload: Partial<{
      enabled: boolean;
      title: string;
      body: string;
      hour: number;
      minute: number;
      timezone: string;
    }>,
  ): Promise<DailyNotificationTemplate> =>
    api.put("/admin/daily-notification-template", payload).then((r) => r.data),
  trigger: (): Promise<DailyNotificationTriggerResult> =>
    api.post("/admin/daily-notification-template/trigger").then((r) => r.data),
  firebaseStatus: (): Promise<{ enabled: boolean }> =>
    api.get("/admin/daily-notification-template/firebase-status").then((r) => r.data),
};

// ────────────────────────────────────────────────────────────────────
// App update config — per-platform minimum build number + store URLs that
// drive the mobile force-update gate. If a user's installed build is below
// the platform minimum the app shows a blocking "update required" screen.
// A minimum of 0 disables the gate for that platform. Singleton config:
// no create/delete, only GET (read current) and PUT (partial update).
// ────────────────────────────────────────────────────────────────────
export interface AppUpdateConfig {
  ios_min_build: number;
  android_min_build: number;
  ios_store_url: string;
  android_store_url: string;
  // Highest build actually live in each store (operator-maintained guard).
  // Saving min_build above it is rejected by the backend (422).
  ios_last_known_build: number;
  android_last_known_build: number;
  // Soft-update tier: dismissible prompt shown when
  // min_build <= running build < recommended_build. 0 = no soft prompt.
  ios_recommended_build: number;
  android_recommended_build: number;
}

// One change-history entry for the force-update config (audit trail).
export interface AppUpdateConfigAudit {
  id: number;
  changed_at: string | null;
  changed_by: string | null;
  before_values: Partial<AppUpdateConfig>;
  after_values: Partial<AppUpdateConfig>;
}

export const appUpdateConfigService = {
  get: (): Promise<AppUpdateConfig> =>
    api.get("/admin/app-update-config").then((r) => r.data),
  update: (
    payload: Partial<AppUpdateConfig>,
  ): Promise<AppUpdateConfig> =>
    api.put("/admin/app-update-config", payload).then((r) => r.data),
  history: (limit = 50): Promise<AppUpdateConfigAudit[]> =>
    api
      .get("/admin/app-update-config/history", { params: { limit } })
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

  // Marketing-safe audience aggregate (counts only, no PII): total +
  // by_role / by_plan / by_grade over ALL Keycloak users. Server-side
  // computed + Redis-cached, so this replaces the old client-side
  // aggregation over the paginated /admin/users page. Reachable by the
  // `marketing` role (router is allow_admin_or_marketing).
  getAudience: (): Promise<any> =>
    api.get("/admin/analytics/audience").then((res) => res.data),

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

  // Trigger background check of all pending FreedomPay payments (returns immediately).
  pollPendingPayments: (): Promise<{
    started: boolean
    pending_count: number
    message: string
  }> =>
    api.post("/admin/payments/poll-pending").then((res) => res.data),

  // iOS IAP events for the Finance page: attempts / success / failed summary +
  // paginated event list with user name+phone resolved. Source on the backend
  // is `subscription_event_log` (purchase, renew, expire, refund, revoke,
  // verify_rejected, shared_account flags).
  iapEvents: (
    params: {
      platform?: string
      status?: string
      days?: number
      limit?: number
      offset?: number
    } = {}
  ): Promise<{
    summary: { total: number; success: number; failed: number; flagged: number }
    total: number
    limit: number
    offset: number
    items: Array<{
      id: number
      created_at: string | null
      event_type: string
      status: string
      user_id: string | null
      user_name: string | null
      user_phone: string | null
      product_id: string | null
      transaction_id: string | null
      amount: number | null
      environment: string | null
      detail: string | null
    }>
  }> =>
    api.get("/admin/payments/iap-events", { params }).then((res) => res.data),
};

// Kazakh question-translation workflow. The translator is a Claude session:
// export → hand the file to Claude → import the translated file back.
export interface CoverageRow {
  subject_id: number
  subject_name: string
  none: number
  queued: number
  draft: number
  done: number
  total: number
}
export interface GlossaryRow {
  id: number
  subject_id: number | null
  term_ru: string
  term_kk: string
  note: string | null
}
export interface PreviewPair {
  ru: string
  kk: string
}
export type QualityFlagType = 'agreement' | 'government' | 'morphological' | 'syntactic' | 'semantic' | 'untranslatable'
export interface QualityFlag {
  field: string  // "question_text" | "variant_<id>" | "hint" | "task_description" | "explanation"
  phrase: string
  type: QualityFlagType
  note: string
}
export interface PreviewItem {
  id: number
  quality_flags?: QualityFlag[]
  question: PreviewPair
  variants: { id: number; ru: string; kk: string; is_correct: boolean }[]
  hint: PreviewPair
  task_description: PreviewPair
  explanation: PreviewPair
}
export interface ReviewResult {
  items: PreviewItem[]
  total: number
  page: number
  pages: number
  page_size: number
}
export interface PreviewResult {
  items: PreviewItem[]
  total: number
  shown: number
  sample: number
}
export const translationService = {
  coverage: (): Promise<{ items: CoverageRow[] }> =>
    api.get("/admin/translation/coverage").then((r) => r.data),
  // Operator «Перевести» — queue this subject's untranslated questions for the
  // background translation worker.
  queue: (subjectId: number): Promise<{ queued: number }> =>
    api
      .post("/admin/translation/queue", null, { params: { subject_id: subjectId } })
      .then((r) => r.data),
  export: (subjectId: number, status = "none", limit = 200): Promise<any> =>
    api
      .get("/admin/translation/export", {
        params: { subject_id: subjectId, status, limit },
      })
      .then((r) => r.data),
  import: (payload: unknown): Promise<{ applied: number; skipped: number[] }> =>
    api.post("/admin/translation/import", payload).then((r) => r.data),
  // «Перевести заново» — re-queue one question so the worker redoes its kk.
  requeue: (questionId: number): Promise<{ ok: boolean }> =>
    api
      .post("/admin/translation/requeue", null, { params: { question_id: questionId } })
      .then((r) => r.data),
  requeueBulk: (questionIds: number[]): Promise<{ queued: number }> =>
    api.post("/admin/translation/requeue-bulk", { question_ids: questionIds }).then((r) => r.data),
  requeueSubject: (subjectId: number): Promise<{ queued: number }> =>
    api.post("/admin/translation/requeue-subject", null, { params: { subject_id: subjectId } }).then((r) => r.data),
  // Background worker control: pause flag drives «Продолжить» / «Отменить».
  control: (): Promise<{ paused: boolean }> =>
    api.get("/admin/translation/control").then((r) => r.data),
  resume: (): Promise<{ paused: boolean }> =>
    api.post("/admin/translation/control/resume").then((r) => r.data),
  cancelTranslation: (): Promise<{ cleared: number; paused: boolean }> =>
    api.post("/admin/translation/control/cancel").then((r) => r.data),
  // RU↔KK pairs for in-admin spot-checking (sample = every Nth question).
  preview: (
    subjectId: number,
    opts: { status?: string; sample?: number; limit?: number } = {}
  ): Promise<PreviewResult> =>
    api
      .get("/admin/translation/preview", {
        params: {
          subject_id: subjectId,
          status: opts.status ?? "done",
          sample: opts.sample ?? 1,
          limit: opts.limit ?? 50,
        },
      })
      .then((r) => r.data),
  listGlossary: (subjectId?: number): Promise<GlossaryRow[]> =>
    api
      .get("/admin/translation/glossary", {
        params: subjectId != null ? { subject_id: subjectId } : {},
      })
      .then((r) => r.data),
  addGlossary: (body: {
    subject_id: number | null
    term_ru: string
    term_kk: string
    note?: string | null
  }): Promise<{ id: number }> =>
    api.post("/admin/translation/glossary", body).then((r) => r.data),
  deleteGlossary: (id: number): Promise<void> =>
    api.delete(`/admin/translation/glossary/${id}`).then(() => undefined),
  getConfig: (
    subjectId: number
  ): Promise<{ tone: string; length: string; instruction: string | null }> =>
    api.get(`/admin/translation/config/${subjectId}`).then((r) => r.data),
  setConfig: (
    subjectId: number,
    body: { tone: string; length: string; instruction?: string | null }
  ): Promise<unknown> =>
    api.put(`/admin/translation/config/${subjectId}`, body).then((r) => r.data),
  // Review endpoint: paginated draft list with quality flags.
  reviewDrafts: (
    subjectId: number,
    opts: { page?: number; page_size?: number; filter?: 'all' | 'flagged' | 'clean' } = {}
  ): Promise<ReviewResult> =>
    api
      .get('/admin/translation/review', {
        params: {
          subject_id: subjectId,
          page: opts.page ?? 1,
          page_size: opts.page_size ?? 20,
          filter: opts.filter ?? 'all',
        },
      })
      .then((r) => r.data),
  // Bulk approve: draft → done, clears quality flags.
  approve: (questionIds: number[]): Promise<{ approved: number }> =>
    api.post('/admin/translation/approve', { question_ids: questionIds }).then((r) => r.data),
  // Approve ALL drafts for a subject (respects active filter).
  approveAll: (subjectId: number, filter: 'all' | 'flagged' | 'clean' = 'all'): Promise<{ approved: number }> =>
    api.post('/admin/translation/approve-all', null, { params: { subject_id: subjectId, filter } }).then((r) => r.data),
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

export interface TestPushPhoneResult {
  phone: string;
  user_found: boolean;
  tokens_found: number;
  sent: number;
  failed: number;
}

export interface TestPushResult {
  phones: TestPushPhoneResult[];
  total_sent: number;
  total_failed: number;
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

  sendTest: (title: string, body: string): Promise<TestPushResult> =>
    api
      .post("/admin/notifications/send-test", { title, body })
      .then((res) => res.data),
};

export const securityService = {
  getOverview: (): Promise<any> =>
    api.get('/admin/security/overview').then(r => r.data),

  getEvents: (params?: {
    page?: number; limit?: number; status?: string; event_type?: string;
    min_risk?: number; user_id?: string; ip?: string; device_id?: string;
    from_date?: string; to_date?: string;
  }): Promise<any> =>
    api.get('/admin/security/events', { params }).then(r => r.data),

  getRiskyUsers: (params?: {
    page?: number; limit?: number; search?: string; status?: string; min_risk?: number;
  }): Promise<any> =>
    api.get('/admin/security/users', { params }).then(r => r.data),

  getUserRiskProfile: (userId: string): Promise<any> =>
    api.get(`/admin/security/users/${userId}`).then(r => r.data),

  getUserActivity: (userId: string, params?: { page?: number; limit?: number }): Promise<any> =>
    api.get(`/admin/security/users/${userId}/activity`, { params }).then(r => r.data),

  getUserPointsHistory: (userId: string, params?: { page?: number; limit?: number }): Promise<any> =>
    api.get(`/admin/security/users/${userId}/points-history`, { params }).then(r => r.data),

  markEventReviewed: (eventId: number, reviewedBy = 'admin'): Promise<any> =>
    api.post(`/admin/security/events/${eventId}/mark-reviewed`, { reviewed_by: reviewedBy }).then(r => r.data),

  restrictUser: (userId: string, data: { reason: string; until?: string }): Promise<any> =>
    api.post(`/admin/security/users/${userId}/restrict`, data).then(r => r.data),

  blockUser: (userId: string, data: { reason: string }): Promise<any> =>
    api.post(`/admin/security/users/${userId}/block`, data).then(r => r.data),

  unrestrictUser: (userId: string): Promise<any> =>
    api.post(`/admin/security/users/${userId}/unrestrict`).then(r => r.data),

  getBruteForceStatus: (userId: string): Promise<any> =>
    api.get(`/admin/security/users/${userId}/brute-force`).then(r => r.data),

  setWatchlist: (userId: string, watchlisted: boolean, adminUsername: string): Promise<any> =>
    api.post(`/admin/security/users/${userId}/watchlist?watchlisted=${watchlisted}`, { admin_username: adminUsername }).then(r => r.data),

  setPointsFrozen: (userId: string, frozen: boolean, adminUsername: string): Promise<any> =>
    api.post(`/admin/security/users/${userId}/freeze-points?frozen=${frozen}`, { admin_username: adminUsername }).then(r => r.data),

  setReferralDisabled: (userId: string, disabled: boolean, adminUsername: string): Promise<any> =>
    api.post(`/admin/security/users/${userId}/referral?disabled=${disabled}`, { admin_username: adminUsername }).then(r => r.data),

  resetRiskScore: (userId: string, adminUsername: string): Promise<any> =>
    api.post(`/admin/security/users/${userId}/reset-risk`, { admin_username: adminUsername }).then(r => r.data),

  markEventFalsePositive: (eventId: number, reviewedBy = 'admin'): Promise<any> =>
    api.post(`/admin/security/events/${eventId}/mark-false-positive`, { reviewed_by: reviewedBy }).then(r => r.data),
}

export default api;
