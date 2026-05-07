import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, RefreshCw } from "lucide-react";

import { subscriptionBenefitService } from "@/services/api";
import { SubscriptionBenefit } from "@/types/content";
import { ListContainer } from "@/components/lists/ListContainer";
import { ListHeader } from "@/components/lists/ListHeader";
import { ListTable } from "@/components/lists/ListTable";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";

/**
 * Admin view of the editable bullet-point list rendered on the mobile
 * subscription screen.  CRUD is delegated to
 * `/admin/content/subscription-benefits` on the backend; the same list
 * (locale-resolved) is consumed by the Flutter app via `/content/...`.
 */
export const SubscriptionBenefitList: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<SubscriptionBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await subscriptionBenefitService.getAll();
      setItems(data);
    } catch (err: any) {
      console.error("Error loading subscription benefits:", err);
      setError(err.message || "Ошибка загрузки фич подписки");
      toast.error("Не удалось загрузить фичи подписки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(() => {
    navigate("/content/subscription-benefits/create");
  }, [navigate]);

  const handleEdit = useCallback(
    (item: SubscriptionBenefit) => {
      navigate(`/content/subscription-benefits/${item.id}/edit`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (item: SubscriptionBenefit) => {
      if (!window.confirm(`Удалить «${item.title_ru}»?`)) return;
      try {
        await subscriptionBenefitService.delete(item.id);
        toast.success("Удалено");
        load();
      } catch (err: any) {
        console.error("Error deleting benefit:", err);
        toast.error("Не удалось удалить");
      }
    },
    [load],
  );

  const formatDate = (s: string | null | undefined): string =>
    s ? new Date(s).toLocaleString("ru-RU") : "—";

  const columns = [
    {
      header: "Позиция",
      accessor: "position",
      width: "8%",
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      header: "Заголовок (RU)",
      accessor: "title_ru",
      width: "22%",
      render: (value: string) => (
        <span className="font-semibold text-gray-900">{value}</span>
      ),
    },
    {
      header: "Заголовок (KZ)",
      accessor: "title_kz",
      width: "22%",
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      header: "Описание (RU)",
      accessor: "description_ru",
      width: "20%",
      render: (value: string) => (
        <span className="text-sm text-gray-600 line-clamp-2">{value}</span>
      ),
    },
    {
      header: "Активна",
      accessor: "is_active",
      width: "10%",
      render: (value: boolean) =>
        value ? (
          <Badge type="success">Да</Badge>
        ) : (
          <Badge type="warning">Нет</Badge>
        ),
    },
    {
      header: "Обновлено",
      accessor: "updated_at",
      width: "18%",
      render: (value: string) => (
        <span className="text-sm text-gray-500">{formatDate(value)}</span>
      ),
    },
  ];

  const tableActions = {
    edit: (item: SubscriptionBenefit) => handleEdit(item),
    delete: (item: SubscriptionBenefit) => handleDelete(item),
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">Ошибка загрузки данных</div>
          <Button variant="secondary" onClick={load}>
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ListContainer>
      <ListHeader
        title="Фичи подписки"
        actionButtons={[
          {
            label: "Добавить фичу",
            onClick: handleCreate,
            icon: Plus,
            variant: "primary",
            disabled: loading,
          },
        ]}
      >
        <Button
          variant="secondary"
          onClick={load}
          disabled={loading}
          icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
        >
          {loading ? "Загрузка..." : "Обновить"}
        </Button>
      </ListHeader>

      <ListTable
        data={items}
        columns={columns}
        loading={loading}
        emptyMessage="Список пуст"
        selectable={false}
        actions={tableActions}
        currentPage={1}
        totalPages={1}
        onPageChange={() => undefined}
        pageSize={items.length || 25}
        onPageSizeChange={() => undefined}
        totalRecords={items.length}
      />
    </ListContainer>
  );
};
