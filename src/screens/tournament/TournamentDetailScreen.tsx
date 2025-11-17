import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RouteProp, useRoute } from '@react-navigation/native';
import { firebaseService } from '../../services/firebase';
import { Tournament, RootStackParamList } from '../../types';
import DivisionsTab from './tabs/DivisionsTab';
import ScheduleTab from './tabs/ScheduleTab';
import LocationsTab from './tabs/LocationsTab';

type TournamentDetailRouteProp = RouteProp<RootStackParamList, 'TournamentDetail'>;

const Tab = createMaterialTopTabNavigator();

const TournamentDetailScreen: React.FC = () => {
  const route = useRoute<TournamentDetailRouteProp>();
  const { tournamentId } = route.params;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up real-time listener for tournament
    const unsubscribe = firebaseService.onTournamentSnapshot(tournamentId, (updatedTournament) => {
      if (updatedTournament) {
        setTournament(updatedTournament);
        setError(null);
      } else {
        setError('Tournament not found');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [tournamentId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading tournament...</Text>
      </View>
    );
  }

  if (error || !tournament) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleLarge" style={styles.errorTitle}>
          {error || 'Tournament not found'}
        </Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: '#757575',
        tabBarIndicatorStyle: {
          backgroundColor: '#6200ee',
          height: 3,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          textTransform: 'none',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          elevation: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Divisions" 
        children={() => <DivisionsTab tournamentId={tournamentId} />}
        options={{ tabBarLabel: 'Divisions' }}
      />
      <Tab.Screen 
        name="Schedule" 
        children={() => <ScheduleTab tournamentId={tournamentId} />}
        options={{ tabBarLabel: 'Schedule' }}
      />
      <Tab.Screen 
        name="Locations" 
        children={() => <LocationsTab tournamentId={tournamentId} />}
        options={{ tabBarLabel: 'Locations' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    textAlign: 'center',
  },
});

export default TournamentDetailScreen;
