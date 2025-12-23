import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Searchbar, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { firebaseService } from '../services/firebase';
import { Tournament, RootStackParamList } from '../types';
import TournamentCard from '../components/tournament/TournamentCard';
import Button from '../components/common/Button';
import OfflineIndicator from '../components/common/OfflineIndicator';
import { useOptimizedFlatList } from '../hooks/useOptimizedFlatList';
import { getTimestampMillis } from '../utils/dateUtils';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAllTournaments, setShowAllTournaments] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Set up real-time listener for tournaments
  useEffect(() => {
    const unsubscribe = firebaseService.onTournamentsSnapshot(
      (updatedTournaments) => {
        // Sort tournaments by most recent (startDate descending)
        const sortedTournaments = [...updatedTournaments].sort((a, b) => {
          const dateA = getTimestampMillis(a.startDate);
          const dateB = getTimestampMillis(b.startDate);
          return dateB - dateA;
        });
        setTournaments(sortedTournaments);
        setFilteredTournaments(sortedTournaments);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      },
      (err) => {
        console.error('Failed to load tournaments:', err);
        setError('Failed to load tournaments. Please try again.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Filter tournaments based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTournaments(tournaments);
    } else {
      const filtered = tournaments.filter(tournament =>
        tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTournaments(filtered);
      setShowAllTournaments(true); // Show all when searching
    }
  }, [searchQuery, tournaments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updatedTournaments = await firebaseService.getActiveTournaments(false); // Don't use cache on manual refresh
      // Sort by most recent
      const sortedTournaments = [...updatedTournaments].sort((a, b) => {
        const dateA = getTimestampMillis(a.startDate);
        const dateB = getTimestampMillis(b.startDate);
        return dateB - dateA;
      });
      setTournaments(sortedTournaments);
      setFilteredTournaments(sortedTournaments);
      setError(null);
    } catch (err) {
      setError('Failed to refresh tournaments');
      console.error('Error refreshing tournaments:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTournamentPress = useCallback((tournamentId: string) => {
    navigation.navigate('TournamentDetail', { tournamentId });
  }, [navigation]);

  // Memoized render function for better performance
  const renderTournamentCard = useCallback(
    ({ item }: { item: Tournament }) => (
      <TournamentCard tournament={item} onPress={handleTournamentPress} />
    ),
    [handleTournamentPress]
  );

  // Optimize FlatList with memoized key extractor
  const { keyExtractor } = useOptimizedFlatList(filteredTournaments);

  // Get tournaments to display (first 5 or all)
  const displayedTournaments = showAllTournaments || searchQuery 
    ? filteredTournaments 
    : filteredTournaments.slice(0, 5);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleLarge" style={styles.emptyTitle}>
        No Tournaments Found
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {searchQuery ? 'Try adjusting your search' : 'Check back later for upcoming tournaments'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer} testID="loading-indicator">
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // The useEffect will re-establish the listener
  };

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
      <OfflineIndicator />
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text variant="headlineMedium" style={styles.title}>Tournaments</Text>
          {!searchExpanded ? (
            <IconButton
              icon="magnify"
              size={24}
              onPress={() => setSearchExpanded(true)}
              style={styles.searchIcon}
            />
          ) : (
            <IconButton
              icon="close"
              size={24}
              onPress={() => {
                setSearchExpanded(false);
                setSearchQuery('');
              }}
              style={styles.searchIcon}
            />
          )}
        </View>
        {searchExpanded && (
          <Searchbar
            placeholder="Search tournaments..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#6B7280"
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
        )}
      </View>
      <FlatList
        testID="tournament-list"
        data={displayedTournaments}
        renderItem={renderTournamentCard}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          !showAllTournaments && !searchQuery && filteredTournaments.length > 5 ? (
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setShowAllTournaments(true)}
            >
              <Text variant="titleMedium" style={styles.seeAllText}>
                See All ({filteredTournaments.length}) →
              </Text>
            </TouchableOpacity>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={
          displayedTournaments.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  searchIcon: {
    margin: 0,
  },
  searchBar: {
    elevation: 0,
    borderRadius: 12,
    marginTop: 8,
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
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  seeAllButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  seeAllText: {
    fontWeight: '600',
  },
});

export default HomeScreen;