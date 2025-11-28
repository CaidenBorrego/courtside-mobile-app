import React, { useState, useEffect } from 'react';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { saveNavigationState, loadNavigationState } from '../utils/navigationPersistence';
import linking from './linking';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { TournamentDetailScreen } from '../screens/tournament';
import { GameDetailScreen } from '../screens/game';
import { ManageTournamentScreen, BulkImportScreen } from '../screens/admin';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const { navigationRef } = useNavigation();
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<NavigationState | undefined>();

  // Load persisted navigation state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedState = await loadNavigationState();
        if (savedState) {
          setInitialState(savedState);
        }
      } catch (error) {
        console.error('Error restoring navigation state:', error);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  // Show loading screen while checking auth state or restoring navigation
  if (loading || !isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      initialState={initialState}
      onStateChange={(state) => {
        // Persist navigation state on change
        saveNavigationState(state);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen 
              name="Main" 
              component={MainNavigator}
            />
            {/* Nested navigation for tournament and game details */}
            <Stack.Screen 
              name="TournamentDetail" 
              component={TournamentDetailScreen}
              options={{
                headerShown: true,
                title: 'Tournament Details',
                headerStyle: {
                  backgroundColor: '#6200ee',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="GameDetail" 
              component={GameDetailScreen}
              options={{
                headerShown: true,
                title: 'Game Details',
                headerStyle: {
                  backgroundColor: '#6200ee',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="ManageTournament" 
              component={ManageTournamentScreen}
              options={{
                headerShown: true,
                title: 'Manage Tournament',
                headerStyle: {
                  backgroundColor: '#6200ee',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="BulkImport" 
              component={BulkImportScreen}
              options={{
                headerShown: true,
                title: 'Bulk Import',
                headerStyle: {
                  backgroundColor: '#6200ee',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default RootNavigator;