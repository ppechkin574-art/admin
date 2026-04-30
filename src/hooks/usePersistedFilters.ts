import { useState, useEffect } from 'react';

export const usePersistedFilters = <T>(
  key: string,
  initialValue: T
) => {
  const [filters, setFilters] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(filters));
  }, [filters, key]);

  return [filters, setFilters] as const;
};