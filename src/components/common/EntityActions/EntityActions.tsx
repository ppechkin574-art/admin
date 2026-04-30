import React from 'react';
import styles from './EntityActions.module.scss';
import clsx from 'clsx';

export interface EntityActionsProps
{
    entityName: string;
    entityDescription?: string;
    selectedCount?: number;
    loading?: boolean;
    refreshing?: boolean;
    onCreate?: () => void;
    onImport?: () => void;
    onRefresh?: () => void;
    onBulkDelete?: () => void;
    additionalButtons?: React.ReactNode;
    createLink?: string;
    importLink?: string;
}

export const EntityActions: React.FC<EntityActionsProps> = ({
    entityName,
    entityDescription = `Все ${entityName} в приложении`,
    selectedCount = 0,
    loading = false,
    refreshing = false,
    onCreate,
    onImport,
    onRefresh,
    onBulkDelete,
    additionalButtons,
    createLink,
    importLink
}) =>
{
    const handleCreate = () =>
    {
        if (createLink) window.location.href = createLink;
        else onCreate?.();
    };

    const handleImport = () =>
    {
        if (importLink) window.location.href = importLink;
        else onImport?.();
    };

    return (
        <div className={styles.entity_actions}>
            <div className={styles.entity_actions__header}>
                <div className={styles.entity_actions__title_section}>
                    <h1 className={styles.entity_actions__title}>{entityName}</h1>
                    <p className={styles.entity_actions__description}>{entityDescription}</p>
                </div>

                <div className={styles.entity_actions__buttons}>
                    {selectedCount > 0 && onBulkDelete && (
                        <button
                            className={clsx(styles.entity_actions__btn, styles.entity_actions__btn__danger)}
                            onClick={onBulkDelete}
                            disabled={loading}
                            title={`Удалить выбранные ${entityName} (${selectedCount})`}
                        >
                            <i className={clsx('fas', 'fa-trash', styles.entity_actions__icon)}></i>
                            Удалить выбранные ({selectedCount})
                        </button>
                    )}

                    {onRefresh && (
                        <button
                            className={clsx(styles.entity_actions__btn, styles.entity_actions__btn__refresh)}
                            onClick={onRefresh}
                            disabled={loading || refreshing}
                            title="Обновить данные с сервера"
                        >
                            <i className={clsx('fas', 'fa-sync-alt', styles.entity_actions__icon, loading || refreshing && 'fa-spin')}></i>
                            {refreshing ? 'Обновление...' : loading ? 'Загрузка...' : 'Обновить'}
                        </button>
                    )}

                    {(onImport || importLink) && (
                        <button
                            className={clsx(styles.entity_actions__btn, styles.entity_actions__btn__import)}
                            onClick={handleImport}
                            disabled={loading}
                            title={`Импорт ${entityName} из файла`}
                        >
                            <i className={clsx('fas', 'fa-file-import', styles.entity_actions__icon)}></i>
                            Импорт
                        </button>
                    )}

                    {(onCreate || createLink) && (
                        <button
                            className={clsx(styles.entity_actions__btn, styles.entity_actions__btn__create)}
                            onClick={handleCreate}
                            disabled={loading}
                            title={`Создать новый ${entityName}`}
                        >
                            <i className={clsx('fas', 'fa-plus', styles.entity_actions__icon)}></i>
                            Создать {entityName}
                        </button>
                    )}

                    {additionalButtons}
                </div>
            </div>
        </div>
    );
};