import React from "react";
import styles from './EmptyState.module.scss';

interface EmptyStateProps
{
    title: string;
    description?: string;
    action?: {
        text: string;
        onClick?: () => void;
        link?: string;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    action
}) =>
{
    const handleActionClick = () =>
    {
        if (action?.onClick)
            action.onClick();
    };

    const renderAction = () =>
    {
        if (!action) return null;

        if (action.link)
            return (
                <a href={action.link} className={styles.empty_state__action_link}>
                    {action.text}
                </a>
            );


        return (
            <button onClick={handleActionClick} className={styles.empty_state__action_button}>
                {action.text}
            </button>
        );
    };

    return (
        <div className={styles.empty_state}>
            <h5 className={styles.empty_state__title}>{title}</h5>
            {description && <p className={styles.empty_state__description}>{description}</p>}
            {action && renderAction()}
        </div>
    );
};