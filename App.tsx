import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { NavigationProvider } from './src/contexts/NavigationContext';
import { RootNavigator } from './src/navigation';
import { lightTheme } from './src/constants/theme';

export default function App() {
  return (
    <PaperProvider theme={lightTheme}>
      <NavigationProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </NavigationProvider>
    </PaperProvider>
  );
}
