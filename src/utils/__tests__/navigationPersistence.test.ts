import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveNavigationState,
  loadNavigationState,
  clearNavigationState,
} from '../navigationPersistence';
import { NavigationState } from '@react-navigation/native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('navigationPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveNavigationState', () => {
    it('should save navigation state to AsyncStorage', async () => {
      const mockState: NavigationState = {
        key: 'root',
        index: 0,
        routes: [{ key: 'home', name: 'Home' }],
        routeNames: ['Home'],
        stale: false,
        type: 'stack',
      };

      await saveNavigationState(mockState);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@navigation_state',
        JSON.stringify(mockState)
      );
    });

    it('should not save if state is undefined', async () => {
      await saveNavigationState(undefined);

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockState: NavigationState = {
        key: 'root',
        index: 0,
        routes: [{ key: 'home', name: 'Home' }],
        routeNames: ['Home'],
        stale: false,
        type: 'stack',
      };

      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      // Should not throw
      await expect(saveNavigationState(mockState)).resolves.not.toThrow();
    });
  });

  describe('loadNavigationState', () => {
    it('should load navigation state from AsyncStorage', async () => {
      const mockState: NavigationState = {
        key: 'root',
        index: 0,
        routes: [{ key: 'home', name: 'Home' }],
        routeNames: ['Home'],
        stale: false,
        type: 'stack',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockState)
      );

      const result = await loadNavigationState();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@navigation_state');
      expect(result).toEqual(mockState);
    });

    it('should return undefined if no state is saved', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await loadNavigationState();

      expect(result).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const result = await loadNavigationState();

      expect(result).toBeUndefined();
    });
  });

  describe('clearNavigationState', () => {
    it('should clear navigation state from AsyncStorage', async () => {
      await clearNavigationState();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@navigation_state');
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      // Should not throw
      await expect(clearNavigationState()).resolves.not.toThrow();
    });
  });
});
