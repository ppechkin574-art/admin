import {
  Question,
  Subject,
  Topic,
  Pagination,
  QuestionFilters,
  EntOption,
  Trainer,
} from "./index";

export interface SubjectStats {
  totalQuestions: number;
  trainingQuestions: number;
  entQuestions: number;
  topicsCount: number;
  easyQuestions: number;
  mediumQuestions: number;
  hardQuestions: number;
  entOptionsCount: number;
  trainersCount: number;
}

export interface SubjectDetailProps {
  subjectId?: number;
}

export interface UseSubjectDetailReturn {
  subject: Subject | null;
  loading: boolean;
  error: string | null;
  questions: Question[];
  topics: Topic[];
  entOptions: EntOption[];
  trainers: Trainer[];
  stats: SubjectStats;
  filters: QuestionFilters;
  pagination: Pagination;
  questionsLoading: boolean;
  topicsLoading: boolean;
  entOptionsLoading: boolean;
  trainersLoading: boolean;
  loadSubjectData: () => Promise<void>;
  loadQuestions: () => Promise<void>;
  loadTopics: () => Promise<void>;
  loadEntOptions: () => Promise<void>;
  loadTrainers: () => Promise<void>;
  loadStats: () => Promise<void>;
  handleFilterChange: (newFilters: Partial<QuestionFilters>) => void;
  handleResetFilters: () => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
  handleDelete: () => Promise<void>;
}

export interface SubjectFormData {
  name: string;
  description?: string;
  type?: string;
  image?: string;
}

export interface SubjectFormProps {
  subject?: Subject | null;
  onSave: (data: SubjectFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export interface UseSubjectFormReturn {
  formData: SubjectFormData;
  loading: boolean;
  saving: boolean;
  errors: Record<string, string>;
  isEdit: boolean;
  isAdmin: boolean;
  handleChange: (field: keyof SubjectFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancel: () => void;
  validateForm: () => boolean;
}

export interface AdminDashboardStats {
  total_subjects: number;
  total_topics: number;
  total_trainers: number;
  total_ent_options: number;
  total_questions: number;
  total_questions_in_trainers: number;
  total_questions_in_ent: number;
}

export interface AdminSubjectStats extends Subject {
  topic_count: number;
  question_count: number;
  topics: Topic[];
}

export interface AdminTopicStats extends Topic {
  question_count: number;
  trainer_count: number;
  trainers: Trainer[];
}

export interface AdminTrainerStats extends Trainer {
  question_count: number;
}

export interface AdminEntOptionStats extends EntOption {
  question_count: number;
}

export interface AdminDashboardData {
  subjects: AdminSubjectStats[];
  topics: AdminTopicStats[];
  trainers: AdminTrainerStats[];
  ent_options: AdminEntOptionStats[];
  total_stats: AdminDashboardStats;
}
