/**
 * Custom hook for theme management
 * Handles light/dark mode and provides theme colors
 */

import { useColorScheme } from 'react-native';
import { Colors } from '../constants';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  colors: typeof Colors.light;
  isDark: boolean;
}

export const useTheme = (): Theme => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
};

export default useTheme;
