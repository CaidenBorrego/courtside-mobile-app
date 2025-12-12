import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Searchbar, Checkbox, Divider, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { userProfileService } from '../../services/user/UserProfileService';
import { firebaseService } from '../../services/firebase';
import { Game } from '../../types';
import Button from '../../components/common/Button';

type ManageType = 'teams' | 'games';

interface ManageFollowingScreenProps {
  type: ManageType;
}

const ManageFollowingScreen: React.FC<ManageFollowingScreenProps> = ({ type }) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [gamesData, setGamesData] = useState<Game[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const isTeamsMode = type === 'teams';
  const items = isTeamsMode
    ? userProfile?.followingTeams || []
    : userProfile?.followingGames || [];

  // Load game data if in games mode
  useEffect(() => {
    const loadGamesData = async () => {
      if (!isTeamsMode && items.length > 0) {
        setLoadingData(true);
        try {
          const gamesPromises = items.map(gameId =>
            firebaseService.getGame(gameId).catch(() => null)
          );
          const games = await Promise.all(gamesPromises);
          setGamesData(games.filter((g): g is Game => g !== null));
        } catch (error) {
          console.error('Error loading games:', error);
        } finally {
          setLoadingData(false);
        }
      }
    };

    loadGamesData();
  }, [isTeamsMode, items]);

  // Filter items based on search query
  const filteredItems = items.filter(item => {
    if (searchQuery.trim() === '') return true;

    if (isTeamsMode) {
      return item.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const game = gamesData.find(g => g.id === item);
      if (!game) return false;
      const searchText = `${game.teamA} ${game.teamB}`.toLowerCase();
      return searchText.includes(searchQuery.toLowerCase());
    }
  });

  const handleToggleItem = (item: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item)) {
      newSelected.delete(item);
    } else {
      newSelected.add(item);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems));
    }
  };

  const handleBulkUnfollow = async () => {
    if (!user || selectedItems.size === 0) return;

    const itemsArray = Array.from(selectedItems);
    const itemType = isTeamsMode ? 'teams' : 'games';

    Alert.alert(
      'Confirm Unfollow',
      `Are you sure you want to unfollow ${selectedItems.size} ${itemType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (isTeamsMode) {
                await userProfileService.bulkUnfollowTeams(user.uid, itemsArray);
              } else {
                await userProfileService.bulkUnfollowGames(user.uid, itemsArray);
              }

              await refreshUserProfile();
              setSelectedItems(new Set());
              Alert.alert('Success', `Unfollowed ${selectedItems.size} ${itemType}`);
            } catch (error) {
              console.error('Error bulk unfollowing:', error);
              Alert.alert('Error', `Failed to unfollow ${itemType}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = async () => {
    if (!user) return;

    const itemType = isTeamsMode ? 'teams' : 'games';

    Alert.alert(
      'Clear All',
      `Are you sure you want to unfollow all ${itemType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (isTeamsMode) {
                await userProfileService.bulkUnfollowTeams(user.uid, items);
              } else {
                await userProfileService.bulkUnfollowGames(user.uid, items);
              }

              await refreshUserProfile();
              setSelectedItems(new Set());
              Alert.alert('Success', `Cleared all ${itemType}`);
            } catch (error) {
              console.error('Error clearing all:', error);
              Alert.alert('Error', `Failed to clear ${itemType}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getGameDisplayName = (gameId: string): string => {
    const game = gamesData.find(g => g.id === gameId);
    return game ? `${game.teamA} vs ${game.teamB}` : 'Loading...';
  };

  const getGameScore = (gameId: string): string => {
    const game = gamesData.find(g => g.id === gameId);
    return game ? `${game.scoreA} - ${game.scoreB}` : '';
  };

  if (!user || !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading {type}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={`Search ${type}...`}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Action Bar */}
      {items.length > 0 && (
        <Card style={styles.actionCard}>
          <Card.Content style={styles.actionContent}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
              disabled={loading}
            >
              <Checkbox
                status={
                  selectedItems.size === filteredItems.length && filteredItems.length > 0
                    ? 'checked'
                    : selectedItems.size > 0
                    ? 'indeterminate'
                    : 'unchecked'
                }
                disabled={loading}
              />
              <Text variant="bodyMedium">
                {selectedItems.size === filteredItems.length && filteredItems.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              {selectedItems.size > 0 && (
                <Button
                  title={`Unfollow (${selectedItems.size})`}
                  onPress={handleBulkUnfollow}
                  mode="outlined"
                  disabled={loading}
                />
              )}
              <Button
                title="Clear All"
                onPress={handleClearAll}
                mode="outlined"
                disabled={loading}
              />
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Items List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={isTeamsMode ? 'people-outline' : 'basketball-outline'}
              size={64}
              color="#D1D5DB"
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No {type} followed
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Start following {type} to see them here
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#D1D5DB" />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No results found
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Try adjusting your search
            </Text>
          </View>
        ) : (
          <Card style={styles.itemsCard}>
            <Card.Content style={styles.itemsContent}>
              {filteredItems.map((item, index) => (
                <View key={`${item}-${index}`}>
                  <TouchableOpacity
                    style={styles.itemRow}
                    onPress={() => handleToggleItem(item)}
                    disabled={loading}
                  >
                    <Checkbox
                      status={selectedItems.has(item) ? 'checked' : 'unchecked'}
                      disabled={loading}
                    />
                    <View style={styles.itemInfo}>
                      <Ionicons
                        name={isTeamsMode ? 'people' : 'basketball'}
                        size={24}
                        color="#000000"
                        style={styles.itemIcon}
                      />
                      <View style={styles.itemText}>
                        <Text variant="bodyLarge">
                          {isTeamsMode ? item : getGameDisplayName(item)}
                        </Text>
                        {!isTeamsMode && (
                          <Text variant="bodySmall" style={styles.gameScore}>
                            {getGameScore(item)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {index < filteredItems.length - 1 && <Divider />}
                </View>
              ))}
            </Card.Content>
          </Card>
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
  },
  actionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  actionContent: {
    paddingVertical: 8,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  itemsCard: {
    elevation: 2,
  },
  itemsContent: {
    padding: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  gameScore: {
    color: '#6B7280',
    marginTop: 2,
  },
});

export default ManageFollowingScreen;
