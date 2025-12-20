import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, Button, Card, Chip } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { firebaseService } from '../../services/firebase';
import { userProfileService } from '../../services/user';
import { useAuth, useGameCompletion } from '../../hooks';
import { openMaps } from '../../utils';
import { Game, Location, GameStatus, RootStackParamList } from '../../types';

type GameDetailRouteProp = RouteProp<RootStackParamList, 'GameDetail'>;

const GameDetailScreen: React.FC = () => {
  const route = useRoute<GameDetailRouteProp>();
  const { gameId } = route.params;
  const { user } = useAuth();
  
  const [game, setGame] = useState<Game | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically advance winner when bracket game is completed
  useGameCompletion(game);

  // Set up real-time listener for game updates
  useEffect(() => {
    console.log('🎮 GameDetailScreen mounted with gameId:', gameId);
    console.log('🎮 Setting up game snapshot listener...');
    
    const unsubscribe = firebaseService.onGameSnapshot(gameId, (updatedGame) => {
      console.log('🎮 Game snapshot received:', updatedGame);
      
      if (updatedGame) {
        console.log('✅ Game found:', updatedGame.teamA, 'vs', updatedGame.teamB);
        setGame(updatedGame);
        setError(null);
        
        // Fetch location data
        if (updatedGame.locationId) {
          console.log('📍 Fetching location:', updatedGame.locationId);
          fetchLocation(updatedGame.locationId);
        } else {
          console.log('⚠️ No locationId found for game');
        }
      } else {
        console.log('❌ Game not found');
        setError('Game not found');
      }
      setLoading(false);
      console.log('🎮 Loading set to false');
    });

    return () => {
      console.log('🎮 Cleaning up game snapshot listener');
      unsubscribe();
    };
  }, [gameId]);

  // Check if user is following this game
  useEffect(() => {
    if (user) {
      checkFollowingStatus();
    }
  }, [user, gameId]);

  const fetchLocation = async (locationId: string) => {
    try {
      console.log('📍 Fetching location data for:', locationId);
      const locationData = await firebaseService.getLocation(locationId);
      console.log('✅ Location data received:', locationData.name);
      setLocation(locationData);
    } catch (err) {
      console.error('❌ Error fetching location:', err);
    }
  };

  const checkFollowingStatus = async () => {
    if (!user) return;
    
    try {
      const following = await userProfileService.isFollowingGame(user.uid, gameId);
      setIsFollowing(following);
    } catch (err) {
      console.error('Error checking following status:', err);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to follow games');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await userProfileService.unfollowGame(user.uid, gameId);
        setIsFollowing(false);
        Alert.alert('Success', 'Game unfollowed');
      } else {
        await userProfileService.followGame(user.uid, gameId);
        setIsFollowing(true);
        Alert.alert('Success', 'Game followed! You will receive notifications about this game.');
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      Alert.alert('Error', 'Failed to update following status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenMaps = async () => {
    if (!location) return;
    await openMaps(location);
  };

  const getStatusColor = (status: GameStatus): string => {
    switch (status) {
      case GameStatus.SCHEDULED:
        return '#2196F3';
      case GameStatus.IN_PROGRESS:
        return '#4CAF50';
      case GameStatus.COMPLETED:
        return '#6B7280';
      case GameStatus.CANCELLED:
        return '#F44336';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: GameStatus): string => {
    switch (status) {
      case GameStatus.SCHEDULED:
        return 'Scheduled';
      case GameStatus.IN_PROGRESS:
        return 'In Progress';
      case GameStatus.COMPLETED:
        return 'Completed';
      case GameStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
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

  console.log('🎮 Render - loading:', loading, 'error:', error, 'game:', game ? 'exists' : 'null');

  if (loading) {
    console.log('🎮 Rendering loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading game details...</Text>
      </View>
    );
  }

  if (error || !game) {
    console.log('🎮 Rendering error state');
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleLarge" style={styles.errorTitle}>
          {error || 'Game not found'}
        </Text>
      </View>
    );
  }

  console.log('🎮 Rendering game details for:', game.teamA, 'vs', game.teamB);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Game Status */}
          <View style={styles.statusContainer}>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(game.status) }]}
              textStyle={styles.statusText}
            >
              {getStatusLabel(game.status)}
            </Chip>
            {game.gameLabel && (
              <Chip
                mode="outlined"
                style={styles.gameLabelChip}
                textStyle={styles.gameLabelText}
              >
                {game.gameLabel}
              </Chip>
            )}
          </View>

          {/* Advancement Info for Bracket Games */}
          {game.status === GameStatus.COMPLETED && game.bracketId && game.feedsIntoGame && (
            <Card style={styles.advancementCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.advancementTitle}>
                  🏆 Winner Advances
                </Text>
                <Text variant="bodyMedium" style={styles.advancementText}>
                  {game.scoreA > game.scoreB ? game.teamA : game.teamB} advances to the next round
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Championship Winner */}
          {game.status === GameStatus.COMPLETED && game.bracketId && !game.feedsIntoGame && game.bracketRound === 'Finals' && (
            <Card style={styles.championCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.championTitle}>
                  🏆 Champion!
                </Text>
                <Text variant="headlineSmall" style={styles.championText}>
                  {game.scoreA > game.scoreB ? game.teamA : game.teamB}
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Teams and Scores */}
          <View style={styles.teamsContainer}>
            <View style={styles.teamRow}>
              <Text variant="headlineSmall" style={styles.teamName}>
                {game.teamA}
              </Text>
              <Text variant="displaySmall" style={styles.score}>
                {game.scoreA}
              </Text>
            </View>
            
            <Text variant="titleMedium" style={styles.vs}>
              vs
            </Text>
            
            <View style={styles.teamRow}>
              <Text variant="headlineSmall" style={styles.teamName}>
                {game.teamB}
              </Text>
              <Text variant="displaySmall" style={styles.score}>
                {game.scoreB}
              </Text>
            </View>
          </View>

          {/* Game Time */}
          <View style={styles.infoRow}>
            <Text variant="labelLarge" style={styles.label}>
              Time:
            </Text>
            <Text variant="bodyLarge" style={styles.value}>
              {formatDateTime(game.startTime)}
            </Text>
          </View>

          {/* Location */}
          {location && (
            <View style={styles.locationSection}>
              <View style={styles.infoRow}>
                <Text variant="labelLarge" style={styles.label}>
                  Location:
                </Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {location.name}
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.address}>
                {location.address}
              </Text>
              <Text variant="bodyMedium" style={styles.address}>
                {location.city}, {location.state}
              </Text>
              
              <Button
                mode="contained"
                onPress={handleOpenMaps}
                style={styles.mapsButton}
                icon="map-marker"
              >
                Open in Maps
              </Button>
            </View>
          )}

          {!location && (
            <View style={styles.infoRow}>
              <Text variant="labelLarge" style={styles.label}>
                Location:
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                TBD
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

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
          {isFollowing ? 'Following' : 'Follow Game'}
        </Button>
      )}

      {!user && (
        <Card style={styles.loginPromptCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.loginPromptText}>
              Log in to follow this game and receive notifications
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
  card: {
    margin: 16,
    elevation: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  gameLabelChip: {
    marginTop: 8,
  },
  gameLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  advancementCard: {
    marginBottom: 16,
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  advancementTitle: {
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  advancementText: {
    color: '#1B5E20',
  },
  championCard: {
    marginBottom: 16,
    backgroundColor: '#FFF9C4',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  championTitle: {
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: 8,
    textAlign: 'center',
  },
  championText: {
    fontWeight: '700',
    color: '#F57F17',
    textAlign: 'center',
  },
  teamsContainer: {
    marginVertical: 16,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  teamName: {
    flex: 1,
    fontWeight: '600',
  },
  score: {
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 16,
  },
  vs: {
    textAlign: 'center',
    color: '#6B7280',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  label: {
    fontWeight: '600',
    marginRight: 8,
    minWidth: 80,
  },
  value: {
    flex: 1,
  },
  locationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  address: {
    marginLeft: 88,
    color: '#6B7280',
    marginTop: 4,
  },
  mapsButton: {
    marginTop: 12,
  },
  followButton: {
    margin: 16,
    marginTop: 8,
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

export default GameDetailScreen;
