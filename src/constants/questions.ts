export const QUESTION_TYPES = {
  ALL: "all",
  TRAINER: "trainer",
  ENT: "ent",
  UNASSIGNED: "unassigned",
} as const;

export const QUESTION_TYPE_DISPLAY_NAMES: Record<string, string> = {
  [QUESTION_TYPES.ALL]: "Все вопросы",
  [QUESTION_TYPES.TRAINER]: "Вопросы тренажёра",
  [QUESTION_TYPES.ENT]: "Вопросы ЕНТ",
  [QUESTION_TYPES.UNASSIGNED]: "Непривязанные вопросы",
};

export const QUESTION_TYPE_DESCRIPTIONS: Record<string, string> = {
  [QUESTION_TYPES.ALL]: "Управление всеми вопросами системы",
  [QUESTION_TYPES.TRAINER]: "Вопросы, используемые в тренировочных режимах",
  [QUESTION_TYPES.ENT]: "Вопросы для тестирования ЕНТ",
  [QUESTION_TYPES.UNASSIGNED]: "Вопросы без привязки к темам и предметам",
};
