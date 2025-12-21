import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Divider, DataTable } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Pool, Bracket, PoolStanding, Game, Division, RootStackParamList } from '../../../types';
import { useTournament } from '../../../contexts/TournamentContext';
import { tournamentDataCache } from '../../../services/cache/TournamentDataCache';
import DivisionSelector from '../../../components/tournament/DivisionSelector';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface PoolsAndBracketsTabProps {
  tournamentId: string;
}

const PoolsAndBracketsTab: React.FC<PoolsAndBracketsTabProps> = ({ tournamentId }) => {
  const navigation = useNavigation<NavigationProp>();
  const { selectedDivisionId, setSelectedDivisionId, divisions, divisionsLoading } = useTournament();
  const [poolsByDivision, setPoolsByDivision] = useState<Map<string, Pool[]>>(new Map());
  const [bracketsByDivision, setBracketsByDivision] = useState<Map<string, Bracket[]>>(new Map());
  const [poolStandings, setPoolStandings] = useState<Map<string, PoolStanding[]>>(new Map());
  const [bracketGames, setBracketGames] = useState<Map<string, Map<string, Game[]>>>(new Map());
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [expandedBrackets, setExpandedBrackets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLoadedRef = useRef(false);

  const loadPoolsAndBrackets = useCallback(async () => {
    if (dataLoadedRef.current || divisions.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { pools, brackets, poolStandings: standings, bracketGames: games } = 
        await tournamentDataCache.getPoolsAndBrackets(tournamentId, divisions);

      setPoolsByDivision(pools);
      setBracketsByDivision(brackets);
      setPoolStandings(standings);
      setBracketGames(games);
      dataLoadedRef.current = true;

    } catch (err) {
      console.error('Error loading pools and brackets:', err);
      setError('Failed to load pools and brackets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [divisions, tournamentId]);

  useEffect(() => {
    loadPoolsAndBrackets();
  }, [loadPoolsAndBrackets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dataLoadedRef.current = false;
    tournamentDataCache.forceRefresh(tournamentId);
    
    try {
      await loadPoolsAndBrackets();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [tournamentId, loadPoolsAndBrackets]);

  const togglePoolExpanded = (poolId: string) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  const toggleBracketExpanded = (bracketId: string) => {
    const newExpanded = new Set(expandedBrackets);
    if (newExpanded.has(bracketId)) {
      newExpanded.delete(bracketId);
    } else {
      newExpanded.add(bracketId);
    }
    setExpandedBrackets(newExpanded);
  };

  const handleTeamPress = (teamName: string, divisionId: string) => {
    navigation.navigate('TeamDetail', { teamName, divisionId });
  };

  const renderPoolCard = (pool: Pool, divisionId: string) => {
    const isExpanded = expandedPools.has(pool.id);
    const standings = poolStandings.get(pool.id) || [];

    return (
      <Card key={pool.id} style={styles.card}>
        <TouchableOpacity onPress={() => togglePoolExpanded(pool.id)} activeOpacity={0.7}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="trophy" size={22} color="#000000" style={styles.headerIcon} />
                <View style={styles.headerTextContainer}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {pool.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.cardSubtitle}>
                    {pool.teams.length} teams
                    {pool.advancementCount && ` • Top ${pool.advancementCount} advance`}
                  </Text>
                </View>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color="#6B7280" 
              />
            </View>
          </Card.Content>
        </TouchableOpacity>

        {isExpanded && (
          <View>
            <Divider />
            <Card.Content style={styles.expandedContent}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Standings
              </Text>
              {standings.length === 0 ? (
                <Text variant="bodySmall" style={styles.emptyText}>
                  No games completed yet
                </Text>
              ) : (
                <View style={styles.tableContainer}>
                  <DataTable>
                    <DataTable.Header>
                      <DataTable.Title style={styles.rankColumn}>Rank</DataTable.Title>
                      <DataTable.Title style={styles.teamColumn}>Team</DataTable.Title>
                      <DataTable.Title numeric style={styles.statColumn}>W-L</DataTable.Title>
                      <DataTable.Title numeric style={styles.statColumn}>Diff</DataTable.Title>
                    </DataTable.Header>

                    {standings.map((standing) => (
                      <DataTable.Row key={standing.teamName}>
                        <DataTable.Cell style={styles.rankColumn}>
                          <Text style={styles.rankText}>{standing.poolRank}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.teamColumn}>
                          <TouchableOpacity 
                            onPress={() => handleTeamPress(standing.teamName, divisionId)}
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
                        <DataTable.Cell numeric style={styles.statColumn}>
                          {standing.wins}-{standing.losses}
                        </DataTable.Cell>
                        <DataTable.Cell numeric style={styles.statColumn}>
                          {standing.pointDifferential > 0 ? '+' : ''}
                          {standing.pointDifferential}
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </DataTable>
                </View>
              )}
            </Card.Content>
          </View>
        )}
      </Card>
    );
  };

  const renderBracketCard = (bracket: Bracket) => {
    const isExpanded = expandedBrackets.has(bracket.id);
    const gamesByRound = bracketGames.get(bracket.id) || new Map();
    const rounds = Array.from(gamesByRound.keys());

    // Sort rounds in logical order
    const roundOrder = ['Round 1', 'Round 2', 'Round 3', 'Quarterfinals', 'Semifinals', 'Finals'];
    rounds.sort((a, b) => {
      const indexA = roundOrder.indexOf(a);
      const indexB = roundOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return (
      <Card key={bracket.id} style={styles.card}>
        <TouchableOpacity onPress={() => toggleBracketExpanded(bracket.id)} activeOpacity={0.7}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="git-branch" size={22} color="#000000" style={styles.headerIcon} />
                <View style={styles.headerTextContainer}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {bracket.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.cardSubtitle}>
                    {bracket.size}-team bracket • {bracket.seedingSource}
                  </Text>
                </View>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color="#6B7280" 
              />
            </View>
          </Card.Content>
        </TouchableOpacity>

        {isExpanded && (
          <View>
            <Divider />
            <Card.Content style={styles.expandedContent}>
              {rounds.length === 0 ? (
                <Text variant="bodySmall" style={styles.emptyText}>
                  No games generated yet
                </Text>
              ) : (
                rounds.map((round) => {
                  const games = gamesByRound.get(round) || [];
                  return (
                    <View key={round} style={styles.roundSection}>
                      <Text variant="titleSmall" style={styles.roundTitle}>
                        {round}
                      </Text>
                      {games.map((game: Game, index: number) => (
                        <View key={game.id} style={styles.matchupCard}>
                          <View style={styles.matchupRow}>
                            <Text 
                              variant="bodyMedium" 
                              style={[
                                styles.matchupTeam,
                                !game.teamA && styles.tbdText
                              ]}
                              numberOfLines={1}
                            >
                              {game.teamA || 'TBD'}
                            </Text>
                            <Text variant="bodyMedium" style={styles.matchupScore}>
                              {game.scoreA !== undefined ? game.scoreA : '-'}
                            </Text>
                          </View>
                          <View style={styles.matchupRow}>
                            <Text 
                              variant="bodyMedium" 
                              style={[
                                styles.matchupTeam,
                                !game.teamB && styles.tbdText
                              ]}
                              numberOfLines={1}
                            >
                              {game.teamB || 'TBD'}
                            </Text>
                            <Text variant="bodyMedium" style={styles.matchupScore}>
                              {game.scoreB !== undefined ? game.scoreB : '-'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </Card.Content>
          </View>
        )}
      </Card>
    );
  };

  if (divisionsLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading pools and brackets...</Text>
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

  // Check if any division has pools or brackets
  const hasAnyPoolsOrBrackets = divisions.some(division => {
    const pools = poolsByDivision.get(division.id) || [];
    const brackets = bracketsByDivision.get(division.id) || [];
    return pools.length > 0 || brackets.length > 0;
  });

  if (!hasAnyPoolsOrBrackets) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No Pools or Brackets
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          This tournament doesn&apos;t have any pools or brackets configured yet.
        </Text>
      </View>
    );
  }

  // Get pools and brackets for selected division
  const selectedPools = selectedDivisionId ? (poolsByDivision.get(selectedDivisionId) || []) : [];
  const selectedBrackets = selectedDivisionId ? (bracketsByDivision.get(selectedDivisionId) || []) : [];

  // Sort pools alphabetically by name
  const sortedPools = [...selectedPools].sort((a, b) => a.name.localeCompare(b.name));

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
        {sortedPools.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Pools
            </Text>
            {sortedPools.map(pool => renderPoolCard(pool, selectedDivisionId!))}
          </View>
        )}

        {selectedBrackets.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Brackets
            </Text>
            {selectedBrackets.map(renderBracketCard)}
          </View>
        )}

        {sortedPools.length === 0 && selectedBrackets.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Pools or Brackets
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              This division doesn&apos;t have any pools or brackets configured yet.
            </Text>
          </View>
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
  divisionTitle: {
    fontWeight: 'bold',
  },
  divisionSubtitle: {
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
    fontWeight: 'bold',
    fontSize: 18,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardContent: {
    paddingVertical: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#6B7280',
  },
  expandedContent: {
    paddingTop: 16,
  },
  divider: {
    marginVertical: 0,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    fontSize: 15,
  },
  tableContainer: {
    marginBottom: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 12,
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
  statColumn: {
    flex: 0.75,
  },
  teamName: {
    fontWeight: '500',
  },
  teamNameTappable: {
    fontWeight: '500',
    color: '#000000',
    textDecorationLine: 'underline',
  },
  roundSection: {
    marginBottom: 20,
  },
  roundTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000000',
    fontSize: 15,
  },
  matchupCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  matchupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  matchupTeam: {
    flex: 1,
    fontWeight: '500',
    fontSize: 15,
  },
  matchupScore: {
    fontWeight: 'bold',
    minWidth: 35,
    textAlign: 'right',
    fontSize: 15,
  },
  tbdText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default PoolsAndBracketsTab;
