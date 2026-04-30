import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ResourceLoadingOptions<T> {
  id?: string | number;
  storeIdGetter?: () => T | undefined;
  apiFetcher?: (id: string | number) => Promise<T>;
  resourceName?: string;
}

export function useResourceLoading<T>({
  id,
  storeIdGetter,
  apiFetcher,
  resourceName = "ресурс",
}: ResourceLoadingOptions<T>) {
  const [resource, setResource] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResource = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      let resourceData: T | undefined;
      if (storeIdGetter) resourceData = storeIdGetter();
      if (!resourceData && apiFetcher) resourceData = await apiFetcher(id);
      if (resourceData) setResource(resourceData);
      else setError(`${resourceName} не найден`);
    } catch (error: any) {
      console.error(`Error loading ${resourceName}:`, error);
      setError(`Ошибка загрузки ${resourceName}`);
      toast.error(`Не удалось загрузить ${resourceName}`);
    } finally {
      setLoading(false);
    }
  }, [id, storeIdGetter, apiFetcher, resourceName]);

  useEffect(() => {
    loadResource();
  }, [loadResource]);

  const refresh = useCallback(async () => {
    await loadResource();
  }, [loadResource]);

  return {
    resource,
    loading,
    error,
    refresh,
    setResource,
  };
}
