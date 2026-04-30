// components/common/EntityCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { SubjectType } from '@/types';
import styles from './EntityCard.module.scss';
import clsx from 'clsx';

export interface EntityCardProps
{
    entity: any;
    entityType: 'subject' | 'topic' | 'trainer' | 'ent' | 'subjectCombination';
    onClick?: (entity: any) => void;
    onEdit?: (entity: any) => void;
    onDelete?: (entity: any) => void;
    showActions?: boolean;
    className?: string;
    isDeleting?: boolean; // Новое свойство
}

export const EntityCard: React.FC<EntityCardProps> = ({
    entity,
    entityType,
    onClick,
    onEdit,
    onDelete,
    showActions = true,
    className = '',
    isDeleting = false
}) =>
{
    const getEntityDetails = () =>
    {
        switch (entityType)
        {
            case 'subject':
                const getSubjectTypeLabel = (type: SubjectType) =>
                {
                    switch (type)
                    {
                        case SubjectType.MAIN:
                            return 'Основной';
                        case SubjectType.SPECIALIZED:
                            return 'Профильный';
                        default:
                            return 'Не указан';
                    }
                };

                return [
                    {
                        icon: 'fas fa-graduation-cap',
                        text: `Тип: ${entity.type ? getSubjectTypeLabel(entity.type) : 'Не указан'}`
                    },
                    { icon: 'fas fa-question-circle', text: `Вопросов: ${entity.question_count || '-'}` },
                    { icon: 'fas fa-folder', text: `Тем: ${entity.topic_count || '-'}` },
                ];
            case 'topic':
                return [
                    { icon: 'fas fa-question-circle', text: `Вопросов: ${entity.question_count || '-'}` },
                    { icon: 'fas fa-book', text: `Предмет: ${entity.subject?.name || '-'}` },
                ];
            case 'trainer':
                return [
                    { icon: 'fas fa-question-circle', text: `Вопросов: ${entity.question_count || '-'}` },
                ];
            case 'ent':
                return [
                    {
                        icon: 'fas fa-book',
                        text: `Предмет: ${entity.subject?.name || entity.subject_name || '-'}`
                    },
                    {
                        icon: 'fas fa-hashtag',
                        text: `Номер: ${entity.option_number || '-'}`
                    },
                    {
                        icon: 'fas fa-question-circle',
                        text: `Вопросов: ${entity.questions_count || entity.question_count || '0'}`
                    },
                ];
            case 'subjectCombination':
                return [
                    {
                        icon: 'fas fa-book',
                        text: `Предмет 1: ${entity.specialized_subject_1_name || '-'}`
                    },
                    {
                        icon: 'fas fa-book',
                        text: `Предмет 2: ${entity.specialized_subject_2_name || '-'}`
                    },
                    {
                        icon: 'fas fa-align-left',
                        text: entity.description ? `Описание: ${entity.description}` : 'Без описания'
                    }
                ];
            default:
                return [];
        }
    };

    const entityConfig = {
        subject: {
            icon: 'fas fa-book',
            color: '#667eea',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            details: getEntityDetails(),
            url: `/subjects/${entity.id}`,
            tags: entity.tags || [],
            image: entity.image
        },
        topic: {
            icon: 'fas fa-folder',
            color: '#ff6b6b',
            gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
            details: getEntityDetails(),
            url: `/topics/${entity.id}`,
            tags: entity.tags || [],
            image: entity.image
        },
        trainer: {
            icon: 'fas fa-dumbbell',
            color: '#28a745',
            gradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            details: getEntityDetails(),
            url: `/trainers/${entity.id}`,
            tags: entity.tags || [],
            image: entity.image
        },
        ent: {
            icon: 'fas fa-file-alt',
            color: '#17a2b8',
            gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
            details: getEntityDetails(),
            url: `/ents/${entity.id}`,
            tags: entity.tags || [],
            image: entity.image
        },
        subjectCombination: {
            icon: 'fas fa-link',
            color: '#9c27b0',
            gradient: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
            details: getEntityDetails(),
            url: `/subject-combinations/${entity.id}`,
            tags: entity.tags || [],
            image: entity.image
        }
    };

    const config = entityConfig[entityType];
    const hasImage = Boolean(config.image);

    return (
        <div className={clsx(styles.entity_card, styles[`entity_card__${entityType}`], isDeleting && styles.entity_card__deleting, className)}>
            <Link to={config.url} className={styles.entity_card__link} onClick={() => onClick?.(entity)}>
                <div className={styles.entity_card__content}>
                    <div className={styles.entity_card__header}>
                        <div
                            className={clsx(
                                styles.entity_card__icon,
                                hasImage && styles.entity_card__icon__with_image
                            )}
                            style={{ background: config.gradient }} // Всегда применяем градиент
                        >
                            {hasImage ? (
                                <img src={config.image} alt={entity.name} className={styles.entity_card__icon_image} />
                            ) : (
                                <i className={config.icon}></i>
                            )}
                        </div>
                        <h3 className={styles.entity_card__title}>{entity.name ?? 'Noname'}</h3>
                    </div>

                    <div className={styles.entity_card__details}>
                        {config.details.map((detail, index) => (
                            <div key={index} className={styles.entity_card__detail}>
                                <i className={detail.icon}></i>
                                <span>{detail.text}</span>
                            </div>
                        ))}
                    </div>

                    {config.tags.length > 0 && (
                        <div className={styles.entity_card__tags}>
                            {config.tags.slice(0, 3).map((tag: string, index: number) => (
                                <span key={index} className={styles.entity_card__tag}>
                                    {tag}
                                </span>
                            ))}
                            {config.tags.length > 3 && (
                                <span className={clsx(styles.entity_card__tag, styles.entity_card__tag__more)}>
                                    +{config.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.entity_card__footer}>
                    <div className={styles.entity_card__action}>
                        Подробнее
                        <i className='fas fa-arrow-right'></i>
                    </div>
                </div>
            </Link>

            {showActions && (onEdit || onDelete) && (
                <div className={styles.entity_card__actions}>
                    {onEdit && (
                        <button
                            className={clsx(styles.entity_card__action_btn, styles.entity_card__action_btn__edit)}
                            onClick={() => onEdit?.(entity)}
                            title="Редактировать"
                        >
                            <i className='fas fa-edit'></i>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className={clsx(styles.entity_card__action_btn, styles.entity_card__action_btn__delete)}
                            onClick={() => onDelete?.(entity)}
                            title="Удалить"
                        >
                            <i className='fas fa-trash'></i>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};