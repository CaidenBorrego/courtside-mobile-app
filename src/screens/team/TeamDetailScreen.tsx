import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Chip, Divider, Button } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { teamStatsService } from '../../services/tournament/TeamStatsService';
import { userProfileService } from '../../services/user';
import { useAuth } from '../../hooks';
import { TeamStats, Game, GameStatus, RootStackParamList } from '../../types';
import { StackNavigationProp } from '@react-navigation/stack';
import TeamImage from '../../components/common/TeamImage';

type TeamDetailRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

const TeamDetailScreen: React.FC = () => {
  const route = useRoute<TeamDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { teamName, divisionId } = route.params;
  const { user } = useAuth();
  
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
  }, [teamName, divisionId]);

  useEffect(() => {
    if (user) {
      checkFollowingStatus();
    }
  }, [user, teamName]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load team stats and games in parallel
      const [stats, teamGames] = await Promise.all([
        teamStatsService.calculateTeamStats(teamName, divisionId),
        teamStatsService.getTeamGames(teamName, divisionId),
      ]);

      setTeamStats(stats);
      setGames(teamGames);
    } catch (err) {
      console.error('Error loading team data:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowingStatus = async () => {
    if (!user) return;
    
    try {
      const following = await userProfileService.isFollowingTeam(user.uid, teamName);
      setIsFollowing(following);
    } catch (err) {
      console.error('Error checking following status:', err);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to follow teams');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await userProfileService.unfollowTeam(user.uid, teamName);
        setIsFollowing(false);
        Alert.alert('Success', 'Team unfollowed');
      } else {
        await userProfileService.followTeam(user.uid, teamName);
        setIsFollowing(true);
        Alert.alert('Success', 'Team followed! You will receive notifications about this team.');
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      Alert.alert('Error', 'Failed to update following status');
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDateTime = (timestamp: any): string => {
    if (!timestamp) return 'TBD';
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getGameResult = (game: Game): { result: 'W' | 'L' | 'T' | '-'; color: string } => {
    if (game.status !== GameStatus.COMPLETED) {
      return { result: '-', color: '#6B7280' };
    }

    const isTeamA = game.teamA === teamName;
    const teamScore = isTeamA ? game.scoreA : game.scoreB;
    const opponentScore = isTeamA ? game.scoreB : game.scoreA;

    if (teamScore > opponentScore) {
      return { result: 'W', color: '#4CAF50' };
    } else if (teamScore < opponentScore) {
      return { result: 'L', color: '#F44336' };
    } else {
      return { result: 'T', color: '#FF9800' };
    }
  };

  const getOpponentName = (game: Game): string => {
    return game.teamA === teamName ? game.teamB : game.teamA;
  };

  const getTeamScore = (game: Game): number => {
    return game.teamA === teamName ? game.scoreA : game.scoreB;
  };

  const getOpponentScore = (game: Game): number => {
    return game.teamA === teamName ? game.scoreB : game.scoreA;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading team details...</Text>
      </View>
    );
  }

  if (error || !teamStats) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleLarge" style={styles.errorTitle}>
          {error || 'Team not found'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Team Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.teamHeader}>
            <TeamImage teamName={teamName} size={80} />
          </View>
          
          <Text variant="headlineMedium" style={styles.teamName}>
            {teamName}
          </Text>
          
          <View style={styles.recordContainer}>
            <Text variant="displaySmall" style={styles.record}>
              {teamStats.wins}-{teamStats.losses}
            </Text>
            <Text variant="bodyLarge" style={styles.recordLabel}>
              Record
            </Text>
          </View>

          {/* Follow Button */}
          {user && (
            <Button
              mode={isFollowing ? 'outlined' : 'contained'}
              onPress={handleFollowToggle}
              loading={followLoading}
              disabled={followLoading}
              style={styles.followButton}
              icon={isFollowing ? 'heart' : 'heart-outline'}
            >
              {isFollowing ? 'Following' : 'Follow Team'}
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Team Statistics */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Statistics
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {teamStats.pointsFor}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Points For
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {teamStats.pointsAgainst}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Points Against
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text 
                variant="headlineSmall" 
                style={[
                  styles.statValue,
                  { color: teamStats.pointDifferential >= 0 ? '#4CAF50' : '#F44336' }
                ]}
              >
                {teamStats.pointDifferential >= 0 ? '+' : ''}{teamStats.pointDifferential}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Point Differential
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {teamStats.gamesPlayed}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Games Played
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Game History */}
      <Card style={styles.gamesCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Game History
          </Text>
          
          {games.length === 0 ? (
            <Text variant="bodyMedium" style={styles.noGamesText}>
              No games scheduled yet
            </Text>
          ) : (
            games.map((game, index) => {
              const { result, color } = getGameResult(game);
              const opponent = getOpponentName(game);
              const teamScore = getTeamScore(game);
              const opponentScore = getOpponentScore(game);

              return (
                <View
                  key={game.id}
                  style={styles.gameItem}
                >
                  <View style={styles.gameHeader}>
                    <Chip
                      mode="flat"
                      style={[styles.resultChip, { backgroundColor: color }]}
                      textStyle={styles.resultText}
                    >
                      {result}
                    </Chip>
                    <Text variant="bodySmall" style={styles.gameDate}>
                      {formatDateTime(game.startTime)}
                    </Text>
                  </View>
                  
                  <View style={styles.gameContent}>
                    <View style={styles.gameTeams}>
                      <Text variant="bodyLarge" style={styles.opponentName}>
                        vs {opponent}
                      </Text>
                      {game.status === GameStatus.COMPLETED && (
                        <Text variant="titleMedium" style={styles.gameScore}>
                          {teamScore} - {opponentScore}
                        </Text>
                      )}
                      {game.status !== GameStatus.COMPLETED && (
                        <Chip mode="outlined" style={styles.statusChip}>
                          {game.status === GameStatus.SCHEDULED ? 'Scheduled' : 
                           game.status === GameStatus.IN_PROGRESS ? 'In Progress' : 
                           'Cancelled'}
                        </Chip>
                      )}
                    </View>
                    
                    {game.gameLabel && (
                      <Text variant="bodySmall" style={styles.gameLabel}>
                        {game.gameLabel}
                      </Text>
                    )}
                  </View>
                  
                  {index < games.length - 1 && <Divider style={styles.gameDivider} />}
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      {!user && (
        <Card style={styles.loginPromptCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.loginPromptText}>
              Log in to follow this team and receive notifications
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    textAlign: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  teamHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  teamName: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  recordContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  record: {
    fontWeight: 'bold',
    color: '#000000',
  },
  recordLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  followButton: {
    marginTop: 8,
  },
  statsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#000000',
  },
  statLabel: {
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  gamesCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  noGamesText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 16,
  },
  gameItem: {
    paddingVertical: 12,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultChip: {
    width: 40,
    height: 32,
  },
  resultText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  gameDate: {
    color: '#6B7280',
  },
  gameContent: {
    marginLeft: 8,
  },
  gameTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  opponentName: {
    flex: 1,
    fontWeight: '500',
  },
  gameScore: {
    fontWeight: '600',
    marginLeft: 8,
  },
  statusChip: {
    marginLeft: 8,
  },
  gameLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  gameDivider: {
    marginTop: 12,
  },
  loginPromptCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#E3F2FD',
  },
  loginPromptText: {
    textAlign: 'center',
    color: '#1976D2',
  },
});

export default TeamDetailScreen;
