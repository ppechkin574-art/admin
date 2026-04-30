import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";

const formatErrorMessage = (error: any): string => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) {
      return detail
        .map((err: any) => {
          if (typeof err === "string") return err;
          if (err.msg) return `${err.loc?.join(".")}: ${err.msg}`;
          return JSON.stringify(err);
        })
        .join("; ");
    }
    if (typeof detail === "string") return detail;
    return JSON.stringify(detail);
  }
  return error.message || "Неизвестная ошибка";
};

export const useApiErrorHandler = () => {
  const [apiError, setApiError] = useState<string | null>(null);

  const handleApiError = useCallback(
    (error: any, defaultMessage: string = "Произошла ошибка") => {
      console.error("API Error:", error);

      const errorMessage = formatErrorMessage(error) || defaultMessage;
      setApiError(errorMessage);
      toast.error(errorMessage);

      return {
        errorMessage,
        isNotFound: error.response?.status === 404,
        isServerError: error.response?.status >= 500,
      };
    },
    [],
  );

  const clearError = useCallback(() => {
    setApiError(null);
  }, []);

  return {
    apiError,
    handleApiError,
    clearError,
  };
};
