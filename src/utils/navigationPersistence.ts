import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationState } from '@react-navigation/native';

const NAVIGATION_STATE_KEY = '@navigation_state';

export const saveNavigationState = async (state: NavigationState | undefined): Promise<void> => {
  try {
    if (state) {
      const jsonState = JSON.stringify(state);
      await AsyncStorage.setItem(NAVIGATION_STATE_KEY, jsonState);
    }
  } catch (error) {
    console.error('Error saving navigation state:', error);
  }
};

export const loadNavigationState = async (): Promise<NavigationState | undefined> => {
  try {
    const jsonState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
    return jsonState ? JSON.parse(jsonState) : undefined;
  } catch (error) {
    console.error('Error loading navigation state:', error);
    return undefined;
  }
};

export const clearNavigationState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
  } catch (error) {
    console.error('Error clearing navigation state:', error);
  }
};
