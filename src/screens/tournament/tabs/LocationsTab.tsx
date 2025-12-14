import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { firebaseService } from '../../../services/firebase';
import { Location } from '../../../types';
import LocationCard from '../../../components/tournament/LocationCard';

interface LocationsTabProps {
  tournamentId: string;
}

const LocationsTab: React.FC<LocationsTabProps> = ({ tournamentId }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Use useFocusEffect to reload data when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadLocations();
    }, [tournamentId])
  );

  const loadLocations = async () => {
    try {
      setLoading(true);
      // Get all games for this tournament
      const games = await firebaseService.getGamesByTournament(tournamentId);
      
      // Extract unique location IDs from games
      const locationIds = [...new Set(games.map(game => game.locationId))];
      
      // Fetch each location
      const locationsData = await Promise.all(
        locationIds.map(id => firebaseService.getLocation(id))
      );
      
      // Filter out any null results (in case a location was deleted)
      setLocations(locationsData.filter(loc => loc !== null) as Location[]);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const renderLocationCard = ({ item }: { item: Location }) => (
    <LocationCard location={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyText}>
        No locations available
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={locations}
        renderItem={renderLocationCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          locations.length === 0 ? styles.emptyListContainer : styles.listContainer
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
});

export default LocationsTab;
