import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen, AdminPanelScreen } from '../screens';
import ProfileNavigator from './ProfileNavigator';
import { MainTabParamList, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === UserRole.ADMIN;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 25,
          paddingTop: 10,
          height: 85,
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 5,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'CourtSide',
          tabBarLabel: 'Tournaments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="basketball-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminPanelScreen}
          options={{
            title: 'Admin Panel',
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default MainNavigator;