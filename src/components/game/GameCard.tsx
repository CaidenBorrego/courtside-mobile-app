import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { Game, GameStatus } from '../../types';
import { format } from 'date-fns';
import { useTheme } from '../../hooks/useTheme';
import FollowButton from '../common/FollowButton';

interface GameCardProps {
  game: Game;
  onPress?: (gameId: string) => void;
  showLocation?: boolean;
  showFollowButton?: boolean;
}

const DEFAULT_TEAM_IMAGE = 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=200&h=200&fit=crop';

const GameCard: React.FC<GameCardProps> = ({ 
  game, 
  onPress, 
  showLocation = true,
  showFollowButton = true
}) => {
  const { colors } = useTheme();

  const formatTime = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, h:mm a');
    } catch {
      return 'Time TBD';
    }
  };

  const getStatusLabel = (status: GameStatus) => {
    switch (status) {
      case GameStatus.IN_PROGRESS:
        return 'LIVE';
      case GameStatus.SCHEDULED:
        return 'SCHEDULED';
      case GameStatus.COMPLETED:
        return 'FINAL';
      case GameStatus.CANCELLED:
        return 'CANCELLED';
      default:
        return String(status).toUpperCase();
    }
  };

  const renderScore = () => {
    if (game.status === GameStatus.SCHEDULED) {
      return (
        <View style={styles.scoreContainer}>
          <Text style={[styles.vsText, { color: colors.textTertiary }]}>VS</Text>
        </View>
      );
    }

    return (
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color: colors.text }]}>
          {game.scoreA}
        </Text>
        <Text style={[styles.scoreSeparator, { color: colors.textTertiary }]}>-</Text>
        <Text style={[styles.score, { color: colors.text }]}>
          {game.scoreB}
        </Text>
      </View>
    );
  };

  const cardContent = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.timeText, { color: colors.textSecondary }]}>
          {formatTime(game.startTime)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {getStatusLabel(game.status)}
          </Text>
        </View>
      </View>

      {/* Teams */}
      <View style={styles.teamsContainer}>
        {/* Team A */}
        <View style={styles.teamSection}>
          <Image
            source={{ uri: game.teamAImageUrl || DEFAULT_TEAM_IMAGE }}
            style={[styles.teamImage, { backgroundColor: colors.imagePlaceholder }]}
            resizeMode="cover"
          />
          <Text 
            style={[
              styles.teamName,
              { color: colors.text },
              game.status === GameStatus.COMPLETED && game.scoreA > game.scoreB && styles.winnerText
            ]}
            numberOfLines={2}
          >
            {game.teamA}
          </Text>
        </View>

        {/* Score/VS */}
        {renderScore()}

        {/* Team B */}
        <View style={styles.teamSection}>
          <Image
            source={{ uri: game.teamBImageUrl || DEFAULT_TEAM_IMAGE }}
            style={[styles.teamImage, { backgroundColor: colors.imagePlaceholder }]}
            resizeMode="cover"
          />
          <Text 
            style={[
              styles.teamName,
              { color: colors.text },
              game.status === GameStatus.COMPLETED && game.scoreB > game.scoreA && styles.winnerText
            ]}
            numberOfLines={2}
          >
            {game.teamB}
          </Text>
        </View>
      </View>

      {/* Follow Button */}
      {showFollowButton && (
        <View style={styles.followButtonContainer}>
          <FollowButton
            itemId={game.id}
            itemType="game"
            itemName={`${game.teamA} vs ${game.teamB}`}
            compact
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={() => onPress(game.id)}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{cardContent}</View>;
};

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  winnerText: {
    fontWeight: '700',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  score: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreSeparator: {
    fontSize: 18,
    marginVertical: 4,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  followButtonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default GameCard;
