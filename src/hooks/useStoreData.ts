import { useCallback, useEffect, useState } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export const useStoreData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    loading: dashboardLoading,
    error: dashboardError,
    fetchDashboard,
    getSubjects,
    getTopics,
    getTrainers,
    getEntOptions,
    getSubjectById,
    getTopicById,
    getTrainerById,
    getEntOptionById,
  } = useDashboardStore();

  const loadInitialData = useCallback(async () => {
    if (data) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await fetchDashboard();
    } catch (err: any) {
      console.error("Error loading initial data:", err);
      setError(err.message || "Ошибка загрузки данных");
    } finally {
      setIsLoading(false);
    }
  }, [data, fetchDashboard]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    isLoading: isLoading || dashboardLoading,
    error: error || dashboardError,
    data,
    subjects: getSubjects(),
    topics: getTopics(),
    trainers: getTrainers(),
    entOptions: getEntOptions(),
    getSubjectById,
    getTopicById,
    getTrainerById,
    getEntOptionById,
    refreshDashboard: fetchDashboard,
  };
};
