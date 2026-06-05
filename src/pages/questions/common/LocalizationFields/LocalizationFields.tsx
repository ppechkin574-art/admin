import React from "react";

type LocalizationField =
  | "task_description_ru"
  | "task_description_kk"
  | "question_translation_ru"
  | "question_translation_kk"
  | "explanation_ru"
  | "explanation_kk";

interface LocalizationFieldsProps {
  task_description_ru?: string;
  task_description_kk?: string;
  question_translation_ru?: string;
  question_translation_kk?: string;
  explanation_ru?: string;
  explanation_kk?: string;
  onChange: (field: LocalizationField, value: string) => void;
}

const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const textareaClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

export const LocalizationFields: React.FC<LocalizationFieldsProps> = ({
  task_description_ru = "",
  task_description_kk = "",
  question_translation_ru = "",
  question_translation_kk = "",
  explanation_ru = "",
  explanation_kk = "",
  onChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-medium text-gray-900">
          Подсказка „Что требует вопрос?“ (необязательно)
        </h4>
        <p className="text-sm text-gray-500 mt-1">
          Заполняется при необходимости. Используется для панели «Что требует
          вопрос?» в мобильном приложении.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Описание задачи (RU)</label>
          <textarea
            rows={3}
            value={task_description_ru}
            onChange={(e) => onChange("task_description_ru", e.target.value)}
            className={textareaClass}
          />
        </div>
        <div>
          <label className={labelClass}>Описание задачи (KZ)</label>
          <textarea
            rows={3}
            value={task_description_kk}
            onChange={(e) => onChange("task_description_kk", e.target.value)}
            className={textareaClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Перевод вопроса (RU)</label>
          <textarea
            rows={3}
            value={question_translation_ru}
            onChange={(e) => onChange("question_translation_ru", e.target.value)}
            className={textareaClass}
          />
        </div>
        <div>
          <label className={labelClass}>Перевод вопроса (KZ)</label>
          <textarea
            rows={3}
            value={question_translation_kk}
            onChange={(e) => onChange("question_translation_kk", e.target.value)}
            className={textareaClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Правило для запоминания (RU)</label>
          <textarea
            rows={3}
            value={explanation_ru}
            onChange={(e) => onChange("explanation_ru", e.target.value)}
            className={textareaClass}
          />
        </div>
        <div>
          <label className={labelClass}>Правило для запоминания (KZ)</label>
          <textarea
            rows={3}
            value={explanation_kk}
            onChange={(e) => onChange("explanation_kk", e.target.value)}
            className={textareaClass}
          />
        </div>
      </div>
    </div>
  );
};

export default LocalizationFields;
