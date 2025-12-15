import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Searchbar, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseService } from '../../services/firebase';
import { Game } from '../../types';
import FollowButton from '../../components/common/FollowButton';
import TeamImage from '../../components/common/TeamImage';

const SearchTeamsScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allTeams, setAllTeams] = useState<string[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all unique team names from games
  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true);
      try {
        // Get all tournaments
        const tournaments = await firebaseService.getActiveTournaments();
        
        // Get all games from all tournaments
        const allGamesPromises = tournaments.map(tournament =>
          firebaseService.getGamesByTournament(tournament.id)
        );
        const allGamesArrays = await Promise.all(allGamesPromises);
        const allGames = allGamesArrays.flat();

        // Extract unique team names
        const teamNamesSet = new Set<string>();
        allGames.forEach((game: Game) => {
          teamNamesSet.add(game.teamA);
          teamNamesSet.add(game.teamB);
        });

        const teamNames = Array.from(teamNamesSet).sort();
        setAllTeams(teamNames);
        setFilteredTeams(teamNames);
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, []);

  // Filter and sort teams based on search query
  useEffect(() => {
    let teamsToDisplay = [...allTeams];
    
    // Filter by search query if present
    if (searchQuery.trim() !== '') {
      teamsToDisplay = allTeams.filter(team =>
        team.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort: unfollowed teams first, then followed teams
    const sortedTeams = [...teamsToDisplay].sort((a, b) => {
      const aFollowed = userProfile?.followingTeams.includes(a) || false;
      const bFollowed = userProfile?.followingTeams.includes(b) || false;
      
      // If one is followed and the other isn't, unfollowed comes first
      if (aFollowed !== bFollowed) {
        return aFollowed ? 1 : -1;
      }
      
      // Otherwise, sort alphabetically
      return a.localeCompare(b);
    });
    
    setFilteredTeams(sortedTeams);
  }, [searchQuery, allTeams, userProfile?.followingTeams]);

  const isFollowing = (teamName: string): boolean => {
    return userProfile?.followingTeams.includes(teamName) || false;
  };

  const renderTeamItem = ({ item }: { item: string }) => (
    <Card style={styles.teamCard}>
      <Card.Content style={styles.teamContent}>
        <View style={styles.teamInfo}>
          <TeamImage teamName={item} size={40} />
          <Text variant="titleMedium" style={styles.teamName}>
            {item}
          </Text>
        </View>
        <FollowButton itemId={item} itemType="team" itemName={item} compact />
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={searchQuery ? 'search-outline' : 'people-outline'}
        size={64}
        color="#D1D5DB"
      />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        {searchQuery ? 'No teams found' : 'No teams available'}
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {searchQuery
          ? 'Try adjusting your search'
          : 'Teams will appear here once games are added'}
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#D1D5DB" />
        <Text variant="titleMedium" style={styles.authTitle}>
          Authentication Required
        </Text>
        <Text variant="bodyMedium" style={styles.authText}>
          Please sign in to follow teams
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading teams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search teams..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <View style={styles.statsContainer}>
        <Text variant="bodyMedium" style={styles.statsText}>
          {filteredTeams.length} teams found
          {userProfile && ` • Following ${userProfile.followingTeams.length}`}
        </Text>
      </View>

      <FlatList
        data={filteredTeams}
        renderItem={renderTeamItem}
        keyExtractor={(item, index) => `${item}-${index}`}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          filteredTeams.length === 0 ? styles.emptyListContainer : styles.listContainer
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
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  authTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  authText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 0,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statsText: {
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
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
  teamCard: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  teamContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    marginLeft: 12,
    flex: 1,
    fontWeight: '600',
  },
});

export default SearchTeamsScreen;
