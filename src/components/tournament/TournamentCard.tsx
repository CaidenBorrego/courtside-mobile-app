import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Tournament, TournamentStatus } from '../../types';
import { format } from 'date-fns';
import { getTournamentDisplayStatus } from '../../utils/tournamentStatus';
import { useTheme } from '../../hooks/useTheme';

interface TournamentCardProps {
  tournament: Tournament;
  onPress: (tournamentId: string) => void;
}

const DEFAULT_TOURNAMENT_IMAGE = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop';

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onPress }) => {
  const { colors } = useTheme();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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

  const displayStatus = getTournamentDisplayStatus(tournament);

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

  // Determine which image URL to use
  const imageUrl = imageError || !tournament.imageUrl 
    ? DEFAULT_TOURNAMENT_IMAGE 
    : tournament.imageUrl;

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (error: any) => {
    console.warn('Failed to load tournament image:', tournament.imageUrl, error.nativeEvent?.error);
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <TouchableOpacity 
      onPress={() => onPress(tournament.id)}
      activeOpacity={0.7}
      style={styles.touchable}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Tournament Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { backgroundColor: colors.imagePlaceholder }]}
            resizeMode="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {/* Status Text */}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {getStatusLabel(displayStatus)}
          </Text>

          {/* Tournament Name */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {tournament.name}
          </Text>
          
          {/* Location */}
          <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
            {tournament.city}, {tournament.state}
          </Text>
          
          {/* Dates */}
          <Text style={[styles.dates, { color: colors.textTertiary }]}>
            {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    padding: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  location: {
    fontSize: 14,
    marginBottom: 4,
  },
  dates: {
    fontSize: 13,
  },
});

export default TournamentCard;
