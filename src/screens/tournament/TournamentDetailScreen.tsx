import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RouteProp, useRoute } from '@react-navigation/native';
import { firebaseService } from '../../services/firebase';
import { Tournament, RootStackParamList } from '../../types';
import { TournamentProvider } from '../../contexts/TournamentContext';
import OverviewTab from './tabs/OverviewTab';
import ScheduleTab from './tabs/ScheduleTab';
import PoolsAndBracketsTab from './tabs/PoolsAndBracketsTab';
import StandingsTab from './tabs/StandingsTab';

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
        <ActivityIndicator size="large" color="#000000" />
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
    <TournamentProvider tournamentId={tournamentId}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {
            backgroundColor: '#000000',
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
          name="Overview" 
          options={{ tabBarLabel: 'Overview' }}
        >
          {() => <OverviewTab tournament={tournament} />}
        </Tab.Screen>
        <Tab.Screen 
          name="Schedule" 
          options={{ tabBarLabel: 'Schedule' }}
        >
          {() => <ScheduleTab tournamentId={tournamentId} />}
        </Tab.Screen>
        <Tab.Screen 
          name="PoolsAndBrackets" 
          options={{ tabBarLabel: 'Pools & Brackets' }}
        >
          {() => <PoolsAndBracketsTab tournamentId={tournamentId} />}
        </Tab.Screen>
        <Tab.Screen 
          name="Standings" 
          options={{ tabBarLabel: 'Standings' }}
        >
          {() => <StandingsTab tournamentId={tournamentId} />}
        </Tab.Screen>
      </Tab.Navigator>
    </TournamentProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    textAlign: 'center',
  },
});

export default TournamentDetailScreen;
