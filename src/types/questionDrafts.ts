// Types for the AI-generated-questions review pipeline (Question Drafts).
// Mirrors the backend QuestionDraftReadDTO (feat/question-drafts). These
// drafts are a staging shape distinct from the live `Question` type: blocks
// and variants carry plain `value` strings (not the live TextBlock graph),
// so the reviewer can edit/publish without touching the live question schema.

export type QuestionDraftStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "published";

// AI pipeline emits "single_choice" | "multi_choice" | …; kept open as a
// string union with the known values so unexpected types still render.
export type DraftQuestionType =
  | "single_choice"
  | "multi_choice"
  | "multiple_choice"
  | string;

export interface DraftBlock {
  type: "text" | "media";
  order: number;
  value: string;
}

export interface DraftVariant {
  value?: string;
  blocks?: DraftBlock[];
  is_correct: boolean;
  weight?: number;
}

export interface DraftSource {
  book?: string;
  chapter?: string;
  page?: string | number;
}

export interface DraftValidation {
  confidence?: number;
  verifier?: string;
  groundedness?: number;
  dedup_similarity?: number;
}

export interface QuestionDraft {
  id: number;
  guid: string;
  subject_id: number;
  subject_name?: string;
  topic_name?: string;
  difficulty: string;
  question_type: DraftQuestionType;
  blocks: DraftBlock[];
  variants: DraftVariant[];
  task_description_ru?: string;
  task_description_kk?: string;
  question_translation_ru?: string;
  question_translation_kk?: string;
  explanation_ru?: string;
  explanation_kk?: string;
  source?: DraftSource | null;
  status: QuestionDraftStatus;
  validation?: DraftValidation | null;
  dedup_of_question_id?: number | null;
  published_question_id?: number | null;
  created_at?: string;
  updated_at?: string;
  reviewed_by?: string | null;
}

// PATCH payload — only the operator-editable text fields + variants.
export interface QuestionDraftUpdate {
  blocks?: DraftBlock[];
  variants?: DraftVariant[];
  task_description_ru?: string;
  task_description_kk?: string;
  question_translation_ru?: string;
  question_translation_kk?: string;
  explanation_ru?: string;
  explanation_kk?: string;
}

// The list endpoint may return either a bare array or a paginated
// envelope; the service normalises both into this shape.
export interface QuestionDraftListResult {
  drafts: QuestionDraft[];
  total: number;
}

export interface QuestionDraftListParams {
  status?: QuestionDraftStatus;
  subject_id?: number;
  limit?: number;
  offset?: number;
}
