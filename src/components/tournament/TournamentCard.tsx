import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Tournament, TournamentStatus } from '../../types';
import { format } from 'date-fns';
import { getTournamentDisplayStatus } from '../../utils/tournamentStatus';

interface TournamentCardProps {
  tournament: Tournament;
  onPress: (tournamentId: string) => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onPress }) => {
  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      return 'Date unavailable';
    }
  };

  // Get the actual display status (computed from dates or admin override)
  const displayStatus = getTournamentDisplayStatus(tournament);

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.ACTIVE:
        return '#4caf50';
      case TournamentStatus.UPCOMING:
        return '#2196f3';
      case TournamentStatus.COMPLETED:
        return '#9e9e9e';
      default:
        return '#757575';
    }
  };

  const getStatusLabel = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.ACTIVE:
        return 'Active';
      case TournamentStatus.UPCOMING:
        return 'Upcoming';
      case TournamentStatus.COMPLETED:
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <TouchableOpacity 
      onPress={() => onPress(tournament.id)}
      activeOpacity={0.7}
    >
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>
              {tournament.name}
            </Text>
            <View 
              style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(displayStatus) }
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusLabel(displayStatus)}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.location}>
              📍 {tournament.city}, {tournament.state}
            </Text>
          </View>
          
          <View style={styles.dateRow}>
            <Text variant="bodySmall" style={styles.dateText}>
              {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    marginBottom: 4,
  },
  location: {
    color: '#424242',
  },
  dateRow: {
    marginTop: 4,
  },
  dateText: {
    color: '#757575',
  },
});

export default TournamentCard;
