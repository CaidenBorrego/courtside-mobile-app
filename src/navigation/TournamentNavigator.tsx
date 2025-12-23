import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TournamentStackParamList } from '../types';

const Stack = createStackNavigator<TournamentStackParamList>();

// Placeholder components - will be implemented in later tasks
const TournamentListScreen: React.FC = () => null;
const TournamentDetailScreen: React.FC = () => null;
const GameDetailScreen: React.FC = () => null;

const TournamentNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="TournamentList"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="TournamentList" 
        component={TournamentListScreen}
        options={{
          title: 'Tournaments',
        }}
      />
      <Stack.Screen 
        name="TournamentDetail" 
        component={TournamentDetailScreen}
        options={{
          title: 'Tournament Details',
        }}
      />
      <Stack.Screen 
        name="GameDetail" 
        component={GameDetailScreen}
        options={{
          title: 'Game Details',
        }}
      />
    </Stack.Navigator>
  );
};

export default TournamentNavigator;
