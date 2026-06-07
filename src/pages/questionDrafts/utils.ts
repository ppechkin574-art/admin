import {
  DraftBlock,
  DraftQuestionType,
  QuestionDraftStatus,
} from "@/types/questionDrafts";

// Multi-correct types — anything that isn't single_choice allows >1 correct.
export const isMultiCorrectType = (type: DraftQuestionType): boolean =>
  type !== "single_choice";

export const getQuestionTypeText = (type: DraftQuestionType): string => {
  switch (type) {
    case "single_choice":
      return "Одиночный выбор";
    case "multi_choice":
    case "multiple_choice":
      return "Множественный выбор";
    default:
      return type;
  }
};

export const getDifficultyText = (difficulty: string): string => {
  switch (difficulty) {
    case "easy":
      return "Легкий";
    case "medium":
      return "Средний";
    case "hard":
      return "Сложный";
    default:
      return difficulty;
  }
};

export const getDifficultyBadgeType = (
  difficulty: string,
): "success" | "warning" | "error" | "secondary" => {
  switch (difficulty) {
    case "easy":
      return "success";
    case "medium":
      return "warning";
    case "hard":
      return "error";
    default:
      return "secondary";
  }
};

export const STATUS_META: Record<
  QuestionDraftStatus,
  { label: string; badge: "secondary" | "success" | "error" | "info" }
> = {
  draft: { label: "Черновик", badge: "secondary" },
  approved: { label: "Одобрен", badge: "info" },
  rejected: { label: "Отклонён", badge: "error" },
  published: { label: "Опубликован", badge: "success" },
};

// First text block, used for the truncated list preview.
export const getFirstTextValue = (blocks: DraftBlock[] = []): string => {
  const textBlock = [...blocks]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .find((b) => b.type === "text" && b.value);
  return textBlock?.value ?? "";
};

export const truncate = (text: string, max = 120): string => {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

// Confidence (and other 0..1 validation metrics) rendered as a percentage.
export const formatScore = (value?: number): string => {
  if (value == null || Number.isNaN(value)) return "—";
  // Accept either 0..1 or already-percent values.
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
};

export const confidenceBadgeType = (
  value?: number,
): "success" | "warning" | "error" | "secondary" => {
  if (value == null) return "secondary";
  const v = value <= 1 ? value : value / 100;
  if (v >= 0.8) return "success";
  if (v >= 0.5) return "warning";
  return "error";
};
