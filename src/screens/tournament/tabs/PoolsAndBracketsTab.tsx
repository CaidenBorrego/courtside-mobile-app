import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, DataTable } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { poolService } from '../../../services/tournament/PoolService';
import { bracketService } from '../../../services/tournament/BracketService';
import { firebaseService } from '../../../services/firebase';
import { Pool, Bracket, PoolStanding, Game, Division, RootStackParamList } from '../../../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface PoolsAndBracketsTabProps {
  tournamentId: string;
}

const PoolsAndBracketsTab: React.FC<PoolsAndBracketsTabProps> = ({ tournamentId }) => {
  const navigation = useNavigation<NavigationProp>();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [poolsByDivision, setPoolsByDivision] = useState<Map<string, Pool[]>>(new Map());
  const [bracketsByDivision, setBracketsByDivision] = useState<Map<string, Bracket[]>>(new Map());
  const [poolStandings, setPoolStandings] = useState<Map<string, PoolStanding[]>>(new Map());
  const [bracketGames, setBracketGames] = useState<Map<string, Map<string, Game[]>>>(new Map());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [expandedBrackets, setExpandedBrackets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPoolsAndBrackets();
  }, [tournamentId]);

  // Auto-expand if there's only one division
  useEffect(() => {
    if (divisions.length === 1) {
      setExpandedDivisions(new Set([divisions[0].id]));
    }
  }, [divisions]);

  const loadPoolsAndBrackets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load divisions
      const divisionsData = await firebaseService.getDivisionsByTournament(tournamentId);
      setDivisions(divisionsData);

      // Load pools and brackets for each division
      const poolsMap = new Map<string, Pool[]>();
      const bracketsMap = new Map<string, Bracket[]>();
      const standingsMap = new Map<string, PoolStanding[]>();
      const gamesMap = new Map<string, Map<string, Game[]>>();

      for (const division of divisionsData) {
        // Load pools
        const poolsData = await poolService.getPoolsByDivision(division.id);
        poolsMap.set(division.id, poolsData);

        // Load brackets
        const bracketsData = await bracketService.getBracketsByDivision(division.id);
        bracketsMap.set(division.id, bracketsData);

        // Load standings for each pool
        for (const pool of poolsData) {
          const standings = await poolService.calculateStandings(pool.id);
          standingsMap.set(pool.id, standings);
        }

        // Load games for each bracket organized by round
        for (const bracket of bracketsData) {
          const bracketState = await bracketService.getBracketState(bracket.id);
          gamesMap.set(bracket.id, bracketState.gamesByRound);
        }
      }

      setPoolsByDivision(poolsMap);
      setBracketsByDivision(bracketsMap);
      setPoolStandings(standingsMap);
      setBracketGames(gamesMap);

    } catch (err) {
      console.error('Error loading pools and brackets:', err);
      setError('Failed to load pools and brackets. Please try again.');
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
      <Card key={pool.id} style={styles.card} mode="elevated">
        <TouchableOpacity onPress={() => togglePoolExpanded(pool.id)} activeOpacity={0.7}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="trophy" size={20} color="#000000" />
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {pool.name}
                </Text>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color="#6B7280" 
              />
            </View>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              {pool.teams.length} teams
              {pool.advancementCount && ` • Top ${pool.advancementCount} advance`}
            </Text>
          </Card.Content>
        </TouchableOpacity>

        {isExpanded && (
          <Card.Content style={styles.expandedContent}>
            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Standings
            </Text>
            {standings.length === 0 ? (
              <Text variant="bodySmall" style={styles.emptyText}>
                No games completed yet
              </Text>
            ) : (
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
                      {standing.poolRank}
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
            )}
          </Card.Content>
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
      <Card key={bracket.id} style={styles.card} mode="elevated">
        <TouchableOpacity onPress={() => toggleBracketExpanded(bracket.id)} activeOpacity={0.7}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="git-branch" size={20} color="#000000" />
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {bracket.name}
                </Text>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color="#6B7280" 
              />
            </View>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              {bracket.size}-team bracket • {bracket.seedingSource}
            </Text>
          </Card.Content>
        </TouchableOpacity>

        {isExpanded && (
          <Card.Content style={styles.expandedContent}>
            <Divider style={styles.divider} />
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
                            {game.scoreA}
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
                            {game.scoreB}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })
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
          This tournament doesn't have any pools or brackets configured yet.
        </Text>
      </View>
    );
  }

  const divisionsWithContent = divisions.filter(division => {
    const pools = poolsByDivision.get(division.id) || [];
    const brackets = bracketsByDivision.get(division.id) || [];
    return pools.length > 0 || brackets.length > 0;
  });

  const showDivisionHeaders = divisionsWithContent.length > 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {divisions.map(division => {
        const pools = poolsByDivision.get(division.id) || [];
        const brackets = bracketsByDivision.get(division.id) || [];
        
        // Skip divisions with no pools or brackets
        if (pools.length === 0 && brackets.length === 0) {
          return null;
        }

        const isExpanded = expandedDivisions.has(division.id);

        // If only one division, render content directly without card wrapper
        if (!showDivisionHeaders) {
          return (
            <View key={division.id}>
              {pools.length > 0 && (
                <View style={styles.section}>
                  <Text variant="titleMedium" style={styles.sectionHeader}>
                    Pools
                  </Text>
                  {pools.map(pool => renderPoolCard(pool, division.id))}
                </View>
              )}

              {brackets.length > 0 && (
                <View style={styles.section}>
                  <Text variant="titleMedium" style={styles.sectionHeader}>
                    Brackets
                  </Text>
                  {brackets.map(renderBracketCard)}
                </View>
              )}
            </View>
          );
        }

        // Multiple divisions - show collapsible cards
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
                  {pools.length} pool{pools.length !== 1 ? 's' : ''} • {brackets.length} bracket{brackets.length !== 1 ? 's' : ''}
                </Text>
              </Card.Content>
            </TouchableOpacity>

            {isExpanded && (
              <Card.Content style={styles.expandedContent}>
                {pools.length > 0 && (
                  <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionHeader}>
                      Pools
                    </Text>
                    {pools.map(pool => renderPoolCard(pool, division.id))}
                  </View>
                )}

                {brackets.length > 0 && (
                  <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionHeader}>
                      Brackets
                    </Text>
                    {brackets.map(renderBracketCard)}
                  </View>
                )}
              </Card.Content>
            )}
          </Card>
        );
      })}
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
  divisionTitle: {
    fontWeight: 'bold',
  },
  divisionSubtitle: {
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 12,
    elevation: 2,
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
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  cardSubtitle: {
    color: '#6B7280',
    marginTop: 4,
  },
  expandedContent: {
    paddingTop: 0,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
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
    marginBottom: 16,
  },
  roundTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  matchupCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  matchupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  matchupTeam: {
    flex: 1,
    fontWeight: '500',
  },
  matchupScore: {
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'right',
  },
  tbdText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default PoolsAndBracketsTab;
