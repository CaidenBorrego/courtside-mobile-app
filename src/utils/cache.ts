import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@courtside_cache:';
const CACHE_EXPIRY_KEY = '@courtside_cache_expiry:';

export interface CacheOptions {
  expiryMinutes?: number;
}

/**
 * Cache data with optional expiry time
 */
export async function cacheData<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const dataString = JSON.stringify(data);
    await AsyncStorage.setItem(cacheKey, dataString);

    // Set expiry if specified
    if (options.expiryMinutes) {
      const expiryTime = Date.now() + options.expiryMinutes * 60 * 1000;
      const expiryKey = CACHE_EXPIRY_KEY + key;
      await AsyncStorage.setItem(expiryKey, expiryTime.toString());
    }
  } catch (error) {
    console.error('Error caching data:', error);
  }
}

/**
 * Retrieve cached data
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_KEY + key;

    // Check if cache has expired
    const expiryTimeString = await AsyncStorage.getItem(expiryKey);
    if (expiryTimeString) {
      const expiryTime = parseInt(expiryTimeString, 10);
      if (Date.now() > expiryTime) {
        // Cache expired, remove it
        await AsyncStorage.removeItem(cacheKey);
        await AsyncStorage.removeItem(expiryKey);
        return null;
      }
    }

    // Get cached data
    const dataString = await AsyncStorage.getItem(cacheKey);
    if (!dataString) {
      return null;
    }

    return JSON.parse(dataString) as T;
  } catch (error) {
    console.error('Error retrieving cached data:', error);
    return null;
  }
}

/**
 * Clear specific cached data
 */
export async function clearCache(key: string): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_KEY + key;
    await AsyncStorage.removeItem(cacheKey);
    await AsyncStorage.removeItem(expiryKey);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      key => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_KEY)
    );
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}

/**
 * Get cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating cache size:', error);
    return 0;
  }
}

/**
 * Cache keys for different data types
 */
export const CacheKeys = {
  TOURNAMENTS: 'tournaments',
  TOURNAMENT: (id: string) => `tournament_${id}`,
  GAMES: (tournamentId: string) => `games_${tournamentId}`,
  GAME: (id: string) => `game_${id}`,
  DIVISIONS: (tournamentId: string) => `divisions_${tournamentId}`,
  USER_PROFILE: (uid: string) => `user_profile_${uid}`,
  LOCATIONS: 'locations',
};
