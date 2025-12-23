import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseService } from '../../services/firebase';
import { Tournament, UserRole, RootStackParamList, TournamentStatus } from '../../types';
import { format } from 'date-fns';
import { getTournamentDisplayStatus } from '../../utils/tournamentStatus';
import Button from '../../components/common/Button';

type AdminPanelNavigationProp = StackNavigationProp<RootStackParamList>;

const DEFAULT_TOURNAMENT_IMAGE = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop';

const AdminPanelScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigation = useNavigation<AdminPanelNavigationProp>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin or scorekeeper
  const isAdmin = userProfile?.role === UserRole.ADMIN;
  const isScorekeeper = userProfile?.role === UserRole.SCOREKEEPER;
  const hasAccess = isAdmin || isScorekeeper;

  useEffect(() => {
    if (hasAccess) {
      loadTournaments();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await firebaseService.getTournaments();
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      let date: Date;
      if (timestamp && typeof timestamp.toDate === 'function') {
        // Firestore Timestamp
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        // Already a Date object
        date = timestamp;
      } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        // Timestamp-like object with seconds
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        // String or number timestamp
        date = new Date(timestamp);
      } else {
        throw new Error('Invalid timestamp format');
      }
      
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return 'Date unavailable';
    }
  };

  const getStatusLabel = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.ACTIVE:
        return 'LIVE';
      case TournamentStatus.UPCOMING:
        return 'UPCOMING';
      case TournamentStatus.COMPLETED:
        return 'COMPLETED';
      default:
        return String(status).toUpperCase();
    }
  };

  // If not admin or scorekeeper, show access denied
  if (!hasAccess) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text variant="headlineMedium" style={styles.accessDeniedTitle}>
          Access Denied
        </Text>
        <Text variant="bodyLarge" style={styles.accessDeniedText}>
          You do not have permission to access the admin panel.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            {isAdmin ? 'Admin Panel' : 'Scorekeeper Panel'}
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            {isAdmin ? 'Manage tournaments and games here' : 'Update game scores and details'}
          </Text>
        </View>

        {tournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basketball-outline" size={64} color="#D1D5DB" />
            <Text variant="titleLarge" style={styles.emptyTitle}>No Tournaments</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No tournaments available
            </Text>
          </View>
        ) : (
          tournaments.map((tournament) => {
            const displayStatus = getTournamentDisplayStatus(tournament);
            
            return (
              <View key={tournament.id} style={styles.tournamentCardContainer}>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('ManageTournament', { tournamentId: tournament.id })}
                  activeOpacity={0.7}
                  style={styles.touchable}
                >
                  <View style={styles.card}>
                    {/* Tournament Image */}
                    <Image
                      source={{ uri: tournament.imageUrl || DEFAULT_TOURNAMENT_IMAGE }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                    
                    {/* Content */}
                    <View style={styles.content}>
                      {/* Status Text */}
                      <Text style={styles.statusText}>
                        {getStatusLabel(displayStatus)}
                      </Text>

                      {/* Tournament Name */}
                      <Text style={styles.title} numberOfLines={2}>
                        {tournament.name}
                      </Text>
                      
                      {/* Location */}
                      <Text style={styles.location} numberOfLines={1}>
                        {tournament.city}, {tournament.state}
                      </Text>
                      
                      {/* Dates */}
                      <Text style={styles.dates}>
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Edit Button - Only for Admins */}
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditTournament', { tournamentId: tournament.id })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={20} color="#000000" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  accessDeniedTitle: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#d32f2f',
  },
  accessDeniedText: {
    textAlign: 'center',
    color: '#6B7280',
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#000000',
  },
  headerTitle: {
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#F3F4F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    marginTop: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
  tournamentCardContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  touchable: {
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
    color: '#000000',
  },
  location: {
    fontSize: 14,
    marginBottom: 4,
    color: '#6B7280',
  },
  dates: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
});

export default AdminPanelScreen;
