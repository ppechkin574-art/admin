import { FC } from "react";
import styles from './PageSizeSelector.module.scss';
import clsx from 'clsx';

export interface PageSizeSelectorProps
{
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    loading?: boolean;
    options?: number[];
}

export const PageSizeSelector: FC<PageSizeSelectorProps> = ({
    pageSize,
    onPageSizeChange,
    loading = false,
    options = [10, 25, 50, 75, 100]
}) =>
{
    return (
        <div className={styles.page_size_selector}>
            <i className={clsx('fas fa-list-ol', styles.page_size_selector__icon)}></i>
            <label
                htmlFor="page-size-select"
                className={styles.page_size_selector__label}>
                Элементов на странице:
            </label>
            <select
                id="page-size-select"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className={styles.page_size_selector__select}
                disabled={loading}>
                {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </div>
    );
};