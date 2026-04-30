import { 
  Question, Subject, Topic, EntOption, Trainer, 
  QuestionFormData, SubjectFormData, ImportResult,
  Pagination, QuestionFilters 
} from './index';

// Базовые типы для API responses
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Конкретные API responses
// export interface QuestionsResponse extends PaginatedResponse<Question> {
//   filters?: QuestionFilters;
//   stats?: any; // QuestionStats
// }

export interface SubjectsResponse extends PaginatedResponse<Subject> {
  stats?: any; // SubjectStats
}

export interface TopicsResponse extends PaginatedResponse<Topic> {
  subject_id?: number;
}

export interface EntOptionsResponse extends PaginatedResponse<EntOption> {
  subject_id?: number;
}

// Типы для запросов
export interface CreateQuestionRequest {
  question: QuestionFormData;
}

export interface UpdateQuestionRequest {
  id: number;
  question: Partial<QuestionFormData>;
}

export interface CreateSubjectRequest {
  subject: SubjectFormData;
}

export interface UpdateSubjectRequest {
  id: number;
  subject: Partial<SubjectFormData>;
}

export interface ImportQuestionsRequest {
  file: File;
  import_type: string; // 'training' | 'ent'
}

// Типы для фильтрации
export interface QuestionsQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  difficulty?: string[];
  type?: string[];
  subject_ids?: string[];
  topic_ids?: string[];
  usage_type?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SubjectsQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}