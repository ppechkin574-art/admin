import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import styles from './EntityForm.module.scss';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export interface FieldConfig
{
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date';
    options?: { label: string; value: any }[];
    required?: boolean;
    placeholder?: string;
    description?: string;
    defaultValue?: any;
    readOnly?: boolean; // Добавляем поддержку readOnly
}

export interface EntityFormProps
{
    entityType: 'subject' | 'topic' | 'trainer' | 'ent' | 'subjectCombination';
    entityId?: number;
    dashboardStore: {
        getSubjectById?: (id: number) => any;
        getTopicById?: (id: number) => any;
        getTrainerById?: (id: number) => any;
        getEntOptionById?: (id: number) => any;
        refreshDashboard: () => Promise<void>;
    };
    specificStore: {
        fetchEntity?: (id: number) => Promise<void>;
        createEntity: (data: any) => Promise<any>;
        updateEntity: (id: number, data: any) => Promise<any>;
        loading: boolean;
        error: string | null;
    };
    additionalData?: {
        subjects?: any[];
        topics?: any[];
    };
    config: {
        title: string;
        icon: string;
        color: string;
        fields: FieldConfig[];
        transformData?: (data: any) => any;
    };
    listRoute: string;
    detailRoute?: (id: number) => string;
    initialData?: Record<string, any>;
}

export const EntityForm: React.FC<EntityFormProps> = ({
    entityType,
    entityId,
    dashboardStore,
    specificStore,
    additionalData = {},
    config,
    listRoute,
    detailRoute,
    initialData
}) =>
{
    const navigate = useNavigate();
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);

    const isEditing = !!entityId;

    const getEntity = () =>
    {
        if (!entityId) return null;

        switch (entityType)
        {
            case 'subject': return dashboardStore.getSubjectById?.(entityId);
            case 'topic': return dashboardStore.getTopicById?.(entityId);
            case 'trainer': return dashboardStore.getTrainerById?.(entityId);
            case 'ent': return dashboardStore.getEntOptionById?.(entityId);
            default: return null;
        }
    };

    const entity = getEntity();

    useEffect(() =>
    {
        if (isEditing && entityId)
        {
            if (specificStore.fetchEntity) specificStore.fetchEntity(entityId);

            const initialData: Record<string, any> = {};
            config.fields.forEach(field =>
            {
                initialData[field.key] = entity?.[field.key] ?? field.defaultValue ?? '';
            });
            setFormData(initialData);
        } else
        {
            const initialFormData: Record<string, any> = {};

            config.fields.forEach(field =>
            {
                if (initialData && initialData[field.key] !== undefined)
                {
                    initialFormData[field.key] = initialData[field.key];
                } else
                {
                    initialFormData[field.key] = field.defaultValue ?? '';
                }
            });
            setFormData(initialFormData);
        }
    }, [entity, entityId, isEditing, config.fields, specificStore, initialData]);

    const handleChange = (key: string, value: any) =>
    {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) =>
    {
        e.preventDefault();

        // Валидация обязательных полей
        const validationErrors: string[] = [];
        for (const field of config.fields)
        {
            if (field.required && !formData[field.key])
            {
                validationErrors.push(`Поле "${field.label}" обязательно для заполнения`);
            }
        }

        if (validationErrors.length > 0)
        {
            toast.error(validationErrors.join('\n'));
            return;
        }

        if (config.validate)
        {
            const customErrors = config.validate(formData);
            if (customErrors.length > 0)
            {
                toast.error(customErrors.join('\n'));
                return;
            }
        }

        setSubmitting(true);
        try
        {
            const dataToSubmit = config.transformData ? config.transformData(formData) : formData;

            if (isEditing && entityId)
            {
                await specificStore.updateEntity(entityId, dataToSubmit);
                toast.success(`${config.title} успешно обновлен`);
            }
            else
            {
                await specificStore.createEntity(dataToSubmit);
                toast.success(`${config.title} успешно создан`);
            }

            // Обновляем dashboard
            await dashboardStore.refreshDashboard();

            // Переходим на список или детальную страницу
            if (isEditing && detailRoute)
            {
                navigate(detailRoute(entityId));
            }
            else
            {
                navigate(listRoute);
            }
        }
        catch (error: any)
        {
            console.error('Form submission error:', error);
            toast.error(error.message || 'Ошибка при сохранении');
        }
        finally
        {
            setSubmitting(false);
        }
    };

    const handleCancel = () => navigate(listRoute);

    const loading = specificStore.loading;

    if (loading && isEditing)
        return (
            <div className={clsx(styles.entity_form, styles.entity_form__loading)}>
                <LoadingSpinner />
                <p>Загрузка...</p>
            </div>
        );

    return (
        <div className={clsx(styles.entity_form, styles[`entity_form__${entityType}`])}>
            <div className={styles.entity_form__header}>
                <div className={styles.entity_form__title_section}>
                    <div
                        className={styles.entity_form__icon}
                        style={{ background: config.color }}
                    >
                        <i className={config.icon}></i>
                    </div>
                    <div>
                        <h1 className={styles.entity_form__title}>
                            {isEditing ? `Редактирование ${config.title.toLowerCase()}` : `Создание ${config.title.toLowerCase()}`}
                        </h1>
                        <p className={styles.entity_form__subtitle}>
                            {isEditing ? 'Обновите информацию ниже' : 'Заполните информацию ниже'}
                        </p>
                    </div>
                </div>

                <div className={styles.entity_form__actions}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancel}
                        disabled={submitting}
                    >
                        <i className="fas fa-arrow-left"></i>
                        Отмена
                    </button>
                    <button
                        type="submit"
                        form="entity-form"
                        className="btn btn-primary"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Сохранение...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                {isEditing ? 'Сохранить' : 'Создать'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {specificStore.error && (
                <div className="alert alert-danger mb-3">
                    {specificStore.error}
                </div>
            )}

            <form id="entity-form" onSubmit={handleSubmit} className={styles.entity_form__form}>
                <div className={styles.entity_form__fields}>
                    {config.fields.map((field) => (
                        <div key={field.key} className={styles.form_group}>
                            <label htmlFor={field.key} className={styles.form_label}>
                                {field.label}
                                {field.required && <span className={styles.required}>*</span>}
                            </label>

                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    id={field.key}
                                    className="form-control"
                                    value={formData[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    disabled={submitting || field.readOnly}
                                    readOnly={field.readOnly}
                                />
                            )}

                            {field.type === 'textarea' && (
                                <textarea
                                    id={field.key}
                                    className="form-control"
                                    rows={4}
                                    value={formData[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    disabled={submitting || field.readOnly}
                                    readOnly={field.readOnly}
                                />
                            )}

                            {field.type === 'number' && (
                                <input
                                    type="number"
                                    id={field.key}
                                    className="form-control"
                                    value={formData[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    disabled={submitting || field.readOnly}
                                    readOnly={field.readOnly}
                                />
                            )}

                            {field.type === 'select' && (
                                <select
                                    id={field.key}
                                    className="form-select"
                                    value={formData[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    disabled={submitting || field.readOnly}
                                >
                                    <option value="">Выберите...</option>
                                    {field.options?.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                    {field.key === 'subject_id' && additionalData.subjects?.map(subject => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </option>
                                    ))}
                                    {field.key === 'topic_id' && additionalData.topics?.map(topic => (
                                        <option key={topic.id} value={topic.id}>
                                            {topic.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {field.type === 'checkbox' && (
                                <div className={styles.checkbox_wrapper}>
                                    <input
                                        type="checkbox"
                                        id={field.key}
                                        checked={formData[field.key] || false}
                                        onChange={(e) => handleChange(field.key, e.target.checked)}
                                        disabled={submitting || field.readOnly}
                                        className={styles.checkbox_input}
                                        readOnly={field.readOnly}
                                    />
                                    <label htmlFor={field.key} className={styles.checkbox_label}>
                                        {field.placeholder || field.label}
                                    </label>
                                </div>
                            )}

                            {field.type === 'date' && (
                                <input
                                    type="date"
                                    id={field.key}
                                    className="form-control"
                                    value={formData[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    disabled={submitting || field.readOnly}
                                    readOnly={field.readOnly}
                                />
                            )}

                            {field.description && (
                                <div className="form-text">{field.description}</div>
                            )}
                        </div>
                    ))}
                </div>
            </form>
        </div>
    );
};