// SubjectCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './EntityCard.module.scss';
import clsx from 'clsx';

export const SubjectCard: React.FC<{ subject: any }> = ({ subject }) => (
    <Link to={`/subjects/${subject.id}`} className={styles.entity_card__link}>
        <div className={clsx(styles.entity_card, styles['entity-card--subject'])}>
            <div className={styles.entity_card__content}>
                <div className={styles.entity_card__icon}>
                    <i className={clsx(styles.fas, styles.fa_book)}></i>
                </div>
                <h3 className={styles.entity_card__title}>{subject.name}</h3>
                <p className={styles.entity_card__description}>
                    {subject.description || 'Описание отсутствует'}
                </p>
                <div className={styles.entity_card__meta}>
                    <div className={styles.entity_card__meta_item}>
                        <i className={clsx(styles.fas, styles.fa_question_circle)}></i>
                        <span>Вопросов: {subject.questions_count || 0}</span>
                    </div>
                    <div className={styles.entity_card__meta_item}>
                        <i className={clsx(styles.fas, styles.fa_clock)}></i>
                        <span>
                            {subject.created_at ?
                                new Date(subject.created_at).toLocaleDateString() :
                                'Дата не указана'
                            }
                        </span>
                    </div>
                    {subject.topics_count && (
                        <div className={styles.entity_card__meta_item}>
                            <i className={clsx(styles.fas, styles.fa_folder)}></i>
                            <span>Тем: {subject.topics_count}</span>
                        </div>
                    )}
                </div>

                {subject.tags && subject.tags.length > 0 && (
                    <div className={styles.entity_card__tags}>
                        {subject.tags.slice(0, 3).map((tag: string, index: number) => (
                            <span key={index} className={styles.entity_card__tag}>
                                {tag}
                            </span>
                        ))}
                        {subject.tags.length > 3 && (
                            <span className={clsx(styles.entity_card__tag, styles['entity-card__tag--more'])}>
                                +{subject.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className={styles.entity_card__footer}>
                <div className={styles.entity_card__action}>
                    <i className={clsx(styles.fas, styles.fa_arrow_right)}></i>
                    Подробнее
                </div>
            </div>
        </div>
    </Link>
);