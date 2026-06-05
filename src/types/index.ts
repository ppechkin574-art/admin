import {
  Difficulty,
  QuestionType,
  BlockType,
  Status,
  SubjectType,
  BaseEntity,
} from "./enums";

export interface TextBlock {
  id?: number;
  type: BlockType;
  order: number;
  value: string;
  text_block_link_id?: number;
}

export interface TextBlockLink {
  id: number;
  question_id?: number;
  hint_id?: number;
  variant_id?: number;
  blocks: TextBlock[];
}

export interface Hint extends BaseEntity {
  blocks: TextBlock[];
  link?: TextBlockLink;
}

export interface Variant extends BaseEntity {
  question_id: number;
  weight: number;
  is_correct: boolean;
  blocks: TextBlock[];
  link?: TextBlockLink;
}

export interface Question extends BaseEntity {
  topic_id?: number | null;
  subject_id: number;
  hint_id?: number | null;
  difficulty: Difficulty;
  question_type: QuestionType;

  topic?: Topic;
  subject?: Subject;
  hint?: Hint | null;
  variants: Variant[];
  link?: TextBlockLink;

  blocks?: TextBlock[];
  ent_option_id?: number | null;

  task_description_ru?: string;
  task_description_kk?: string;
  question_translation_ru?: string;
  question_translation_kk?: string;

  type?: QuestionType;
  created_at?: string;
  updated_at?: string;
}

export interface Subject extends BaseEntity {
  name: string;
  type: SubjectType;
  image?: string;

  topics?: Topic[];
  questions?: Question[];
  ent_options?: EntOption[];

  question_count?: number;
  topic_count?: number;
}

export interface Topic extends BaseEntity {
  subject_id: number;
  name: string;
  difficulty?: Difficulty;

  subject?: Subject;
  questions?: Question[];
  trainers?: Trainer[];

  question_count?: number;
  trainer_count?: number;
}

export interface EntOption extends BaseEntity {
  option_number: number;
  subject_id: number;
  name?: string;

  subject?: Subject;
  questions?: Question[];
  attempts?: EntAttempt[];

  question_count?: number;
}

export interface EntOptionQuestion extends BaseEntity {
  ent_option_id: number;
  question_id: number;

  question?: Question;
  ent_option?: EntOption;
}

export interface EntAttempt extends BaseEntity {
  ent_option_id?: number;
  student_guid: string;
  status: Status;
  score: number;
  started_at: string;
  deadline_at?: string;
  completed_at?: string;

  options?: EntOption;
  answers?: EntAttemptAnswer[];
}

export interface EntAttemptAnswer extends BaseEntity {
  ent_attempt_id: number;
  variant_id?: number;

  variant?: Variant;
  ent_attempt?: EntAttempt;
}

export interface Trainer extends BaseEntity {
  name: string;
  topic_id: number;

  topic?: Topic;
  trainer_questions?: TrainerQuestion[];
  attempts?: TrainerAttempt[];

  question_count?: number;
}

export interface TrainerQuestion extends BaseEntity {
  trainer_id: number;
  question_id: number;

  question?: Question;
  trainers?: Trainer;
}

export interface TrainerAttempt extends BaseEntity {
  trainer_id: number;
  student_guid: string;
  status: Status;
  score: number;
  started_at: string;
  completed_at?: string;

  trainer?: Trainer;
  questions?: TrainerAttemptQuestion[];
}

export interface TrainerAttemptQuestion extends BaseEntity {
  trainer_attempt_id: number;
  question_id?: number;
  spend_time: number;

  trainer_attempt?: TrainerAttempt;
  question?: Question;
  answers?: TrainerAttemptAnswer[];
}

export interface TrainerAttemptAnswer extends BaseEntity {
  trainer_attempt_question_id: number;
  variant_id: number;
  student_guid?: string;
  created_at: string;
  updated_at: string;

  attempt_question?: TrainerAttemptQuestion;
  variant?: Variant;
}

export interface EntSubjectCombination {
  id: number;
  specialized_subject_1_id: number;
  specialized_subject_2_id: number;
  name: string;
  description?: string;

  specialized_subject_1?: Subject;
  specialized_subject_2?: Subject;
}

export interface ImportResult {
  detected_questions: number;
  imported_questions_count: number;
  duplicate_questions_count: number;
  success: boolean;
  errors_count: number;
  errors?: string[];
  message: string;
  trainers_updated?: number;
  ent_options_created?: number;
  duplicate_ent_options?: number;
  skipped_questions_in_ent?: number;
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  totalItems?: number;
  filteredRecords?: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  filteredRecords?: number;
}

export interface QuestionFilters {
  search: string;
  difficulty: string[];
  type: string[];
  subject_ids: string[];
  topic_ids: string[];
  usage_type?: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptionGroup {
  label: string;
  options: FilterOption[];
}

export interface NotificationConfig {
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
}

export interface ConfirmationConfig {
  title: string;
  message: string;
  type?: "warning" | "danger" | "info";
  confirmText?: string;
  cancelText?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export * from "./questions";
export * from "./subjects";
export * from "./api";
export * from "./enums";
export * from "./promocodes";

export interface TableColumn {
  key: string;
  title: string;
  width?: string;
  style?: React.CSSProperties;
  render?: (value: any, item: any) => React.ReactNode;
}

export interface TableActionConfig {
  handler: (item: any) => void;
  className?: string;
  icon?: string;
}

export interface TableActions {
  [key: string]: TableActionConfig;
}

export interface ENT {
  id: number;
  guid: string;
  option_number: number;
  subject_id: number;
  subject?: Subject;
  questions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ResultsInfoProps {
  loading?: boolean;
  itemsCount?: number;
  totalItems?: number;
  filterText?: string;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  entityName?: string;
  className?: string;
  showEntityName?: boolean;
}

export interface UniversalTableProps {
  data: any[];
  columns: TableColumn[];
  actions?: TableActions;
  loading?: boolean;
  emptyMessage?: React.ReactNode;
  onRowClick?: (item: any) => void;
  selectedRows?: number[];
  onSelectRow?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  selectable?: boolean;
  rowClassName?: string | ((item: any, index: number) => string);
  cellClassName?: string;
  headerClassName?: string;
  showPageSizeSelector?: boolean;
  showControls?: boolean;
  resultsInfoProps?: ResultsInfoProps;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}
