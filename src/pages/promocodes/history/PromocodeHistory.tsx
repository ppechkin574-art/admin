import ErrorState from "@/components/common/ErrorState";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import UniversalTable from "@/components/common/UniversalTable";
import { promocodeService } from "@/services/api";
import { Promocode, PromocodeHistoryItem, TableColumn } from "@/types";
import clsx from "clsx";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./PromocodeHistory.module.scss";
import toast from "react-hot-toast";

export const PromocodeHistory: React.FC = () =>
{
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [promocode, setPromocode] = useState<Promocode | null>(null);
  const [history, setHistory] = useState<PromocodeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () =>
  {
    if (!id) return;

    setLoading(true);
    setError(null);
    try
    {
      const [promocodesData, historyData] = await Promise.all([
        promocodeService.getAll(),
        promocodeService.getHistory(parseInt(id)),
      ]);

      const foundPromocode = promocodesData.find(
        (p: Promocode) => p.id === parseInt(id)
      );

      if (!foundPromocode)
      {
        setError("Промокод не найден");
        return;
      }

      setPromocode(foundPromocode);
      setHistory(historyData);
    } catch (err: any)
    {
      console.error("Error loading promocode history:", err);
      setError(err.message || "Ошибка загрузки истории промокода");
      toast.error("Не удалось загрузить историю промокода");
    } finally
    {
      setLoading(false);
    }
  }, [id]);

  useEffect(() =>
  {
    loadData();
  }, [loadData]);

  const formatDate = (dateString: string): string =>
  {
    return new Date(dateString).toLocaleString("ru-RU");
  };

  const columns: TableColumn[] = [
    {
      key: "student_guid",
      title: "GUID студента",
      render: (value: string) => (
        <span className={styles.guid}>{value}</span>
      ),
    },
    {
      key: "activated_at",
      title: "Дата активации",
      render: (value: string) => formatDate(value),
    },
    {
      key: "access_expires_at",
      title: "Доступ истекает",
      render: (value: string) => formatDate(value),
    },
  ];

  if (loading)
  {
    return (
      <div className={styles.promocode_history}>
        <div className={styles.loading}>
          <LoadingSpinner />
          <p>Загрузка истории промокода...</p>
        </div>
      </div>
    );
  }

  if (error || !promocode)
  {
    return (
      <div className={styles.promocode_history}>
        <ErrorState
          message={error || "Промокод не найден"}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className={styles.promocode_history}>
      <div className={styles.header}>
        <button
          className={clsx(styles.btn, styles.btn_back)}
          onClick={() => navigate("/promocodes")}
        >
          <i className="fas fa-arrow-left me-2"></i>
          Назад к списку
        </button>
      </div>

      <div className={styles.promocode_info}>
        <div className={styles.info_card}>
          <h2 className={styles.info_title}>Информация о промокоде</h2>
          <div className={styles.info_grid}>
            <div className={styles.info_item}>
              <span className={styles.info_label}>Код:</span>
              <span className={styles.code}>{promocode.code}</span>
            </div>
            {promocode.description && (
              <div className={styles.info_item}>
                <span className={styles.info_label}>Описание:</span>
                <span>{promocode.description}</span>
              </div>
            )}
            <div className={styles.info_item}>
              <span className={styles.info_label}>Длительность:</span>
              <span>{promocode.duration_days} дней</span>
            </div>
            <div className={styles.info_item}>
              <span className={styles.info_label}>Активации:</span>
              <span>
                {promocode.activations_count} / {promocode.max_activations}
              </span>
            </div>
            {promocode.expires_at && (
              <div className={styles.info_item}>
                <span className={styles.info_label}>Истекает:</span>
                <span>{formatDate(promocode.expires_at)}</span>
              </div>
            )}
            <div className={styles.info_item}>
              <span className={styles.info_label}>Создан:</span>
              <span>{formatDate(promocode.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.history_section}>
        <h2 className={styles.history_title}>
          История активаций ({history.length})
        </h2>
        <div className={styles.table_container}>
          <UniversalTable
            data={history}
            columns={columns}
            loading={loading}
            emptyMessage={
              <div className={styles.empty}>
                <i className="fas fa-history"></i>
                <p>История активаций пуста</p>
                <span>Этот промокод еще не был активирован</span>
              </div>
            }
            onRefresh={loadData}
          />
        </div>
      </div>
    </div>
  );
};

