import LoadingSpinner from "@/components/common/LoadingSpinner";
import { promocodeService } from "@/services/api";
import { PromocodeFormData } from "@/types";
import clsx from "clsx";
import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PromocodeForm.module.scss";
import toast from "react-hot-toast";

export const PromocodeForm: React.FC = () =>
{
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PromocodeFormData>({
    duration_days: 7,
    max_activations: 1,
    code: "",
    expires_at: null,
    description: "",
  });

  const handleChange = useCallback(
    (field: keyof PromocodeFormData, value: any) =>
    {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) =>
    {
      e.preventDefault();
      setLoading(true);

      try
      {
        const submitData = {
          duration_days: formData.duration_days,
          max_activations: formData.max_activations,
          code: formData.code?.trim() || null,
          expires_at: formData.expires_at || null,
          description: formData.description?.trim() || null,
        };

        await promocodeService.create(submitData);
        toast.success("Промокод успешно создан");
        navigate("/promocodes");
      } catch (error: any)
      {
        console.error("Error creating promocode:", error);
        toast.error(
          error.response?.data?.detail || "Ошибка при создании промокода"
        );
      } finally
      {
        setLoading(false);
      }
    },
    [formData, navigate]
  );

  const handleCancel = () =>
  {
    navigate("/promocodes");
  };

  return (
    <div className={styles.promocode_form}>
      <div className={styles.header}>
        <h1 className={styles.title}>Создание промокода</h1>
        <p className={styles.description}>
          Заполните форму для создания нового промокода
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.form_group}>
          <label className={styles.label}>
            Длительность доступа <span className={styles.required}>*</span>
          </label>
          <select
            className={styles.select}
            value={formData.duration_days}
            onChange={(e) =>
              handleChange("duration_days", parseInt(e.target.value) as 7 | 14 | 30)
            }
            required
          >
            <option value={7}>7 дней</option>
            <option value={14}>14 дней</option>
            <option value={30}>30 дней</option>
          </select>
          <p className={styles.help_text}>
            Количество дней доступа, которое получит пользователь при активации
          </p>
        </div>

        <div className={styles.form_group}>
          <label className={styles.label}>
            Максимальное количество активаций{" "}
            <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            className={styles.input}
            value={formData.max_activations}
            onChange={(e) =>
              handleChange("max_activations", parseInt(e.target.value) || 1)
            }
            min={1}
            required
          />
          <p className={styles.help_text}>
            Сколько пользователей могут активировать этот промокод
          </p>
        </div>

        <div className={styles.form_group}>
          <label className={styles.label}>Код промокода</label>
          <input
            type="text"
            className={styles.input}
            value={formData.code || ""}
            onChange={(e) => handleChange("code", e.target.value)}
            placeholder="Оставьте пустым для автогенерации"
            maxLength={50}
          />
          <p className={styles.help_text}>
            Если не указан, код будет сгенерирован автоматически
          </p>
        </div>

        <div className={styles.form_group}>
          <label className={styles.label}>Дата истечения</label>
          <input
            type="datetime-local"
            className={styles.input}
            value={
              formData.expires_at
                ? new Date(formData.expires_at).toISOString().slice(0, 16)
                : ""
            }
            onChange={(e) =>
              handleChange(
                "expires_at",
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
          />
          <p className={styles.help_text}>
            Дата, после которой промокод нельзя будет активировать (необязательно)
          </p>
        </div>

        <div className={styles.form_group}>
          <label className={styles.label}>Описание</label>
          <textarea
            className={styles.textarea}
            value={formData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            placeholder="Описание промокода (необязательно)"
          />
          <p className={styles.help_text}>
            Дополнительная информация о промокоде
          </p>
        </div>

        <div className={styles.form_actions}>
          <button
            type="button"
            className={clsx(styles.btn, styles.btn_secondary)}
            onClick={handleCancel}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={clsx(styles.btn, styles.btn_primary)}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Создание...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                Создать промокод
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

