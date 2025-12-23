import React from 'react';
import { View, StyleSheet, ScrollView, Image, Linking, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Tournament } from '../../../types';
import { format } from 'date-fns';
import { getTournamentDisplayStatus } from '../../../utils/tournamentStatus';

interface OverviewTabProps {
  tournament: Tournament;
}

const DEFAULT_TOURNAMENT_IMAGE = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop';

const OverviewTab: React.FC<OverviewTabProps> = ({ tournament }) => {
  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'EEEE, MMMM dd, yyyy');
    } catch {
      return 'Date unavailable';
    }
  };

  const displayStatus = getTournamentDisplayStatus(tournament);

  const getStatusLabel = (status: string) => {
    return status.toUpperCase();
  };

  const handleMapPress = () => {
    if (tournament.mapUrl) {
      Linking.openURL(tournament.mapUrl);
    } else {
      // Use full address if available, otherwise fall back to city/state
      const addressQuery = tournament.address 
        ? `${tournament.address}, ${tournament.city}, ${tournament.state}`
        : `${tournament.city}, ${tournament.state}`;
      const query = encodeURIComponent(addressQuery);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Tournament Image */}
      <Image
        source={{ uri: tournament.imageUrl || DEFAULT_TOURNAMENT_IMAGE }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Status */}
        <Text style={styles.status}>{getStatusLabel(displayStatus)}</Text>

        {/* Tournament Name */}
        <Text variant="headlineMedium" style={styles.title}>
          {tournament.name}
        </Text>

        {/* Dates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATES</Text>
          <Text style={styles.sectionValue}>{formatDate(tournament.startDate)}</Text>
          <Text style={styles.sectionValue}>to</Text>
          <Text style={styles.sectionValue}>{formatDate(tournament.endDate)}</Text>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LOCATION</Text>
          {tournament.address && (
            <Text style={styles.sectionValue}>{tournament.address}</Text>
          )}
          <Text style={styles.sectionValue}>
            {tournament.city}, {tournament.state}
          </Text>
          <TouchableOpacity onPress={handleMapPress} style={styles.mapButton}>
            <Text style={styles.mapButtonText}>View on Map →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#6B7280',
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
    marginBottom: 24,
    color: '#000000',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#6B7280',
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  mapButton: {
    marginTop: 8,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default OverviewTab;
