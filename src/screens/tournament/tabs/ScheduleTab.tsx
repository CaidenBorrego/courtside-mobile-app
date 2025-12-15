import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { firebaseService } from '../../../services/firebase';
import { Game, RootStackParamList } from '../../../types';
import GameCard from '../../../components/game/GameCard';
import Button from '../../../components/common/Button';

interface ScheduleTabProps {
  tournamentId: string;
}

type ScheduleNavigationProp = StackNavigationProp<RootStackParamList>;

const ScheduleTab: React.FC<ScheduleTabProps> = ({ tournamentId }) => {
  const navigation = useNavigation<ScheduleNavigationProp>();
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use useFocusEffect to reload data when tab comes into focus
  // This ensures data is fresh when navigating back from GameDetail
  useFocusEffect(
    useCallback(() => {
      console.log('📅 ScheduleTab focused for tournament:', tournamentId);
      setLoading(true);
      
      // Set up real-time listener for games
      const unsubscribe = firebaseService.onGamesByTournamentSnapshot(
        tournamentId,
        (updatedGames) => {
          console.log('📅 Games received:', updatedGames.length, 'games');
          updatedGames.forEach(game => {
            console.log('  -', game.teamA, 'vs', game.teamB);
          });
          setGames(updatedGames);
          setFilteredGames(updatedGames);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('❌ Failed to load games:', err);
          setError('Failed to load games. Please try again.');
          setLoading(false);
        }
      );

      // Cleanup function called when tab loses focus or unmounts
      return () => {
        console.log('📅 ScheduleTab unfocused, cleaning up listener');
        unsubscribe();
      };
    }, [tournamentId])
  );

  // Filter games based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGames(games);
    } else {
      const filtered = games.filter(game =>
        game.teamA.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.teamB.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGames(filtered);
    }
  }, [searchQuery, games]);

  const handleGamePress = (gameId: string) => {
    navigation.navigate('GameDetail', { gameId });
  };

  const renderGameCard = ({ item }: { item: Game }) => (
    <GameCard game={item} onPress={handleGamePress} showLocation={true} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyText}>
        {searchQuery ? 'No games match your search' : 'No games scheduled yet'}
      </Text>
    </View>
  );

  const handleRetry = () => {
    setError(null);
    setLoading(true);
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
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Search by team name..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#6B7280"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      <FlatList
        data={filteredGames}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          filteredGames.length === 0 ? styles.emptyListContainer : styles.listContainer
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
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 0,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  listContainer: {
    paddingBottom: 16,
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

export default ScheduleTab;
