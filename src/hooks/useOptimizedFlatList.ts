import { useCallback, useMemo } from 'react';

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
