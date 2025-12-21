import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, DataTable, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Division, TeamStats, Game, RootStackParamList } from '../../../types';
import { useTournament } from '../../../contexts/TournamentContext';
import { tournamentDataCache } from '../../../services/cache/TournamentDataCache';
import DivisionSelector from '../../../components/tournament/DivisionSelector';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface StandingsTabProps {
  tournamentId: string;
}

const StandingsTab: React.FC<StandingsTabProps> = ({ tournamentId }) => {
  const navigation = useNavigation<NavigationProp>();
  const { selectedDivisionId, setSelectedDivisionId, divisions, divisionsLoading } = useTournament();
  const [standingsByDivision, setStandingsByDivision] = useState<Map<string, TeamStats[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLoadedRef = useRef(false);

  const loadStandings = useCallback(async () => {
    if (dataLoadedRef.current || divisions.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const standings = await tournamentDataCache.getStandings(tournamentId, divisions);
      setStandingsByDivision(standings);
      dataLoadedRef.current = true;

    } catch (err) {
      console.error('Error loading standings:', err);
      setError('Failed to load standings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [divisions, tournamentId]);

  useEffect(() => {
    loadStandings();
  }, [loadStandings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dataLoadedRef.current = false;
    tournamentDataCache.forceRefresh(tournamentId);
    
    try {
      await loadStandings();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [tournamentId, loadStandings]);

  // Note: Standings are automatically updated via cache service when games change

  const handleTeamPress = (teamName: string) => {
    if (selectedDivisionId) {
      navigation.navigate('TeamDetail', { teamName, divisionId: selectedDivisionId });
    }
  };

  if (divisionsLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading standings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleLarge" style={styles.errorTitle}>
          Oops! Something went wrong
        </Text>
        <Text variant="bodyMedium" style={styles.errorText}>
          {error}
        </Text>
      </View>
    );
  }

  if (divisions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="podium-outline" size={64} color="#D1D5DB" />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No Divisions
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          This tournament doesn&apos;t have any divisions yet.
        </Text>
      </View>
    );
  }

  const showDivisionHeaders = divisions.length > 1;

  // If only one division, render standings directly without card wrapper
  if (!showDivisionHeaders && divisions.length === 1) {
    const division = divisions[0];
    const standings = standingsByDivision.get(division.id) || [];

    return (
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      >
        {standings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="podium-outline" size={64} color="#D1D5DB" />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Teams Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              No teams have played games in this division yet.
            </Text>
          </View>
        ) : (
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={styles.rankColumn}>Rank</DataTable.Title>
              <DataTable.Title style={styles.teamColumn}>Team</DataTable.Title>
              <DataTable.Title numeric style={styles.recordColumn}>W-L</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>PF</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>PA</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>Diff</DataTable.Title>
            </DataTable.Header>

            {standings.map((standing) => (
              <DataTable.Row key={standing.teamName}>
                <DataTable.Cell style={styles.rankColumn}>
                  <Text style={styles.rankText}>{standing.rank}</Text>
                </DataTable.Cell>
                <DataTable.Cell style={styles.teamColumn}>
                  <TouchableOpacity 
                    onPress={() => handleTeamPress(standing.teamName, division.id)}
                    activeOpacity={0.7}
                  >
                    <Text 
                      variant="bodyMedium" 
                      style={styles.teamNameTappable}
                      numberOfLines={1}
                    >
                      {standing.teamName}
                    </Text>
                  </TouchableOpacity>
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.recordColumn}>
                  {standing.wins}-{standing.losses}
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>
                  {standing.pointsFor}
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>
                  {standing.pointsAgainst}
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>
                  {standing.pointDifferential > 0 ? '+' : ''}
                  {standing.pointDifferential}
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
      </ScrollView>
    );
  }

  // Multiple divisions - show collapsible cards
  const selectedStandings = selectedDivisionId ? (standingsByDivision.get(selectedDivisionId) || []) : [];

  return (
    <View style={styles.container}>
      <DivisionSelector
        divisions={divisions}
        selectedDivisionId={selectedDivisionId}
        onSelectDivision={setSelectedDivisionId}
      />
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      >
        {selectedStandings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="podium-outline" size={64} color="#D1D5DB" />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Teams Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              No teams have played games in this division yet.
            </Text>
          </View>
        ) : (
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={styles.rankColumn}>Rank</DataTable.Title>
              <DataTable.Title style={styles.teamColumn}>Team</DataTable.Title>
              <DataTable.Title numeric style={styles.recordColumn}>W-L</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>PF</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>PA</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>Diff</DataTable.Title>
            </DataTable.Header>

            {selectedStandings.map((standing) => (
              <DataTable.Row key={standing.teamName}>
                <DataTable.Cell style={styles.rankColumn}>
                  <Text style={styles.rankText}>{standing.rank}</Text>
                </DataTable.Cell>
                <DataTable.Cell style={styles.teamColumn}>
                  <Text 
                    variant="bodyMedium" 
                    style={styles.teamNameTappable}
                    numberOfLines={1}
                    onPress={() => handleTeamPress(standing.teamName)}
                  >
                    {standing.teamName}
                  </Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.recordColumn}>
                  {standing.wins}-{standing.losses}
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>
                  {standing.pointsFor}
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>
                  {standing.pointsAgainst}
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>
                  {standing.pointDifferential > 0 ? '+' : ''}
                  {standing.pointDifferential}
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 16,
  },
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
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#6B7280',
  },
  divisionCard: {
    marginBottom: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  divisionTitle: {
    fontWeight: 'bold',
  },
  divisionSubtitle: {
    color: '#6B7280',
    marginTop: 4,
  },
  expandedContent: {
    paddingTop: 0,
  },
  divider: {
    marginVertical: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  rankColumn: {
    flex: 0.45,
    justifyContent: 'center',
    marginLeft: -8,
  },
  rankText: {
    textAlign: 'left',
  },
  teamColumn: {
    flex: 2,
    marginLeft: 8,
  },
  recordColumn: {
    flex: 0.8,
  },
  statColumn: {
    flex: 0.6,
  },
  teamNameTappable: {
    fontWeight: '500',
    color: '#000000',
    textDecorationLine: 'underline',
  },
});

export default StandingsTab;
