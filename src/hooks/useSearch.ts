import { useState, useMemo } from 'react';

export const useSearch = <T>(items: T[], searchFields: (keyof T)[] | keyof T) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const fields = Array.isArray(searchFields) ? searchFields : [searchFields];
    
    return items.filter(item =>
      fields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [items, searchTerm, searchFields]);

  const clearSearch = () => setSearchTerm('');

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    clearSearch
  };
};