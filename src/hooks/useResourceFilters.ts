import { useMemo, useState, useCallback } from "react";

interface UseResourceFiltersOptions<T> {
  initialFilters: any;
  data: T[];
  filterFn: (item: T, filters: any) => boolean;
  defaultPageSize?: number;
}

export function useResourceFilters<T>({
  initialFilters,
  data,
  filterFn,
  defaultPageSize = 10,
}: UseResourceFiltersOptions<T>) {
  const [filters, setFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filteredData = useMemo(() => {
    return data.filter((item) => filterFn(item, filters));
  }, [data, filters, filterFn]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(initialFilters);
    setCurrentPage(1);
  }, [initialFilters]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const activeFiltersCount = useMemo(() => {
    const filterKeys = Object.keys(filters);
    return filterKeys.filter((key) => {
      const value = filters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim() !== "";
      return Boolean(value);
    }).length;
  }, [filters]);

  return {
    filters,
    currentPage,
    pageSize,
    filteredData,
    paginatedData,
    totalRecords,
    totalPages,
    activeFiltersCount,
    handleFilterChange,
    handleResetFilters,
    handlePageChange,
    handlePageSizeChange,
    setFilters,
    setCurrentPage,
    setPageSize,
  };
}
