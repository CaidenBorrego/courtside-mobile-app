import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Switch, Divider, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { userProfileService } from '../../services/user/UserProfileService';
import { firebaseService } from '../../services/firebase';
import { Game, Division, ProfileStackParamList } from '../../types';
import Button from '../../components/common/Button';
import TeamImage from '../../components/common/TeamImage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { cacheData, getCachedData } from '../../utils/cache';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, userProfile, signOut, refreshUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    userProfile?.notificationsEnabled ?? true
  );
  const [followedGamesData, setFollowedGamesData] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [teamDivisions, setTeamDivisions] = useState<Record<string, string>>({});
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh profile and sync team games when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const refresh = async () => {
        if (user && isActive) {
          await refreshUserProfile();
          // Sync team games in the background (don't block UI)
          userProfileService.syncTeamGames(user.uid).catch(error => {
            console.error('Error syncing team games:', error);
          });
        }
      };
      
      refresh();
      
      return () => {
        isActive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Empty deps - only run on focus/blur, not on every render
  );

  // Load followed games data (no caching due to Firestore Timestamp serialization issues)
  const loadFollowedGames = useCallback(async (forceRefresh: boolean = false) => {
    if (!user || !userProfile?.followingGames.length) {
      setFollowedGamesData([]);
      return;
    }

    setLoadingGames(true);
    try {
      const gamesPromises = userProfile.followingGames.map(gameId =>
        firebaseService.getGame(gameId).catch(() => null)
      );
      const games = await Promise.all(gamesPromises);
      const validGames = games.filter((g): g is Game => g !== null);
      
      // Sort games: in_progress > scheduled (by start time) > completed
      const sortedGames = validGames.sort((a, b) => {
        // Normalize status to lowercase and convert spaces to underscores
        const normalizeStatus = (status: string) => {
          return status.toLowerCase().replace(/\s+/g, '_');
        };
        
        // Priority order: in_progress (1), scheduled (2), completed (3), cancelled (4)
        const statusPriority: Record<string, number> = {
          'in_progress': 1,
          'scheduled': 2,
          'completed': 3,
          'cancelled': 4,
        };
        
        const aStatus = normalizeStatus(a.status);
        const bStatus = normalizeStatus(b.status);
        
        const aPriority = statusPriority[aStatus] || 5;
        const bPriority = statusPriority[bStatus] || 5;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If both are scheduled, sort by start time (earliest first)
        if (a.status === 'scheduled' && b.status === 'scheduled') {
          const aTime = a.startTime.toMillis ? a.startTime.toMillis() : 0;
          const bTime = b.startTime.toMillis ? b.startTime.toMillis() : 0;
          return aTime - bTime;
        }
        
        return 0;
      });
      
      setFollowedGamesData(sortedGames);
    } catch (error) {
      console.error('Error loading followed games:', error);
    } finally {
      setLoadingGames(false);
    }
  }, [user, userProfile?.followingGames]);

  useEffect(() => {
    loadFollowedGames(false);
  }, [loadFollowedGames]);

  // Load division information for followed teams with caching
  const loadTeamDivisions = useCallback(async (forceRefresh: boolean = false) => {
    if (!user || !userProfile?.followingTeams.length) {
      setTeamDivisions({});
      return;
    }

    const cacheKey = `team_divisions_${user.uid}`;
    
    // Try to get cached data first if not forcing refresh
    if (!forceRefresh) {
      const cached = await getCachedData<Record<string, string>>(cacheKey);
      if (cached) {
        setTeamDivisions(cached);
        setLoadingTeams(false);
        return;
      }
    }

    setLoadingTeams(true);
    try {
      const divisionsMap: Record<string, string> = {};
      
      // Get all tournaments to search for team games
      const tournaments = await firebaseService.getTournaments();
      
      // For each team, find a game they're in and get the division
      for (const teamName of userProfile.followingTeams) {
        try {
          let foundDivision = false;
          
          // Search through tournaments to find games with this team
          for (const tournament of tournaments) {
            if (foundDivision) break;
            
            const games = await firebaseService.getGamesByTournament(tournament.id);
            const teamGame = games.find(
              game => game.teamA === teamName || game.teamB === teamName
            );
            
            if (teamGame) {
              // Get the division for this game
              const division = await firebaseService.getDivision(teamGame.divisionId);
              if (division) {
                divisionsMap[teamName] = division.name;
                foundDivision = true;
              }
            }
          }
        } catch (error) {
          console.error(`Error loading division for team ${teamName}:`, error);
        }
      }
      
      setTeamDivisions(divisionsMap);
      
      // Cache the results for 30 minutes (divisions don't change often)
      await cacheData(cacheKey, divisionsMap, { expiryMinutes: 30 });
    } catch (error) {
      console.error('Error loading team divisions:', error);
    } finally {
      setLoadingTeams(false);
    }
  }, [user, userProfile?.followingTeams]);

  useEffect(() => {
    loadTeamDivisions(false);
  }, [loadTeamDivisions]);

  // Sync notifications toggle with user profile
  useEffect(() => {
    if (userProfile) {
      setNotificationsEnabled(userProfile.notificationsEnabled);
    }
  }, [userProfile]);

  const handleToggleNotifications = async (value: boolean) => {
    if (!user) return;

    setNotificationsEnabled(value);
    setLoading(true);

    try {
      await userProfileService.toggleNotifications(user.uid, value);
      await refreshUserProfile();
      Alert.alert(
        'Success',
        `Notifications ${value ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setNotificationsEnabled(!value); // Revert on error
      Alert.alert('Error', 'Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollowTeam = async (teamName: string) => {
    if (!user) return;

    Alert.alert(
      'Unfollow Team',
      `Are you sure you want to unfollow ${teamName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            try {
              await userProfileService.unfollowTeam(user.uid, teamName);
              await refreshUserProfile();
              Alert.alert('Success', `Unfollowed ${teamName}`);
            } catch (error) {
              console.error('Error unfollowing team:', error);
              Alert.alert('Error', 'Failed to unfollow team');
            }
          },
        },
      ]
    );
  };

  const handleUnfollowGame = async (gameId: string, gameName: string) => {
    if (!user) return;

    Alert.alert(
      'Unfollow Game',
      `Are you sure you want to unfollow ${gameName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            try {
              await userProfileService.unfollowGame(user.uid, gameId);
              await refreshUserProfile();
              Alert.alert('Success', `Unfollowed game`);
            } catch (error) {
              console.error('Error unfollowing game:', error);
              Alert.alert('Error', 'Failed to unfollow game');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh user profile
      await refreshUserProfile();
      
      // Force refresh followed games and team divisions
      await Promise.all([
        loadFollowedGames(true),
        loadTeamDivisions(true),
      ]);
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  if (!user || !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#000000"
        />
      }
    >
      {/* User Information Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.userInfoContainer}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle-outline" size={80} color="#000000" />
            </View>
            <Text variant="headlineSmall" style={styles.displayName}>
              {userProfile.displayName}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {userProfile.email}
            </Text>
            <View style={styles.roleContainer}>
              <Text variant="labelMedium" style={styles.roleText}>
                {userProfile.role.toUpperCase()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Notification Preferences Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Notification Preferences
          </Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge">Push Notifications</Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Receive notifications for followed games and teams
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              disabled={loading}
              color="#000000"
            />
          </View>
        </Card.Content>
      </Card>

      {/* Following Section - Combined */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Following
          </Text>
          
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {userProfile.followingTeams.length}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Teams
              </Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {userProfile.followingGames.length}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Games
              </Text>
            </View>
          </View>

          <Divider style={styles.sectionDivider} />

          {/* Followed Teams Subsection */}
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.subsectionTitle}>
              Followed Teams
            </Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('SearchTeams')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#000000" />
                <Text style={styles.actionButtonText}>Find</Text>
              </TouchableOpacity>
              {userProfile.followingTeams.length > 0 && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('ManageTeams')}
                >
                  <Ionicons name="settings-outline" size={20} color="#000000" />
                  <Text style={styles.actionButtonText}>Manage</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {userProfile.followingTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="basketball-outline" size={48} color="#D1D5DB" />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No teams followed yet
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('SearchTeams')}
              >
                <Text style={styles.emptyActionText}>Find Teams to Follow</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {loadingTeams ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color="#000000" />
                </View>
              ) : (
                <>
                  {userProfile.followingTeams.slice(0, 3).map((team, index) => (
                    <View key={`${team}-${index}`}>
                      <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => handleUnfollowTeam(team)}
                      >
                        <View style={styles.listItemContent}>
                          <TeamImage teamName={team} size={40} />
                          <View style={styles.teamInfo}>
                            <Text variant="bodyLarge" style={styles.teamName}>
                              {team}
                            </Text>
                            {teamDivisions[team] && (
                              <Text variant="bodySmall" style={styles.teamDivision}>
                                {teamDivisions[team]}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons name="close-circle-outline" size={24} color="#f44336" />
                      </TouchableOpacity>
                      {index < Math.min(2, userProfile.followingTeams.length - 1) && <Divider />}
                    </View>
                  ))}
                  {userProfile.followingTeams.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => navigation.navigate('ManageTeams')}
                    >
                      <Text style={styles.viewAllText}>
                        View all {userProfile.followingTeams.length} teams
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color="#000000" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          <Divider style={styles.sectionDivider} />

          {/* Followed Games Subsection */}
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.subsectionTitle}>
              Followed Games
            </Text>
            {userProfile.followingGames.length > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('ManageGames')}
              >
                <Ionicons name="settings-outline" size={20} color="#000000" />
                <Text style={styles.actionButtonText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
          {loadingGames ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color="#000000" />
            </View>
          ) : userProfile.followingGames.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No games followed yet
              </Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                Browse tournaments and games to follow them
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {followedGamesData.slice(0, 5).map((game, index) => {
                const isScheduled = game.status === 'scheduled';
                const isCompleted = game.status === 'completed';
                const teamAWon = isCompleted && game.scoreA > game.scoreB;
                const teamBWon = isCompleted && game.scoreB > game.scoreA;
                
                const formatTime = (timestamp: any) => {
                  try {
                    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                    return date.toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    });
                  } catch {
                    return 'Time TBD';
                  }
                };
                
                const getStatusLabel = (status: string) => {
                  switch (status) {
                    case 'in_progress':
                      return 'LIVE';
                    case 'scheduled':
                      return 'SCHEDULED';
                    case 'completed':
                      return 'FINAL';
                    case 'cancelled':
                      return 'CANCELLED';
                    default:
                      return status.toUpperCase();
                  }
                };

                return (
                  <View key={game.id}>
                    <TouchableOpacity
                      style={styles.listItem}
                      onPress={() =>
                        handleUnfollowGame(game.id, `${game.teamA} vs ${game.teamB}`)
                      }
                    >
                      <View style={styles.listItemContent}>
                        <View style={styles.gameInfo}>
                          <View style={styles.gameHeader}>
                            <View style={styles.gameTeamsContainer}>
                              <Text 
                                variant="bodyMedium" 
                                style={[
                                  styles.gameTeamName,
                                  teamAWon && styles.winnerTeamName,
                                  teamBWon && styles.loserTeamName,
                                ]}
                              >
                                {game.teamA}
                              </Text>
                              <Text variant="bodyMedium" style={styles.vsText}> vs </Text>
                              <Text 
                                variant="bodyMedium" 
                                style={[
                                  styles.gameTeamName,
                                  teamBWon && styles.winnerTeamName,
                                  teamAWon && styles.loserTeamName,
                                ]}
                              >
                                {game.teamB}
                              </Text>
                            </View>
                            <View style={styles.statusBadge}>
                              <Text style={styles.statusText}>
                                {getStatusLabel(game.status)}
                              </Text>
                            </View>
                          </View>
                          <Text variant="bodySmall" style={styles.gameScore}>
                            {isScheduled ? formatTime(game.startTime) : `${game.scoreA} - ${game.scoreB}`}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="close-circle-outline" size={24} color="#f44336" />
                    </TouchableOpacity>
                    {index < Math.min(4, followedGamesData.length - 1) && <Divider />}
                  </View>
                );
              })}
              {followedGamesData.length > 5 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('ManageGames')}
                >
                  <Text style={styles.viewAllText}>
                    View all {followedGamesData.length} games
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#000000" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Sign Out Button */}
      <View style={styles.signOutContainer}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          mode="outlined"
        />
      </View>
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
    paddingBottom: 32,
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  userInfoContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  displayName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#6B7280',
    marginBottom: 12,
  },
  roleContainer: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  subsectionTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  sectionDivider: {
    marginVertical: 20,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    color: '#6B7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#000000',
  },
  statLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#6B7280',
    marginTop: 8,
  },
  emptyHint: {
    color: '#9CA3AF',
    marginTop: 4,
    fontSize: 12,
  },
  emptyActionButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: '#000000',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemText: {
    marginLeft: 12,
    flex: 1,
  },
  teamInfo: {
    marginLeft: 12,
    flex: 1,
  },
  teamName: {
    fontWeight: '500',
  },
  teamDivision: {
    color: '#6B7280',
    marginTop: 2,
  },
  gameInfo: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gameTeamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  gameTeams: {
    flex: 1,
    fontWeight: '500',
  },
  gameTeamName: {
    fontWeight: '500',
  },
  winnerTeamName: {
    fontWeight: '700',
    color: '#000000',
  },
  loserTeamName: {
    color: '#9CA3AF',
  },
  vsText: {
    color: '#6B7280',
    fontWeight: '400',
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  gameScore: {
    color: '#6B7280',
    marginTop: 2,
  },
  signOutContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
});

export default ProfileScreen;
