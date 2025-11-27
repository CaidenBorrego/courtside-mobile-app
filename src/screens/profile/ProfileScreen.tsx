import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, Switch, Divider, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { userProfileService } from '../../services/user/UserProfileService';
import { firebaseService } from '../../services/firebase';
import { Game, ProfileStackParamList } from '../../types';
import Button from '../../components/common/Button';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

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

  // Load followed games data
  useEffect(() => {
    const loadFollowedGames = async () => {
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
        setFollowedGamesData(games.filter((g): g is Game => g !== null));
      } catch (error) {
        console.error('Error loading followed games:', error);
      } finally {
        setLoadingGames(false);
      }
    };

    loadFollowedGames();
  }, [user, userProfile?.followingGames]);

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
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* User Information Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.userInfoContainer}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle-outline" size={80} color="#6200ee" />
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
              color="#6200ee"
            />
          </View>
        </Card.Content>
      </Card>

      {/* Following Statistics */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Following
          </Text>
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
        </Card.Content>
      </Card>

      {/* Followed Teams Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Followed Teams
            </Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('SearchTeams')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#6200ee" />
                <Text style={styles.actionButtonText}>Find</Text>
              </TouchableOpacity>
              {userProfile.followingTeams.length > 0 && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('ManageTeams')}
                >
                  <Ionicons name="settings-outline" size={20} color="#6200ee" />
                  <Text style={styles.actionButtonText}>Manage</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {userProfile.followingTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="basketball-outline" size={48} color="#bdbdbd" />
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
              {userProfile.followingTeams.slice(0, 3).map((team, index) => (
                <View key={`${team}-${index}`}>
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleUnfollowTeam(team)}
                  >
                    <View style={styles.listItemContent}>
                      <Ionicons name="people-outline" size={24} color="#6200ee" />
                      <Text variant="bodyLarge" style={styles.listItemText}>
                        {team}
                      </Text>
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
                  <Ionicons name="chevron-forward" size={20} color="#6200ee" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Followed Games Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Followed Games
            </Text>
            {userProfile.followingGames.length > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('ManageGames')}
              >
                <Ionicons name="settings-outline" size={20} color="#6200ee" />
                <Text style={styles.actionButtonText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
          {loadingGames ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color="#6200ee" />
            </View>
          ) : userProfile.followingGames.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color="#bdbdbd" />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No games followed yet
              </Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                Browse tournaments and games to follow them
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {followedGamesData.slice(0, 3).map((game, index) => (
                <View key={game.id}>
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() =>
                      handleUnfollowGame(game.id, `${game.teamA} vs ${game.teamB}`)
                    }
                  >
                    <View style={styles.listItemContent}>
                      <Ionicons name="basketball-outline" size={24} color="#6200ee" />
                      <View style={styles.gameInfo}>
                        <Text variant="bodyLarge" style={styles.listItemText}>
                          {game.teamA} vs {game.teamB}
                        </Text>
                        <Text variant="bodySmall" style={styles.gameScore}>
                          {game.scoreA} - {game.scoreB}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="close-circle-outline" size={24} color="#f44336" />
                  </TouchableOpacity>
                  {index < Math.min(2, followedGamesData.length - 1) && <Divider />}
                </View>
              ))}
              {followedGamesData.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('ManageGames')}
                >
                  <Text style={styles.viewAllText}>
                    View all {followedGamesData.length} games
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#6200ee" />
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
          variant="outlined"
          icon="log-out-outline"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
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
    color: '#757575',
    marginBottom: 12,
  },
  roleContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#1976d2',
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
    color: '#6200ee',
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
    color: '#757575',
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
    color: '#6200ee',
  },
  statLabel: {
    color: '#757575',
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
    color: '#757575',
    marginTop: 8,
  },
  emptyHint: {
    color: '#9e9e9e',
    marginTop: 4,
    fontSize: 12,
  },
  emptyActionButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6200ee',
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
    color: '#6200ee',
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
  gameInfo: {
    marginLeft: 12,
    flex: 1,
  },
  gameScore: {
    color: '#757575',
    marginTop: 2,
  },
  signOutContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
});

export default ProfileScreen;
