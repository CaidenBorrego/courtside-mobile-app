import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { Colors } from './index';

export { Colors };

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.light.text,
    onPrimary: Colors.light.background,
    secondary: Colors.light.textSecondary,
    onSecondary: Colors.light.background,
    background: Colors.light.background,
    onBackground: Colors.light.text,
    surface: Colors.light.card,
    onSurface: Colors.light.text,
    surfaceVariant: Colors.light.backgroundSecondary,
    onSurfaceVariant: Colors.light.textSecondary,
    outline: Colors.light.border,
    error: Colors.light.error,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.dark.text,
    onPrimary: Colors.dark.background,
    secondary: Colors.dark.textSecondary,
    onSecondary: Colors.dark.background,
    background: Colors.dark.background,
    onBackground: Colors.dark.text,
    surface: Colors.dark.card,
    onSurface: Colors.dark.text,
    surfaceVariant: Colors.dark.backgroundSecondary,
    onSurfaceVariant: Colors.dark.textSecondary,
    outline: Colors.dark.border,
    error: Colors.dark.error,
  },
};