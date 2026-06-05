import {
  Question,
  FilterOption,
  FilterOptionGroup,
  Pagination,
  QuestionFilters,
  TextBlock,
  Difficulty,
  QuestionType,
  ImportResult,
} from "./index";

export interface QuestionModalProps {
  question?: Question | null;
  onSubmit: (data: QuestionFormData) => Promise<void>;
  onClose: () => void;
  defaultType?: QuestionType;
}

export interface ImportModalProps {
  onImport: (file: File, importType: string) => Promise<ImportResult>;
  onClose: () => void;
  loading?: boolean;
}

export interface QuestionFormData {
  type?: QuestionType;
  question_type: QuestionType;
  topic_id: number | null;
  subject_id: number | null;
  ent_option_id?: number | null;
  difficulty: Difficulty;
  blocks: TextBlock[];
  variants: VariantFormData[];
  hint: HintFormData | null;
  task_description_ru?: string;
  task_description_kk?: string;
  question_translation_ru?: string;
  question_translation_kk?: string;
  explanation_ru?: string;
  explanation_kk?: string;
}

export interface VariantFormData {
  id?: number;
  blocks: TextBlock[];
  is_correct: boolean;
  weight: number;
}

export interface HintFormData {
  id?: number;
  blocks: TextBlock[];
}

export interface QuestionFiltersProps {
  filters: QuestionFilters;
  difficultyOptions: FilterOption[];
  typeOptions: FilterOption[];
  subjectOptions: FilterOption[];
  filteredTopicGroups: FilterOptionGroup[];
  onFilterChange: (filters: Partial<QuestionFilters>) => void;
  onSubjectFilterChange: (subjectIds: string[]) => void;
  onResetFilters: () => void;
  hideSubjectFilter?: boolean;
}

export interface ResultsInfoProps {
  questions: Question[];
  loading: boolean;
  filters: QuestionFilters;
  filterDisplayText: string;
  pagination: Pagination;
  onResetFilters: () => void;
  currentTypeDisplay?: string;
}

export interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  loading: boolean;
  questions: Question[];
  currentTypeDisplay?: string;
}

export interface QuestionActionsProps {
  onCreate: () => void;
  onImport: () => void;
  onRefresh: () => void;
  onBulkDelete: () => void;
  selectedCount?: number;
  loading?: boolean;
}

export type QuestionTypeDisplay = "all" | "training" | "ent" | "unassigned";

export interface QuestionsResponse {
  questions: Question[];
  pagination: Pagination;
  filters?: QuestionFilters;
}

export interface QuestionStats {
  total: number;
  by_difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  by_type: {
    single_choice: number;
    multiple_choice: number;
    ent: number;
  };
  by_usage: {
    training: number;
    ent: number;
    unassigned: number;
  };
}

export interface QuestionBlock {
  order: number;
  type: "text" | "media" | "video";
  value: string;
}
