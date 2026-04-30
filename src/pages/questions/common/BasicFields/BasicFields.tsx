import React from 'react';
import CustomSelect from '@/components/common/CustomSelect';
import { EntOption, QuestionFormData, SelectOption, Subject, Topic, QuestionType } from '@/types/index';

interface BasicFieldsProps
{
    formData: QuestionFormData;
    subjects: Subject[];
    topics: Topic[];
    entOptions: EntOption[];
    loadingSubjects: boolean;
    onSubjectChange: (value: string) => void;
    onChange: (field: keyof QuestionFormData, value: string) => void;
}

export const BasicFields: React.FC<BasicFieldsProps> = ({
    formData,
    subjects,
    topics,
    entOptions,
    loadingSubjects,
    onSubjectChange,
    onChange
}) =>
{
    const questionTypeOptions: SelectOption[] = [
        { value: QuestionType.SINGLE_CHOICE, label: 'Одиночный выбор' },
        { value: QuestionType.MULTIPLE_CHOICE, label: 'Множественный выбор' },
        // { value: QuestionType.ENT, label: 'ЕНТ' }
    ];

    const difficultyOptions: SelectOption[] = [
        { value: 'easy', label: 'Легкий' },
        { value: 'medium', label: 'Средний' },
        { value: 'hard', label: 'Сложный' }
    ];

    const entOptionsFormatted: SelectOption[] = [
        { value: '', label: 'Не указан' },
        ...entOptions.map(option => ({
            value: option.id.toString(),
            label: option.name || `Вариант ${option.option_number || option.id}`
        }))
    ];

    const subjectOptions: SelectOption[] = [
        { value: '', label: 'Выберите предмет' },
        ...subjects.map(subject => ({
            value: subject.id.toString(),
            label: subject.name || `Предмет ${subject.id}`
        }))
    ];

    const filteredTopics = formData.subject_id
        ? topics.filter(topic => topic.subject_id?.toString() === formData.subject_id?.toString())
        : [];

    const topicOptions: SelectOption[] = !formData.subject_id
        ? [{ value: '', label: 'Сначала выберите предмет' }]
        : filteredTopics.length === 0
            ? [{ value: '', label: 'В этом предмете нет тем' }]
            : [
                { value: '', label: 'Выберите тему' },
                ...filteredTopics.map(topic => ({
                    value: topic.id.toString(),
                    label: topic.name || `Тема ${topic.id}`
                }))
            ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Тип вопроса <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        value={formData.question_type}
                        options={questionTypeOptions}
                        onChange={(value) => onChange('question_type', value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Сложность <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        value={formData.difficulty}
                        options={difficultyOptions}
                        onChange={(value) => onChange('difficulty', value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Предмет <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        value={formData.subject_id?.toString() || ''}
                        options={subjectOptions}
                        onChange={onSubjectChange}
                        disabled={loadingSubjects}
                    />
                    {loadingSubjects && (
                        <p className="mt-1 text-xs text-gray-500">Загрузка предметов...</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Тема
                    </label>
                    <CustomSelect
                        value={formData.topic_id?.toString() || ''}
                        options={topicOptions}
                        onChange={(value) => onChange('topic_id', value)}
                        disabled={!formData.subject_id || filteredTopics.length === 0}
                    />
                </div>

                {formData.question_type === QuestionType.ENT && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Вариант ЕНТ
                        </label>
                        <CustomSelect
                            value={formData.ent_option_id?.toString() || ''}
                            options={entOptionsFormatted}
                            onChange={(value) => onChange('ent_option_id', value)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};