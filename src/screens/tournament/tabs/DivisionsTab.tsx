import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Card, Chip, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { firebaseService } from '../../../services/firebase';
import { Division, Game } from '../../../types';
import Button from '../../../components/common/Button';
import FollowButton from '../../../components/common/FollowButton';
import TeamImage from '../../../components/common/TeamImage';

interface DivisionsTabProps {
  tournamentId: string;
}

const DivisionsTab: React.FC<DivisionsTabProps> = ({ tournamentId }) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use useFocusEffect to reload data when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDivisions();
    }, [tournamentId])
  );

  useEffect(() => {
    if (selectedDivision) {
      loadGamesByDivision(selectedDivision);
    }
  }, [selectedDivision]);

  const loadDivisions = async () => {
    try {
      setLoading(true);
      setError(null);
      const divisionsData = await firebaseService.getDivisionsByTournament(tournamentId);
      setDivisions(divisionsData);
    } catch (err) {
      console.error('Error loading divisions:', err);
      setError('Failed to load divisions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadGamesByDivision = async (divisionId: string) => {
    try {
      setGamesLoading(true);
      const gamesData = await firebaseService.getGamesByDivision(divisionId);
      setGames(gamesData);
      
      // Extract unique team names from games
      const teamNamesSet = new Set<string>();
      gamesData.forEach((game: Game) => {
        teamNamesSet.add(game.teamA);
        teamNamesSet.add(game.teamB);
      });
      const uniqueTeams = Array.from(teamNamesSet).sort();
      setTeams(uniqueTeams);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setGamesLoading(false);
    }
  };

  const renderDivisionCard = ({ item }: { item: Division }) => {
    const isSelected = selectedDivision === item.id;
    
    return (
      <TouchableOpacity
        onPress={() => setSelectedDivision(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <Card 
          style={[
            styles.divisionCard,
            isSelected && styles.selectedCard
          ]} 
          mode="elevated"
        >
          <Card.Content>
            <View style={styles.divisionHeader}>
              <Text variant="titleMedium" style={styles.divisionName}>
                {item.name}
              </Text>
              <Chip 
                mode="flat" 
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {item.gender}
              </Chip>
            </View>
            <View style={styles.divisionInfo}>
              <Text variant="bodySmall" style={styles.infoText}>
                Age: {item.ageGroup}
              </Text>
              <Text variant="bodySmall" style={styles.infoText}>
                Level: {item.skillLevel}
              </Text>
            </View>
            {isSelected && (
              <View style={styles.expandedContent}>
                {gamesLoading ? (
                  <View style={styles.loadingTeams}>
                    <ActivityIndicator size="small" color="#000000" />
                    <Text variant="bodySmall" style={styles.loadingTeamsText}>
                      Loading teams...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Divider style={styles.divider} />
                    <View style={styles.teamsHeader}>
                      <Ionicons name="people" size={20} color="#000000" />
                      <Text variant="titleSmall" style={styles.teamsTitle}>
                        Teams ({teams.length})
                      </Text>
                    </View>
                    {teams.length === 0 ? (
                      <Text variant="bodySmall" style={styles.noTeamsText}>
                        No teams in this division yet
                      </Text>
                    ) : (
                      <View style={styles.teamsList}>
                        {teams.map((team, index) => (
                          <View key={`${team}-${index}`}>
                            <View style={styles.teamItem}>
                              <View style={styles.teamInfo}>
                                <TeamImage teamName={team} size={32} />
                                <Text variant="bodyMedium" style={styles.teamName}>
                                  {team}
                                </Text>
                              </View>
                              <FollowButton
                                itemId={team}
                                itemType="team"
                                itemName={team}
                                compact
                              />
                            </View>
                            {index < teams.length - 1 && <Divider style={styles.teamDivider} />}
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.gamesCountContainer}>
                      <Text variant="bodySmall" style={styles.gamesCountText}>
                        {games.length} game{games.length !== 1 ? 's' : ''} in this division
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyText}>
        No divisions found for this tournament
      </Text>
    </View>
  );

  const handleRetry = () => {
    setError(null);
    loadDivisions();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
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
        <View style={styles.retryButton}>
          <Button 
            title="Retry" 
            onPress={handleRetry}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={divisions}
        renderItem={renderDivisionCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          divisions.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
  },
  divisionCard: {
    marginBottom: 12,
    elevation: 2,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#000000',
  },
  divisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  divisionName: {
    flex: 1,
    fontWeight: 'bold',
  },
  chip: {
    backgroundColor: '#F9FAFB',
  },
  chipText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  divisionInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  infoText: {
    color: '#6B7280',
  },
  expandedContent: {
    marginTop: 12,
  },
  loadingTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingTeamsText: {
    color: '#6B7280',
  },
  divider: {
    marginVertical: 8,
  },
  teamsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  teamsTitle: {
    fontWeight: 'bold',
    color: '#000000',
  },
  noTeamsText: {
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  teamsList: {
    marginBottom: 8,
  },
  teamItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  teamName: {
    flex: 1,
    fontWeight: '500',
  },
  teamDivider: {
    marginVertical: 4,
  },
  gamesCountContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  gamesCountText: {
    color: '#6B7280',
    fontSize: 12,
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
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
});

export default DivisionsTab;
