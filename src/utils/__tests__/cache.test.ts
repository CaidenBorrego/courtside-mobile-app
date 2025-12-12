import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheData, getCachedData, clearCache, clearAllCache, CacheKeys } from '../cache';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheData', () => {
    it('should cache data successfully', async () => {
      const testData = { id: '1', name: 'Test' };
      
      await cacheData('test-key', testData);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@courtside_cache:test-key',
        JSON.stringify(testData)
      );
    });

    it('should set expiry time when specified', async () => {
      const testData = { id: '1', name: 'Test' };
      
      await cacheData('test-key', testData, { expiryMinutes: 30 });
      
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@courtside_cache:test-key',
        JSON.stringify(testData)
      );
    });
  });

  describe('getCachedData', () => {
    it('should retrieve cached data', async () => {
      const testData = { id: '1', name: 'Test' };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(testData));
      
      const result = await getCachedData('test-key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const result = await getCachedData('test-key');
      
      expect(result).toBeNull();
    });

    it('should return null for expired cache', async () => {
      const pastTime = (Date.now() - 1000).toString();
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(pastTime)
        .mockResolvedValueOnce(JSON.stringify({ id: '1' }));
      
      const result = await getCachedData('test-key');
      
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear specific cache', async () => {
      await clearCache('test-key');
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@courtside_cache:test-key');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@courtside_cache_expiry:test-key');
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cached data', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@courtside_cache:key1',
        '@courtside_cache:key2',
        '@other:key',
      ]);
      
      await clearAllCache();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@courtside_cache:key1',
        '@courtside_cache:key2',
      ]);
    });
  });

  describe('CacheKeys', () => {
    it('should generate correct cache keys', () => {
      expect(CacheKeys.TOURNAMENTS).toBe('tournaments');
      expect(CacheKeys.TOURNAMENT('123')).toBe('tournament_123');
      expect(CacheKeys.GAMES('456')).toBe('games_456');
      expect(CacheKeys.GAME('789')).toBe('game_789');
    });
  });
});
