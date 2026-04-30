import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { useInitialData } from "@/hooks/useInitialData";
import { useDashboardInit } from "@/hooks/useDashboardInit";
import AuthProvider from "./providers/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const DataInitializer: React.FC = () =>
{
  useDashboardInit();
  useInitialData();
  return null;
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataInitializer />
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);