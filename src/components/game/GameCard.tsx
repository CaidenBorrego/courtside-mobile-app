import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { Game, GameStatus } from '../../types';
import { format } from 'date-fns';
import { useTheme } from '../../hooks/useTheme';
import FollowButton from '../common/FollowButton';
import { generateGameLabel, formatTeamName, isPlaceholderTeam } from '../../utils/gameLabels';

interface GameCardProps {
  game: Game;
  showLocation?: boolean;
  showFollowButton?: boolean;
}

const DEFAULT_TEAM_IMAGE = 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=200&h=200&fit=crop';

const GameCard: React.FC<GameCardProps> = ({ 
  game, 
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

  const gameLabel = generateGameLabel(game);

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

    const teamAWon = game.status === GameStatus.COMPLETED && game.scoreA > game.scoreB;
    const teamBWon = game.status === GameStatus.COMPLETED && game.scoreB > game.scoreA;
    const teamALost = game.status === GameStatus.COMPLETED && game.scoreA < game.scoreB;
    const teamBLost = game.status === GameStatus.COMPLETED && game.scoreB < game.scoreA;

    return (
      <View style={styles.scoreContainer}>
        <Text 
          style={[
            styles.score, 
            { color: teamALost ? colors.textTertiary : colors.text },
            teamAWon && styles.winningScore
          ]}
        >
          {game.scoreA}
        </Text>
        <Text style={[styles.scoreSeparator, { color: colors.textTertiary }]}> - </Text>
        <Text 
          style={[
            styles.score, 
            { color: teamBLost ? colors.textTertiary : colors.text },
            teamBWon && styles.winningScore
          ]}
        >
          {game.scoreB}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header with Game Label */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatTime(game.startTime)}
            </Text>
            {game.court && (
              <>
                <Text style={[styles.separator, { color: colors.textTertiary }]}>•</Text>
                <Text style={[styles.courtText, { color: colors.textSecondary }]}>
                  Court {game.court}
                </Text>
              </>
            )}
            {gameLabel && gameLabel.trim() !== '' && (
              <>
                <Text style={[styles.separator, { color: colors.textTertiary }]}>•</Text>
                <View style={[styles.gameLabelBadge, { backgroundColor: colors.textSecondary }]}>
                  <Text style={[styles.gameLabelText, { color: '#FFFFFF' }]}>
                    {gameLabel}
                  </Text>
                </View>
              </>
            )}
          </View>
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
            style={[
              styles.teamImage, 
              { backgroundColor: colors.imagePlaceholder },
              isPlaceholderTeam(game.teamA) && styles.placeholderImage
            ]}
            resizeMode="cover"
          />
          <Text 
            style={[
              styles.teamName,
              { 
                color: game.status === GameStatus.COMPLETED && game.scoreA < game.scoreB 
                  ? colors.textTertiary 
                  : colors.text 
              },
              game.status === GameStatus.COMPLETED && game.scoreA > game.scoreB && styles.winnerText,
              isPlaceholderTeam(game.teamA) && { color: colors.textTertiary, fontStyle: 'italic' }
            ]}
            numberOfLines={2}
          >
            {formatTeamName(game.teamA)}
          </Text>
        </View>

        {/* Score/VS */}
        {renderScore()}

        {/* Team B */}
        <View style={styles.teamSection}>
          <Image
            source={{ uri: game.teamBImageUrl || DEFAULT_TEAM_IMAGE }}
            style={[
              styles.teamImage, 
              { backgroundColor: colors.imagePlaceholder },
              isPlaceholderTeam(game.teamB) && styles.placeholderImage
            ]}
            resizeMode="cover"
          />
          <Text 
            style={[
              styles.teamName,
              { 
                color: game.status === GameStatus.COMPLETED && game.scoreB < game.scoreA 
                  ? colors.textTertiary 
                  : colors.text 
              },
              game.status === GameStatus.COMPLETED && game.scoreB > game.scoreA && styles.winnerText,
              isPlaceholderTeam(game.teamB) && { color: colors.textTertiary, fontStyle: 'italic' }
            ]}
            numberOfLines={2}
          >
            {formatTeamName(game.teamB)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  separator: {
    fontSize: 12,
  },
  courtText: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  score: {
    fontSize: 24,
    fontWeight: '600',
  },
  winningScore: {
    fontWeight: '800',
    fontSize: 26,
  },
  scoreSeparator: {
    fontSize: 18,
    fontWeight: '400',
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  followButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  gameLabelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  gameLabelText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  placeholderImage: {
    opacity: 0.4,
  },
});

export default GameCard;
