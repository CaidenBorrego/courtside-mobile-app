import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Game, Division, RootStackParamList } from '../../../types';
import { useTournament } from '../../../contexts/TournamentContext';
import { tournamentDataCache } from '../../../services/cache/TournamentDataCache';
import GameCard from '../../../components/game/GameCard';
import DivisionSelector from '../../../components/tournament/DivisionSelector';

interface ScheduleTabProps {
  tournamentId: string;
}

type ScheduleNavigationProp = StackNavigationProp<RootStackParamList>;

const ScheduleTab: React.FC<ScheduleTabProps> = ({ tournamentId }) => {
  const navigation = useNavigation<ScheduleNavigationProp>();
  const { selectedDivisionId, setSelectedDivisionId, divisions, divisionsLoading } = useTournament();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Set up games listener using cache service
  useEffect(() => {
    setLoading(true);
    
    tournamentDataCache.setupGamesListener(
      tournamentId,
      (updatedGames) => {
        setGames(updatedGames);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('❌ Failed to load games:', err);
        setError('Failed to load games. Please try again.');
        setLoading(false);
      }
    );
  }, [tournamentId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    tournamentDataCache.forceRefresh(tournamentId);
    
    // Reload divisions and games
    try {
      await tournamentDataCache.getDivisions(tournamentId);
      // Games will auto-update via the listener
      setTimeout(() => setRefreshing(false), 500);
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  }, [tournamentId]);

  // Filter games by selected division and search query
  const filteredGames = games.filter(game => {
    // Filter by division
    if (selectedDivisionId && game.divisionId !== selectedDivisionId) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        game.teamA.toLowerCase().includes(query) ||
        game.teamB.toLowerCase().includes(query) ||
        (game.gameLabel && game.gameLabel.toLowerCase().includes(query))
      );
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by start time
    const timeA = a.startTime?.toMillis?.() || 0;
    const timeB = b.startTime?.toMillis?.() || 0;
    return timeA - timeB;
  });

  const renderGameCard = ({ item }: { item: Game }) => (
    <GameCard game={item} showLocation={true} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={styles.emptyText}>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DivisionSelector
        divisions={divisions}
        selectedDivisionId={selectedDivisionId}
        onSelectDivision={setSelectedDivisionId}
      />
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Search by team or game type..."
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
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
    paddingTop: 8,
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
});

export default ScheduleTab;
