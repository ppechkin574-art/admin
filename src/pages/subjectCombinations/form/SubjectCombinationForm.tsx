import React, { useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EntityForm from '@/components/common/EntityForm';
import { useSubjectCombinationStore } from '@/stores/subjectCombinationStore';
import { useDashboardStore } from '@/stores/dashboardStore';

export const SubjectCombinationForm: React.FC = () =>
{
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        createCombination,
        updateCombination,
        currentCombination,
        fetchCombinationById,
        loading,
        error,
        clearCurrent,
        clearError
    } = useSubjectCombinationStore();

    const { getSubjects, refreshDashboard } = useDashboardStore();

    const isEditing = Boolean(id);
    const subjects = getSubjects();

    const handleCreate = useCallback(async (data: any) =>
    {
        try
        {
            return await createCombination(data);
        } catch (error)
        {
            throw error;
        }
    }, [createCombination]);

    const handleUpdate = useCallback(async (id: number, data: any) =>
    {
        try
        {
            return await updateCombination(id, data);
        } catch (error)
        {
            throw error;
        }
    }, [updateCombination]);

    useEffect(() =>
    {
        return () =>
        {
            clearCurrent();
            clearError();
        };
    }, [clearCurrent, clearError]);

    useEffect(() =>
    {
        if (isEditing && id && (!currentCombination || currentCombination.id !== Number(id))) fetchCombinationById(Number(id));
    }, [isEditing, id, currentCombination, fetchCombinationById]);

    const dashboardStore = useMemo(() => ({
        refreshDashboard,
        getSubjectById: (id: number) => getSubjects().find(s => s.id === id),
        getTopicById: () => null,
        getTrainerById: () => null,
        getEntOptionById: () => null,
        getSubjectCombinationById: (id: number) =>
        {
            if (currentCombination && currentCombination.id === id) return currentCombination;
            return null;
        },
    }), [refreshDashboard, getSubjects, currentCombination]);

    const config = useMemo(() => ({
        title: 'Связка предметов',
        icon: 'fas fa-link',
        color: '#9c27b0',
        fields: [
            {
                key: 'name',
                label: 'Название связки',
                type: 'text' as const,
                required: true,
                placeholder: 'Например: Техническое направление',
                description: 'Укажите понятное название для связки предметов',
                defaultValue: isEditing && currentCombination ? currentCombination.name : ''
            },
            {
                key: 'description',
                label: 'Описание',
                type: 'textarea' as const,
                required: false,
                placeholder: 'Описание направления и особенностей',
                description: 'Необязательное поле для дополнительной информации',
                defaultValue: isEditing && currentCombination ? currentCombination.description : ''
            },
            {
                key: 'specialized_subject_1_id',
                label: 'Первый профильный предмет',
                type: 'select' as const,
                required: true,
                placeholder: 'Выберите первый предмет',
                options: subjects.map(subject => ({
                    label: subject.name,
                    value: subject.id
                })),
                defaultValue: isEditing && currentCombination ? currentCombination.specialized_subject_1_id : ''
            },
            {
                key: 'specialized_subject_2_id',
                label: 'Второй профильный предмет',
                type: 'select' as const,
                required: true,
                placeholder: 'Выберите второй предмет',
                options: subjects.map(subject => ({
                    label: subject.name,
                    value: subject.id
                })),
                defaultValue: isEditing && currentCombination ? currentCombination.specialized_subject_2_id : ''
            }
        ],
        transformData: (data: any) => ({
            ...data,
            specialized_subject_1_id: Number(data.specialized_subject_1_id),
            specialized_subject_2_id: Number(data.specialized_subject_2_id),
        }),
        validate: (data: any) =>
        {
            const errors: string[] = [];

            if (data.specialized_subject_1_id === data.specialized_subject_2_id) errors.push('Первый и второй профильные предметы не могут совпадать');

            return errors;
        }
    }), [subjects, isEditing, currentCombination]);

    const specificStore = useMemo(() => ({
        fetchEntity: isEditing ? fetchCombinationById : undefined,
        createEntity: handleCreate,
        updateEntity: handleUpdate,
        loading,
        error,
    }), [isEditing, fetchCombinationById, handleCreate, handleUpdate, loading, error]);

    return (
        <EntityForm
            entityType="subjectCombination"
            entityId={isEditing ? Number(id) : undefined}
            dashboardStore={dashboardStore}
            specificStore={specificStore}
            additionalData={{ subjects }}
            config={config}
            listRoute="/subject-combinations"
            detailRoute={(id) => `/subject-combinations/${id}`}
        />
    );
};