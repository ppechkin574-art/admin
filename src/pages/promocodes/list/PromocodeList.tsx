import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { promocodeService } from "@/services/api";
import { Promocode } from "@/types";
import toast from "react-hot-toast";
import { Plus, RefreshCw, History } from "lucide-react";

import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import SimpleTable from "@/components/common/SimpleTable";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";

export const PromocodeList: React.FC = () =>
{
  const navigate = useNavigate();
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState({
    search: ''
  });
  const [filtersOpen, setFiltersOpen] = useState(true);

  const loadPromocodes = useCallback(async () =>
  {
    setLoading(true);
    setError(null);
    try
    {
      const data = await promocodeService.getAll();
      setPromocodes(data.items);
    } catch (err: any)
    {
      console.error("Error loading promocodes:", err);
      setError(err.message || "Ошибка загрузки промокодов");
      toast.error("Не удалось загрузить промокоды");
    } finally
    {
      setLoading(false);
    }
  }, []);

  useEffect(() =>
  {
    loadPromocodes();
  }, [loadPromocodes]);

  const handleRefreshData = useCallback(() =>
  {
    loadPromocodes();
  }, [loadPromocodes]);

  const handleCreate = useCallback(() =>
  {
    navigate("/promocodes/create");
  }, [navigate]);

  const handleViewHistory = useCallback((promocode: Promocode) =>
  {
    navigate(`/promocodes/${promocode.id}/history`);
  }, [navigate]);

  const handleFilterChange = useCallback((key: string, value: any) =>
  {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() =>
  {
    setFilters({ search: '' });
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) =>
  {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) =>
  {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const formatDate = (dateString: string | null | undefined): string =>
  {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("ru-RU");
  };

  const formatDuration = (days: number): string =>
  {
    return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`;
  };

  const getStatusBadge = (promocode: Promocode) =>
  {
    const now = new Date();
    const expired = promocode.expires_at && new Date(promocode.expires_at) < now;
    const exhausted = promocode.activations_count >= promocode.max_activations;

    if (expired)
    {
      return <Badge type="error">Истек</Badge>;
    }
    if (exhausted)
    {
      return <Badge type="warning">Исчерпан</Badge>;
    }
    return <Badge type="success">Активен</Badge>;
  };

  const filteredPromocodes = promocodes.filter(promo =>
    !filters.search ||
    promo.code.toLowerCase().includes(filters.search.toLowerCase()) ||
    (promo.description && promo.description.toLowerCase().includes(filters.search.toLowerCase()))
  );

  const totalRecords = filteredPromocodes.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedPromocodes = filteredPromocodes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    {
      header: "Код",
      accessor: "code",
      width: '15%',
      render: (value: string) => (
        <span className="font-mono font-semibold text-gray-900">{value}</span>
      ),
    },
    {
      header: "Описание",
      accessor: "description",
      width: '20%',
      render: (value: string) => value || "—",
    },
    {
      header: "Длительность",
      accessor: "duration_days",
      width: '15%',
      render: (value: number) => formatDuration(value),
    },
    {
      header: "Активации",
      accessor: "activations_count",
      width: '15%',
      render: (value: number, item: Promocode) => (
        <span className="font-medium">
          {value} / {item.max_activations}
        </span>
      ),
    },
    {
      header: "Истекает",
      accessor: "expires_at",
      width: '15%',
      render: (value: string | null) => formatDate(value),
    },
    {
      header: "Создан",
      accessor: "created_at",
      width: '15%',
      render: (value: string) => formatDate(value),
    },
    {
      header: "Статус",
      accessor: "status",
      width: '10%',
      render: (_: any, item: Promocode) => getStatusBadge(item),
    },
  ];

  const tableActions = {
    history: (item: Promocode) => handleViewHistory(item)
  };

  const filterDisplayText = useCallback(() =>
  {
    if (!filters.search) return null;
    return `Найдено ${totalRecords} промокодов (поиск: "${filters.search}")`;
  }, [filters.search, totalRecords]);

  if (error)
  {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">Ошибка загрузки данных</div>
          <Button variant="secondary" onClick={loadPromocodes}>
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ListContainer>
      <ListHeader
        title="Промокоды"
        filterDisplayText={filterDisplayText()}
        actionButtons={[
          {
            label: 'Создать промокод',
            onClick: handleCreate,
            icon: Plus,
            variant: 'primary',
            disabled: loading
          }
        ]}
      >
        <Button
          variant="secondary"
          onClick={handleRefreshData}
          disabled={loading}
          icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          {loading ? 'Загрузка...' : 'Обновить'}
        </Button>
      </ListHeader>

      <ListTable
        data={paginatedPromocodes}
        columns={columns}
        loading={loading}
        emptyMessage="Промокоды не найдены"
        selectable={false}
        actions={tableActions}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        totalRecords={totalRecords}
      // showAdvancedPagination={false}
      />
    </ListContainer>
  );
};