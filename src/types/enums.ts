export enum Difficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export enum QuestionType {
  SINGLE_CHOICE = "single_choice",
  MULTIPLE_CHOICE = "multiple_choice",
  ENT = "ent",
}

export enum Status {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export enum BlockType {
  TEXT = "text",
  MEDIA = "media",
  VIDEO = "video",
}

export enum SubjectType {
  MAIN = "main",
  SPECIALIZED = "specialized",
}

export enum TestType {
  TRAINING = "training",
  ENT = "ent",
}

export interface BaseEntity {
  id: number;
  guid: string;
}
