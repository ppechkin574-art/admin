import { useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import useKeycloakAuth from "./useKeycloakAuth";

export const useDashboardInit = () => {
  const { fetchDashboard, loading, error } = useDashboardStore();
  const { isInitialized, isAuthenticated } = useKeycloakAuth();
  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) return;
    fetchDashboard();
  }, [fetchDashboard, isAuthenticated, isInitialized]);
  return { loading, error };
};
