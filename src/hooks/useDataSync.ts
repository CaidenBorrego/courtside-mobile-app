import { useState, useEffect, useCallback } from 'react';
import { cacheData, getCachedData, CacheOptions } from '../utils/cache';
import { useNetworkStatus } from '../utils/networkStatus';

/**
 * Hook for data synchronization with offline support
 */
export function useDataSync<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  cacheOptions: CacheOptions = { expiryMinutes: 60 }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const { isOffline } = useNetworkStatus();

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from cache first
      if (!forceRefresh) {
        const cachedData = await getCachedData<T>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
          setLoading(false);

          // If offline, stop here
          if (isOffline) {
            return;
          }
        }
      }

      // If online, fetch fresh data
      if (!isOffline) {
        const freshData = await fetchFn();
        setData(freshData);
        setIsFromCache(false);
        
        // Cache the fresh data
        await cacheData(cacheKey, freshData, cacheOptions);
      }
    } catch (err) {
      setError(err as Error);
      
      // If fetch fails and we don't have cached data, try to load from cache
      if (!data) {
        const cachedData = await getCachedData<T>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, cacheOptions, isOffline, data]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (!isOffline && isFromCache) {
      loadData(true);
    }
  }, [isOffline, isFromCache]);

  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  return {
    data,
    loading,
    error,
    isFromCache,
    refresh,
  };
}
