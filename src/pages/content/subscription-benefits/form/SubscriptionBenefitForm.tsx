import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
import { subscriptionBenefitService } from "@/services/api";
import {
  SubscriptionBenefit,
  SubscriptionBenefitCreatePayload,
} from "@/types/content";

interface FormState {
  position: number;
  title_ru: string;
  title_kz: string;
  description_ru: string;
  description_kz: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  position: 0,
  title_ru: "",
  title_kz: "",
  description_ru: "",
  description_kz: "",
  is_active: true,
};

/**
 * Create / edit form for one row of `subscription_benefits`.  Same
 * component handles both modes — when `:id` is present in the route we
 * preload the row and switch to PATCH on submit.
 */
export const SubscriptionBenefitForm: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEdit = editingId !== null;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const data: SubscriptionBenefit = await subscriptionBenefitService.getById(editingId!);
        if (cancelled) return;
        setForm({
          position: data.position,
          title_ru: data.title_ru,
          title_kz: data.title_kz,
          description_ru: data.description_ru,
          description_kz: data.description_kz,
          is_active: data.is_active,
        });
      } catch (err: any) {
        console.error("Error loading benefit:", err);
        toast.error("Не удалось загрузить фичу");
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editingId]);

  const handleChange = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const payload: SubscriptionBenefitCreatePayload = {
        position: form.position,
        title_ru: form.title_ru.trim(),
        title_kz: form.title_kz.trim(),
        description_ru: form.description_ru.trim(),
        description_kz: form.description_kz.trim(),
        is_active: form.is_active,
      };

      if (
        !payload.title_ru ||
        !payload.title_kz ||
        !payload.description_ru ||
        !payload.description_kz
      ) {
        toast.error("Заполните все поля RU и KZ");
        return;
      }

      setLoading(true);
      try {
        if (isEdit) {
          await subscriptionBenefitService.update(editingId!, payload);
          toast.success("Сохранено");
        } else {
          await subscriptionBenefitService.create(payload);
          toast.success("Создано");
        }
        navigate("/content/subscription-benefits");
      } catch (err: any) {
        console.error("Error saving benefit:", err);
        toast.error(err.response?.data?.detail || "Ошибка при сохранении");
      } finally {
        setLoading(false);
      }
    },
    [form, isEdit, editingId, navigate],
  );

  const handleCancel = useCallback(() => {
    navigate("/content/subscription-benefits");
  }, [navigate]);

  if (loadingInitial) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Редактирование фичи" : "Новая фича подписки"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Эти пункты отображаются на экране подписки в мобильном приложении.
          Заполните оба языка — клиент сам выберет нужный по локали устройства.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Позиция (порядок отображения)
          </label>
          <input
            type="number"
            min={0}
            value={form.position}
            onChange={(e) => handleChange("position", Number(e.target.value))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок (RU) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              required
              value={form.title_ru}
              onChange={(e) => handleChange("title_ru", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок (KZ) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              required
              value={form.title_kz}
              onChange={(e) => handleChange("title_kz", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание (RU) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={form.description_ru}
              onChange={(e) => handleChange("description_ru", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание (KZ) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={form.description_kz}
              onChange={(e) => handleChange("description_kz", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => handleChange("is_active", e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
            Активна (показывать в мобильном приложении)
          </label>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading}>
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
};
