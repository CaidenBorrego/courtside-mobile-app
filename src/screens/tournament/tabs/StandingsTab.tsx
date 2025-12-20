import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Card, DataTable, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { teamStatsService } from '../../../services/tournament/TeamStatsService';
import { firebaseService } from '../../../services/firebase';
import { Division, TeamStats, Game, RootStackParamList } from '../../../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface StandingsTabProps {
  tournamentId: string;
}

const StandingsTab: React.FC<StandingsTabProps> = ({ tournamentId }) => {
  const navigation = useNavigation<NavigationProp>();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [standingsByDivision, setStandingsByDivision] = useState<Map<string, TeamStats[]>>(new Map());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recalculate standings for all divisions
  const recalculateStandings = useCallback(async (divisionsList: Division[]) => {
    const standingsMap = new Map<string, TeamStats[]>();

    for (const division of divisionsList) {
      const standings = await teamStatsService.getDivisionStandings(division.id);
      standingsMap.set(division.id, standings);
    }

    setStandingsByDivision(standingsMap);
  }, []);

  useEffect(() => {
    loadStandings();
  }, [tournamentId]);

  // Auto-expand if there's only one division
  useEffect(() => {
    if (divisions.length === 1) {
      setExpandedDivisions(new Set([divisions[0].id]));
    }
  }, [divisions]);

  // Subscribe to game changes for real-time updates
  useEffect(() => {
    if (divisions.length === 0) return;

    const unsubscribe = firebaseService.onGamesByTournamentSnapshot(
      tournamentId,
      async (games: Game[]) => {
        // Recalculate standings when games change
        await recalculateStandings(divisions);
      },
      (error) => {
        console.error('Error in games subscription:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tournamentId, divisions, recalculateStandings]);

  const loadStandings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load divisions
      const divisionsData = await firebaseService.getDivisionsByTournament(tournamentId);
      setDivisions(divisionsData);

      // Load standings for each division
      await recalculateStandings(divisionsData);

    } catch (err) {
      console.error('Error loading standings:', err);
      setError('Failed to load standings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDivisionExpanded = (divisionId: string) => {
    const newExpanded = new Set(expandedDivisions);
    if (newExpanded.has(divisionId)) {
      newExpanded.delete(divisionId);
    } else {
      newExpanded.add(divisionId);
    }
    setExpandedDivisions(newExpanded);
  };

  const handleTeamPress = (teamName: string, divisionId: string) => {
    navigation.navigate('TeamDetail', { teamName, divisionId });
  };

  const renderDivisionCard = (division: Division) => {
    const isExpanded = expandedDivisions.has(division.id);
    const standings = standingsByDivision.get(division.id) || [];

    return (
      <Card key={division.id} style={styles.divisionCard} mode="elevated">
        <TouchableOpacity onPress={() => toggleDivisionExpanded(division.id)} activeOpacity={0.7}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text variant="titleLarge" style={styles.divisionTitle}>
                  {division.name}
                </Text>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color="#6B7280" 
              />
            </View>
            <Text variant="bodySmall" style={styles.divisionSubtitle}>
              {standings.length} team{standings.length !== 1 ? 's' : ''}
            </Text>
          </Card.Content>
        </TouchableOpacity>

        {isExpanded && (
          <Card.Content style={styles.expandedContent}>
            <Divider style={styles.divider} />
            {standings.length === 0 ? (
              <Text variant="bodySmall" style={styles.emptyText}>
                No teams in this division yet
              </Text>
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
                      {standing.rank}
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
          </Card.Content>
        )}
      </Card>
    );
  };

  if (loading) {
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
          This tournament doesn't have any divisions yet.
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
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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
                  {standing.rank}
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
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {divisions.map(renderDivisionCard)}
    </ScrollView>
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
    flex: 0.5,
  },
  teamColumn: {
    flex: 2,
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
