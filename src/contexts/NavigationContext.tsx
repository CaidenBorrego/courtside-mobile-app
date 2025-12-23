import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types';

interface NavigationContextType {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  navigate: (name: keyof RootStackParamList, params?: any) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const navigate = (name: keyof RootStackParamList, params?: any) => {
    if (navigationRef.current?.isReady()) {
      // @ts-ignore - React Navigation typing issue with dynamic navigation
      navigationRef.current.navigate(name, params);
    }
  };

  const goBack = () => {
    if (navigationRef.current?.isReady() && navigationRef.current.canGoBack()) {
      navigationRef.current.goBack();
    }
  };

  const canGoBack = () => {
    return navigationRef.current?.canGoBack() ?? false;
  };

  const contextValue: NavigationContextType = {
    navigationRef,
    navigate,
    goBack,
    canGoBack,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;
