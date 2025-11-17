import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Game, GameStatus } from '../../types';
import { format } from 'date-fns';

interface GameCardProps {
  game: Game;
  onPress?: (gameId: string) => void;
  showLocation?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ 
  game, 
  onPress, 
  showLocation = true 
}) => {
  const formatTime = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, h:mm a');
    } catch (error) {
      return 'Time TBD';
    }
  };

  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case GameStatus.IN_PROGRESS:
        return '#4caf50';
      case GameStatus.SCHEDULED:
        return '#2196f3';
      case GameStatus.COMPLETED:
        return '#9e9e9e';
      case GameStatus.CANCELLED:
        return '#f44336';
      default:
        return '#757575';
    }
  };

  const getStatusLabel = (status: GameStatus) => {
    switch (status) {
      case GameStatus.IN_PROGRESS:
        return 'Live';
      case GameStatus.SCHEDULED:
        return 'Scheduled';
      case GameStatus.COMPLETED:
        return 'Final';
      case GameStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  const renderScore = () => {
    if (game.status === GameStatus.SCHEDULED) {
      return (
        <View style={styles.scoreContainer}>
          <Text variant="bodyMedium" style={styles.vsText}>vs</Text>
        </View>
      );
    }

    return (
      <View style={styles.scoreContainer}>
        <Text variant="headlineSmall" style={styles.score}>
          {game.scoreA}
        </Text>
        <Text variant="bodyMedium" style={styles.scoreSeparator}>-</Text>
        <Text variant="headlineSmall" style={styles.score}>
          {game.scoreB}
        </Text>
      </View>
    );
  };

  const cardContent = (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          <Text variant="bodySmall" style={styles.timeText}>
            {formatTime(game.startTime)}
          </Text>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(game.status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusLabel(game.status)}
            </Text>
          </View>
        </View>

        <View style={styles.teamsContainer}>
          <View style={styles.teamRow}>
            <Text 
              variant="titleMedium" 
              style={[
                styles.teamName,
                game.status === GameStatus.COMPLETED && game.scoreA > game.scoreB && styles.winnerText
              ]}
            >
              {game.teamA}
            </Text>
          </View>

          {renderScore()}

          <View style={styles.teamRow}>
            <Text 
              variant="titleMedium" 
              style={[
                styles.teamName,
                game.status === GameStatus.COMPLETED && game.scoreB > game.scoreA && styles.winnerText
              ]}
            >
              {game.teamB}
            </Text>
          </View>
        </View>

        {showLocation && game.locationId && (
          <View style={styles.locationRow}>
            <Text variant="bodySmall" style={styles.locationText}>
              📍 Location ID: {game.locationId}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={() => onPress(game.id)}
        activeOpacity={0.7}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
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
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    color: '#757575',
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
  teamsContainer: {
    alignItems: 'center',
  },
  teamRow: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  teamName: {
    fontWeight: '600',
    textAlign: 'center',
  },
  winnerText: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  score: {
    fontWeight: 'bold',
    color: '#424242',
  },
  scoreSeparator: {
    marginHorizontal: 12,
    color: '#757575',
  },
  vsText: {
    color: '#757575',
    fontStyle: 'italic',
  },
  locationRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  locationText: {
    color: '#757575',
  },
});

export default GameCard;
