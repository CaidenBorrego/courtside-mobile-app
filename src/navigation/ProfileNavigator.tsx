import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileScreen, ManageFollowingScreen, SearchTeamsScreen } from '../screens';
import { ProfileStackParamList } from '../types';

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ProfileHome"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: false }}
      />
      <Stack.Screen
        name="ManageTeams"
        options={{ title: 'Manage Teams' }}
      >
        {() => <ManageFollowingScreen type="teams" />}
      </Stack.Screen>
      <Stack.Screen
        name="ManageGames"
        options={{ title: 'Manage Games' }}
      >
        {() => <ManageFollowingScreen type="games" />}
      </Stack.Screen>
      <Stack.Screen
        name="SearchTeams"
        component={SearchTeamsScreen}
        options={{ title: 'Follow Teams' }}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
