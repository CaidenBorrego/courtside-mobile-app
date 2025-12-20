import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { firebaseService } from '../../../services/firebase';
import { Game, Division, RootStackParamList } from '../../../types';
import GameCard from '../../../components/game/GameCard';
import Button from '../../../components/common/Button';

interface ScheduleTabProps {
  tournamentId: string;
}

type ScheduleNavigationProp = StackNavigationProp<RootStackParamList>;

interface GameSection {
  divisionId: string;
  divisionName: string;
  data: Game[];
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ tournamentId }) => {
  const navigation = useNavigation<ScheduleNavigationProp>();
  const [games, setGames] = useState<Game[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [gameSections, setGameSections] = useState<GameSection[]>([]);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use useFocusEffect to reload data when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📅 ScheduleTab focused for tournament:', tournamentId);
      setLoading(true);
      
      // Load divisions first
      const loadData = async () => {
        try {
          const divisionsData = await firebaseService.getDivisionsByTournament(tournamentId);
          setDivisions(divisionsData);
          
          // Auto-expand if only one division
          if (divisionsData.length === 1) {
            setExpandedDivisions(new Set([divisionsData[0].id]));
          }
        } catch (err) {
          console.error('❌ Failed to load divisions:', err);
        }
      };
      
      loadData();
      
      // Set up real-time listener for games
      const unsubscribe = firebaseService.onGamesByTournamentSnapshot(
        tournamentId,
        (updatedGames) => {
          console.log('📅 Games received:', updatedGames.length, 'games');
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

      return () => {
        console.log('📅 ScheduleTab unfocused, cleaning up listener');
        unsubscribe();
      };
    }, [tournamentId])
  );

  // Group games by division and apply search filter
  useEffect(() => {
    const divisionMap = new Map<string, Division>();
    divisions.forEach(div => divisionMap.set(div.id, div));

    // Filter games by search query
    let filteredGames = games;
    if (searchQuery.trim() !== '') {
      filteredGames = games.filter(game =>
        game.teamA.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.teamB.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.gameLabel && game.gameLabel.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Group by division
    const gamesByDivision = new Map<string, Game[]>();
    filteredGames.forEach(game => {
      if (!gamesByDivision.has(game.divisionId)) {
        gamesByDivision.set(game.divisionId, []);
      }
      gamesByDivision.get(game.divisionId)!.push(game);
    });

    // Sort games within each division by start time
    gamesByDivision.forEach(divGames => {
      divGames.sort((a, b) => {
        const timeA = a.startTime?.toMillis?.() || 0;
        const timeB = b.startTime?.toMillis?.() || 0;
        return timeA - timeB;
      });
    });

    // Create sections
    const sections: GameSection[] = [];
    divisions.forEach(division => {
      const divGames = gamesByDivision.get(division.id) || [];
      if (divGames.length > 0) {
        sections.push({
          divisionId: division.id,
          divisionName: division.name,
          data: divGames,
        });
      }
    });

    setGameSections(sections);
  }, [games, divisions, searchQuery]);

  const toggleDivisionExpanded = (divisionId: string) => {
    const newExpanded = new Set(expandedDivisions);
    if (newExpanded.has(divisionId)) {
      newExpanded.delete(divisionId);
    } else {
      newExpanded.add(divisionId);
    }
    setExpandedDivisions(newExpanded);
  };

  const renderGameCard = ({ item }: { item: Game }) => (
    <GameCard game={item} showLocation={true} />
  );

  const renderSectionHeader = ({ section }: { section: GameSection }) => {
    // If only one division, don't show header
    if (divisions.length === 1) {
      return null;
    }

    const isExpanded = expandedDivisions.has(section.divisionId);

    return (
      <TouchableOpacity 
        onPress={() => toggleDivisionExpanded(section.divisionId)}
        activeOpacity={0.7}
      >
        <Card style={styles.divisionHeader} mode="elevated">
          <Card.Content>
            <View style={styles.divisionHeaderContent}>
              <View style={styles.divisionHeaderLeft}>
                <Text variant="titleMedium" style={styles.divisionTitle}>
                  {section.divisionName}
                </Text>
                <Text variant="bodySmall" style={styles.divisionSubtitle}>
                  {section.data.length} game{section.data.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color="#6B7280" 
              />
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

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

  // Filter sections based on expanded state
  const visibleSections = gameSections.map(section => ({
    ...section,
    data: divisions.length === 1 || expandedDivisions.has(section.divisionId) ? section.data : [],
  }));

  return (
    <View style={styles.container}>
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
      <SectionList
        sections={visibleSections}
        renderItem={renderGameCard}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          gameSections.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        stickySectionHeadersEnabled={false}
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
  divisionHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    elevation: 2,
  },
  divisionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divisionHeaderLeft: {
    flex: 1,
  },
  divisionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  divisionSubtitle: {
    color: '#6B7280',
  },
});

export default ScheduleTab;
