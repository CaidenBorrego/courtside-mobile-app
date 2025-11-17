import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { firebaseService } from '../services/firebase';
import { Tournament, RootStackParamList } from '../types';
import TournamentCard from '../components/tournament/TournamentCard';
import Button from '../components/common/Button';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Set up real-time listener for tournaments
  useEffect(() => {
    const unsubscribe = firebaseService.onTournamentsSnapshot(
      (updatedTournaments) => {
        setTournaments(updatedTournaments);
        setFilteredTournaments(updatedTournaments);
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
    }
  }, [searchQuery, tournaments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updatedTournaments = await firebaseService.getActiveTournaments();
      setTournaments(updatedTournaments);
      setFilteredTournaments(updatedTournaments);
      setError(null);
    } catch (err) {
      setError('Failed to refresh tournaments');
      console.error('Error refreshing tournaments:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTournamentPress = (tournamentId: string) => {
    navigation.navigate('TournamentDetail', { tournamentId });
  };

  const renderTournamentCard = ({ item }: { item: Tournament }) => (
    <TournamentCard tournament={item} onPress={handleTournamentPress} />
  );

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
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
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Search tournaments..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>
      <FlatList
        data={filteredTournaments}
        renderItem={renderTournamentCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6200ee']}
            tintColor="#6200ee"
          />
        }
        contentContainerStyle={
          filteredTournaments.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: '#757575',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
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
    color: '#757575',
  },
});

export default HomeScreen;