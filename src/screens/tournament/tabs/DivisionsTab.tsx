import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { firebaseService } from '../../../services/firebase';
import { Division, Game } from '../../../types';
import Button from '../../../components/common/Button';

interface DivisionsTabProps {
  tournamentId: string;
}

const DivisionsTab: React.FC<DivisionsTabProps> = ({ tournamentId }) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDivisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (selectedDivision) {
      loadGamesByDivision(selectedDivision);
    }
  }, [selectedDivision]);

  const loadDivisions = async () => {
    try {
      setLoading(true);
      setError(null);
      const divisionsData = await firebaseService.getDivisionsByTournament(tournamentId);
      setDivisions(divisionsData);
    } catch (err) {
      console.error('Error loading divisions:', err);
      setError('Failed to load divisions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadGamesByDivision = async (divisionId: string) => {
    try {
      setGamesLoading(true);
      const gamesData = await firebaseService.getGamesByDivision(divisionId);
      setGames(gamesData);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setGamesLoading(false);
    }
  };

  const renderDivisionCard = ({ item }: { item: Division }) => {
    const isSelected = selectedDivision === item.id;
    
    return (
      <TouchableOpacity
        onPress={() => setSelectedDivision(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <Card 
          style={[
            styles.divisionCard,
            isSelected && styles.selectedCard
          ]} 
          mode="elevated"
        >
          <Card.Content>
            <View style={styles.divisionHeader}>
              <Text variant="titleMedium" style={styles.divisionName}>
                {item.name}
              </Text>
              <Chip 
                mode="flat" 
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {item.gender}
              </Chip>
            </View>
            <View style={styles.divisionInfo}>
              <Text variant="bodySmall" style={styles.infoText}>
                Age: {item.ageGroup}
              </Text>
              <Text variant="bodySmall" style={styles.infoText}>
                Level: {item.skillLevel}
              </Text>
            </View>
            {isSelected && (
              <View style={styles.gamesCountContainer}>
                <Text variant="bodySmall" style={styles.gamesCountText}>
                  {gamesLoading ? 'Loading games...' : `${games.length} game${games.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyText}>
        No divisions found for this tournament
      </Text>
    </View>
  );

  const handleRetry = () => {
    setError(null);
    loadDivisions();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
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
      <FlatList
        data={divisions}
        renderItem={renderDivisionCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          divisions.length === 0 ? styles.emptyListContainer : styles.listContainer
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
    color: '#757575',
  },
  divisionCard: {
    marginBottom: 12,
    elevation: 2,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  divisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  divisionName: {
    flex: 1,
    fontWeight: 'bold',
  },
  chip: {
    backgroundColor: '#e3f2fd',
  },
  chipText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  divisionInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  infoText: {
    color: '#757575',
  },
  gamesCountContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  gamesCountText: {
    color: '#6200ee',
    fontWeight: '600',
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
});

export default DivisionsTab;
