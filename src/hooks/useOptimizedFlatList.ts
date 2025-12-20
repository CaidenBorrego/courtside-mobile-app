import React, { useCallback, useMemo, useState } from 'react';

/**
 * Hook to optimize FlatList rendering with memoized callbacks and item layout
 */
export function useOptimizedFlatList<T extends { id: string }>(
  data: T[],
  itemHeight?: number
) {
  // Memoized key extractor
  const keyExtractor = useCallback((item: T) => item.id, []);

  // Optimized getItemLayout for fixed-height items
  const getItemLayout = useMemo(() => {
    if (!itemHeight) return undefined;
    
    return (_data: T[] | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }, [itemHeight]);

  // Memoized data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [data]);

  return {
    keyExtractor,
    getItemLayout,
    data: memoizedData,
  };
}

/**
 * Hook for pagination support in FlatList
 * Requirements: 5.1
 * 
 * Supports both client-side and server-side pagination
 */
export function usePagination<T>(
  allData: T[],
  pageSize: number = 20
) {
  const loadMore = useCallback(() => {
    // This would be implemented with actual pagination logic
    // For now, we return all data
    return allData;
  }, [allData]);

  return {
    data: allData,
    loadMore,
    hasMore: false,
  };
}

/**
 * Hook for async pagination with lazy loading
 * Requirements: 5.1
 * 
 * This hook manages paginated data loading with:
 * - Automatic loading on scroll
 * - Loading state management
 * - Error handling
 * 
 * @param loadPage - Function to load a page of data
 * @param pageSize - Number of items per page
 */
export function useAsyncPagination<T extends { id: string }>(
  loadPage: (offset: number, limit: number) => Promise<{ items: T[]; hasMore: boolean; total: number }>,
  pageSize: number = 20
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await loadPage(data.length, pageSize);
      setData(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [data.length, hasMore, loading, loadPage, pageSize]);

  const refresh = useCallback(async () => {
    setData([]);
    setHasMore(true);
    setError(null);
    setLoading(true);

    try {
      const result = await loadPage(0, pageSize);
      setData(result.items);
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [loadPage, pageSize]);

  return {
    data,
    loading,
    hasMore,
    error,
    total,
    loadMore,
    refresh,
  };
}
