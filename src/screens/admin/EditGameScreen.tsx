import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Modal,
} from 'react-native';
import { Text, TextInput, Card, Divider, SegmentedButtons, Button as PaperButton, Banner, Dialog, Portal } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseService } from '../../services/firebase';
import { gameUpdateService } from '../../services/game/GameUpdateService';
import { Game, GameStatus, UserRole, RootStackParamList } from '../../types';
import { Timestamp } from 'firebase/firestore';
import Button from '../../components/common/Button';

type EditGameRouteProp = RouteProp<RootStackParamList & { EditGame: { gameId: string } }, 'EditGame'>;
type EditGameNavigationProp = StackNavigationProp<RootStackParamList>;

const EditGameScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigation = useNavigation<EditGameNavigationProp>();
  const route = useRoute<EditGameRouteProp>();
  const { gameId } = route.params;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPlaceholders, setHasPlaceholders] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [tieGameWarning, setTieGameWarning] = useState<string>('');
  const [downstreamGames, setDownstreamGames] = useState<Game[]>([]);
  const [showCascadeWarning, setShowCascadeWarning] = useState(false);
  const [upstreamGames, setUpstreamGames] = useState<Game[]>([]);

  // Form state
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [status, setStatus] = useState<GameStatus>(GameStatus.SCHEDULED);
  const [court, setCourt] = useState('');
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dependsOnGames, setDependsOnGames] = useState<string[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [winnerFeedsIntoGame, setWinnerFeedsIntoGame] = useState<string>('');
  const [loserFeedsIntoGame, setLoserFeedsIntoGame] = useState<string>('');
  
  // Game selector modal state
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [gameSelectorType, setGameSelectorType] = useState<'winner' | 'loser'>('winner');
  const [gameSearchQuery, setGameSearchQuery] = useState('');

  // Check if user has access
  const isAdmin = userProfile?.role === UserRole.ADMIN;
  const isScorekeeper = userProfile?.role === UserRole.SCOREKEEPER;
  const hasAccess = isAdmin || isScorekeeper;

  const loadGame = useCallback(async () => {
    try {
      setLoading(true);
      const gameData = await firebaseService.getGame(gameId);
      setGame(gameData);

      // Check for placeholder teams
      const hasPlaceholderTeams = gameUpdateService.hasPlaceholderTeams(gameData);
      setHasPlaceholders(hasPlaceholderTeams);

      // Set form values
      setTeamA(gameData.teamA);
      setTeamB(gameData.teamB);
      setScoreA(gameData.scoreA.toString());
      setScoreB(gameData.scoreB.toString());
      setStatus(gameData.status);
      setCourt(gameData.court || '');
      
      // Convert Firestore Timestamp to Date object
      const date = gameData.startTime.toDate();
      setStartTime(date);
      
      setDependsOnGames(gameData.dependsOnGames || []);
      setWinnerFeedsIntoGame(gameData.winnerFeedsIntoGame || '');
      setLoserFeedsIntoGame(gameData.loserFeedsIntoGame || '');

      // Load downstream games to show cascade warnings
      try {
        const downstream = await gameUpdateService.getDownstreamGames(gameId);
        setDownstreamGames(downstream);
      } catch (error) {
        console.error('Error loading downstream games:', error);
        // Non-critical error, continue loading
      }

      // Load upstream games (dependencies) to display
      if (gameData.dependsOnGames && gameData.dependsOnGames.length > 0) {
        try {
          const upstream = await Promise.all(
            gameData.dependsOnGames.map(id => firebaseService.getGame(id))
          );
          setUpstreamGames(upstream);
        } catch (error) {
          console.error('Error loading upstream games:', error);
          // Non-critical error, continue loading
        }
      }

      // Load available games from same division for dependency selection
      const divisionGames = await firebaseService.getGamesByDivision(gameData.divisionId);
      // Filter out current game and games that would create circular dependencies
      const available = divisionGames.filter(g => 
        g.id !== gameId && 
        !g.dependsOnGames?.includes(gameId)
      );
      setAvailableGames(available);
    } catch (error) {
      console.error('Error loading game:', error);
      Alert.alert('Error', 'Failed to load game details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [gameId, navigation]);

  useEffect(() => {
    if (hasAccess) {
      loadGame();
    } else {
      setLoading(false);
    }
  }, [hasAccess, loadGame]);

  // Reload upstream games when dependencies change
  useEffect(() => {
    const loadUpstreamGames = async () => {
      if (dependsOnGames.length > 0) {
        try {
          const upstream = await Promise.all(
            dependsOnGames.map(id => firebaseService.getGame(id))
          );
          setUpstreamGames(upstream);
        } catch (error) {
          console.error('Error loading upstream games:', error);
        }
      } else {
        setUpstreamGames([]);
      }
    };
    
    loadUpstreamGames();
  }, [dependsOnGames]);

  // Automatic status management based on scores
  useEffect(() => {
    // Clear previous messages
    setStatusMessage('');
    setTieGameWarning('');

    // Only apply automatic status management if not loading and game exists
    if (loading || !game) return;

    const scoreANum = parseInt(scoreA);
    const scoreBNum = parseInt(scoreB);

    // Skip if scores are invalid
    if (isNaN(scoreANum) || isNaN(scoreBNum)) return;

    // Case 1: Both scores are zero - reset to SCHEDULED
    if (scoreANum === 0 && scoreBNum === 0) {
      if (status === GameStatus.COMPLETED) {
        setStatus(GameStatus.SCHEDULED);
        setStatusMessage('Game reset to scheduled');
      }
      return;
    }

    // Case 2: Both scores are greater than zero
    if (scoreANum > 0 && scoreBNum > 0) {
      // Check for tie game
      if (scoreANum === scoreBNum) {
        setTieGameWarning('Tie game detected - please verify scores');
        return;
      }

      // Scores are different - automatically set to COMPLETED
      if (status !== GameStatus.COMPLETED && status !== GameStatus.CANCELLED) {
        setStatus(GameStatus.COMPLETED);
        setStatusMessage('Game marked as complete');
      }
    }
  }, [scoreA, scoreB, loading, game, status]);

  // Update placeholder status when team names change
  useEffect(() => {
    if (teamA && teamB) {
      const hasPlaceholderTeams = gameUpdateService.hasPlaceholderTeams({ teamA, teamB } as Game);
      setHasPlaceholders(hasPlaceholderTeams);
    }
  }, [teamA, teamB]);


  const handleSave = async () => {
    if (!game) return;

    // Clear previous validation errors
    setValidationErrors([]);

    // Ensure scores default to 0 if empty
    const finalScoreA = scoreA === '' || scoreA === null || scoreA === undefined ? '0' : scoreA;
    const finalScoreB = scoreB === '' || scoreB === null || scoreB === undefined ? '0' : scoreB;

    // Validation
    const scoreANum = parseInt(finalScoreA);
    const scoreBNum = parseInt(finalScoreB);

    if (isNaN(scoreANum) || isNaN(scoreBNum) || scoreANum < 0 || scoreBNum < 0) {
      setValidationErrors(['Please enter valid scores (0 or greater)']);
      return;
    }

    // Validate max 2 dependencies
    if (dependsOnGames.length > 2) {
      setValidationErrors(['A game can depend on a maximum of 2 other games']);
      return;
    }

    // Check if this update will affect downstream games
    const willAffectDownstream = downstreamGames.length > 0 && (
      game.status === 'completed' || 
      status === 'completed' ||
      (game.scoreA !== scoreANum || game.scoreB !== scoreBNum)
    );

    // Show cascade warning if needed
    if (willAffectDownstream && !showCascadeWarning) {
      const gamesList = downstreamGames
        .map(g => `• ${g.teamA} vs ${g.teamB}${g.gameLabel ? ` (${g.gameLabel})` : ''}`)
        .join('\n');
      
      Alert.alert(
        'Cascade Update Warning',
        `This game feeds into other games. Changes will cascade to:\n\n${gamesList}\n\nDo you want to continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: () => {
              setShowCascadeWarning(true);
              // Trigger save again after user confirms
              setTimeout(() => handleSave(), 100);
            },
          },
        ]
      );
      return;
    }

    // Reset cascade warning flag for next save
    setShowCascadeWarning(false);

    // Prepare update data
    const updates: any = {
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      scoreA: scoreANum,
      scoreB: scoreBNum,
      status,
      court: court.trim() || undefined,
      startTime: Timestamp.fromDate(startTime),
      winnerFeedsIntoGame: winnerFeedsIntoGame || undefined,
      loserFeedsIntoGame: loserFeedsIntoGame || undefined,
    };

    try {
      setSaving(true);

      // Use GameUpdateService instead of direct FirebaseService call
      const result = await gameUpdateService.updateGame(gameId, updates);

      if (!result.success) {
        setValidationErrors(result.errors);
        return;
      }

      // Display warnings if any
      if (result.warnings.length > 0) {
        Alert.alert('Warning', result.warnings.join('\n'));
      }

      // Build success message
      let successMessage = 'Game updated successfully';
      if (result.affectedGames.length > 0) {
        successMessage += `\n\n${result.affectedGames.length} dependent game${result.affectedGames.length > 1 ? 's' : ''} updated automatically`;
      }

      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error updating game:', error);
      setValidationErrors(['Failed to update game']);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!game) return;

    Alert.alert(
      'Delete Game',
      `Are you sure you want to delete this game?\n\n${game.teamA} vs ${game.teamB}${game.gameLabel ? `\n(${game.gameLabel})` : ''}\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await firebaseService.deleteGame(gameId);
              Alert.alert('Success', 'Game deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              console.error('Error deleting game:', error);
              Alert.alert('Error', 'Failed to delete game');
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const openGameSelector = (type: 'winner' | 'loser') => {
    setGameSelectorType(type);
    setGameSearchQuery('');
    setShowGameSelector(true);
  };

  const selectGame = (gameId: string) => {
    if (gameSelectorType === 'winner') {
      setWinnerFeedsIntoGame(gameId);
    } else {
      setLoserFeedsIntoGame(gameId);
    }
    setShowGameSelector(false);
  };

  const getSelectedGameLabel = (gameId: string) => {
    if (!gameId) return 'None';
    const game = availableGames.find(g => g.id === gameId);
    if (!game) return 'Unknown Game';
    return game.gameLabel || `${game.teamA} vs ${game.teamB}`;
  };

  // Calculate how many games are feeding into each game
  const getGameFeedCount = (targetGameId: string): { count: number; games: Game[] } => {
    const feedingGames = availableGames.filter(g => 
      g.winnerFeedsIntoGame === targetGameId || g.loserFeedsIntoGame === targetGameId
    );
    return { count: feedingGames.length, games: feedingGames };
  };

  // Get games that feed into the current game
  const gamesFeedingIntoCurrentGame = availableGames.filter(g => 
    g.winnerFeedsIntoGame === gameId || g.loserFeedsIntoGame === gameId
  );

  // Check if a game can accept more feeds
  const canGameAcceptFeed = (targetGameId: string): boolean => {
    const { count } = getGameFeedCount(targetGameId);
    // If we're changing an existing feed, we need to account for that
    const currentFeedToThisGame = (
      (gameSelectorType === 'winner' && winnerFeedsIntoGame === targetGameId) ||
      (gameSelectorType === 'loser' && loserFeedsIntoGame === targetGameId)
    );
    
    // If already feeding into this game, it's always allowed (we're just keeping it)
    if (currentFeedToThisGame) return true;
    
    // Otherwise, check if there's room for one more
    return count < 2;
  };

  const filteredAvailableGames = availableGames.filter(g => {
    if (g.id === gameId) return false;
    if (gameSelectorType === 'winner' && g.id === loserFeedsIntoGame) return false;
    if (gameSelectorType === 'loser' && g.id === winnerFeedsIntoGame) return false;
    
    if (!gameSearchQuery.trim()) return true;
    
    const query = gameSearchQuery.toLowerCase();
    const labelMatch = g.gameLabel?.toLowerCase().includes(query);
    const teamAMatch = g.teamA.toLowerCase().includes(query);
    const teamBMatch = g.teamB.toLowerCase().includes(query);
    
    return labelMatch || teamAMatch || teamBMatch;
  });

  if (!hasAccess) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text variant="headlineMedium" style={styles.accessDeniedTitle}>
          Access Denied
        </Text>
        <Text variant="bodyLarge" style={styles.accessDeniedText}>
          You do not have permission to edit games.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="headlineMedium">Game Not Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {hasPlaceholders && (
          <Banner
            visible={true}
            icon="alert"
            style={styles.warningBanner}
          >
            Teams must be determined before scores can be entered
          </Banner>
        )}

      {downstreamGames.length > 0 && (
        <Banner
          visible={true}
          icon="information"
          style={styles.infoBanner}
        >
          This game feeds into other games - changes will cascade
        </Banner>
      )}

      {tieGameWarning && (
        <Banner
          visible={true}
          icon="alert"
          style={styles.warningBanner}
        >
          {tieGameWarning}
        </Banner>
      )}

      {statusMessage && (
        <Banner
          visible={true}
          icon="check-circle"
          style={styles.successBanner}
        >
          {statusMessage}
        </Banner>
      )}

      {validationErrors.length > 0 && (
        <Banner
          visible={true}
          icon="alert-circle"
          style={styles.errorBanner}
        >
          {validationErrors.join('\n')}
        </Banner>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Game Details
          </Text>
          <View style={styles.teamNamesContainer}>
            <View style={styles.teamNameInput}>
              <TextInput
                label="Team A"
                mode="outlined"
                value={teamA}
                onChangeText={setTeamA}
                placeholder="Team A name"
                style={styles.input}
              />
            </View>
            <Text variant="headlineSmall" style={styles.vsText}>vs</Text>
            <View style={styles.teamNameInput}>
              <TextInput
                label="Team B"
                mode="outlined"
                value={teamB}
                onChangeText={setTeamB}
                placeholder="Team B name"
                style={styles.input}
              />
            </View>
          </View>
          {game.gameLabel && (
            <Text variant="bodySmall" style={styles.gameLabel}>
              {game.gameLabel}
            </Text>
          )}
          {hasPlaceholders && (
            <Text variant="bodySmall" style={styles.placeholderWarning}>
              ⚠️ Placeholder teams detected - scores cannot be entered until teams are determined
            </Text>
          )}
        </Card.Content>
      </Card>

      {upstreamGames.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Dependencies
            </Text>
            <Text variant="bodySmall" style={styles.helperText}>
              These games must complete before this game can start
            </Text>
            <Divider style={styles.divider} />
            {upstreamGames.map((upstreamGame) => (
              <View key={upstreamGame.id}>
                <View style={styles.dependencyItem}>
                  <View style={styles.dependencyInfo}>
                    <Text variant="bodyMedium">
                      {upstreamGame.teamA} vs {upstreamGame.teamB}
                    </Text>
                    {upstreamGame.gameLabel && (
                      <Text variant="bodySmall" style={styles.dependencyLabel}>
                        {upstreamGame.gameLabel}
                      </Text>
                    )}
                    <Text 
                      variant="bodySmall" 
                      style={[
                        styles.dependencyStatus,
                        upstreamGame.status === 'completed' 
                          ? styles.statusCompleted 
                          : styles.statusIncomplete
                      ]}
                    >
                      Status: {upstreamGame.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Divider />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Score
          </Text>
          <View style={styles.scoreContainer}>
            <View style={styles.scoreInput}>
              <Text variant="bodyMedium" style={styles.teamLabel}>
                {teamA}
              </Text>
              <TextInput
                mode="outlined"
                value={scoreA}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setScoreA(numericValue);
                }}
                onBlur={() => {
                  // Default to 0 if empty
                  if (scoreA === '' || scoreA === null || scoreA === undefined) {
                    setScoreA('0');
                  }
                }}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={styles.input}
                disabled={hasPlaceholders}
                placeholder="0"
              />
            </View>
            <View style={styles.scoreInput}>
              <Text variant="bodyMedium" style={styles.teamLabel}>
                {teamB}
              </Text>
              <TextInput
                mode="outlined"
                value={scoreB}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setScoreB(numericValue);
                }}
                onBlur={() => {
                  // Default to 0 if empty
                  if (scoreB === '' || scoreB === null || scoreB === undefined) {
                    setScoreB('0');
                  }
                }}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={styles.input}
                disabled={hasPlaceholders}
                placeholder="0"
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Status
          </Text>
          <SegmentedButtons
            value={status}
            onValueChange={(value) => {
              const newStatus = value as GameStatus;
              
              // Warn if changing from COMPLETED back to SCHEDULED
              if (status === GameStatus.COMPLETED && newStatus === GameStatus.SCHEDULED) {
                Alert.alert(
                  'Reset Game Status',
                  'Changing status back to Scheduled will reset scores to 0-0 and may affect downstream games. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Continue',
                      onPress: () => {
                        setStatus(newStatus);
                        setScoreA('0');
                        setScoreB('0');
                        setStatusMessage('Game reset to scheduled - scores cleared');
                      },
                    },
                  ]
                );
              } else {
                // Allow all other status changes without confirmation
                setStatus(newStatus);
              }
            }}
            theme={{
              colors: {
                secondaryContainer: '#2563EB',
                onSecondaryContainer: '#FFFFFF',
                onSurface: '#000000',
                outline: '#D1D5DB',
              }
            }}
            buttons={[
              { 
                value: GameStatus.SCHEDULED, 
                label: 'Scheduled',
                // Allow scheduled even with placeholders - it's just a status
                disabled: false,
              },
              { 
                value: GameStatus.COMPLETED, 
                label: 'Final',
                // Only disable Final for placeholder games since it requires scores
                disabled: hasPlaceholders,
              },
              { 
                value: GameStatus.CANCELLED, 
                label: 'Cancelled',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Game Information
          </Text>
          <TextInput
            label="Court"
            mode="outlined"
            value={court}
            onChangeText={setCourt}
            placeholder="e.g., Court 1"
            style={styles.input}
          />
          
          <Text variant="bodyMedium" style={styles.inputLabel}>
            Start Date & Time
          </Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                📅 {format(startTime, 'MMM dd, yyyy')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                🕐 {format(startTime, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Dialog
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          style={styles.pickerDialog}
        >
          <Dialog.Title style={styles.pickerDialogTitle}>
            Select Date
          </Dialog.Title>
          <Dialog.Content style={styles.pickerDialogContent}>
            <DateTimePicker
              value={startTime}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setStartTime(selectedDate);
                }
              }}
              textColor="#000000"
              themeVariant="light"
              style={styles.dateTimePicker}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowDatePicker(false)}
            />
            <Button
              title="Done"
              mode="contained"
              onPress={() => setShowDatePicker(false)}
            />
          </Dialog.Actions>
        </Dialog>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <Dialog
          visible={showTimePicker}
          onDismiss={() => setShowTimePicker(false)}
          style={styles.pickerDialog}
        >
          <Dialog.Title style={styles.pickerDialogTitle}>
            Select Time
          </Dialog.Title>
          <Dialog.Content style={styles.pickerDialogContent}>
            <DateTimePicker
              value={startTime}
              mode="time"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setStartTime(selectedDate);
                }
              }}
              textColor="#000000"
              themeVariant="light"
              style={styles.dateTimePicker}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowTimePicker(false)}
            />
            <Button
              title="Done"
              mode="contained"
              onPress={() => setShowTimePicker(false)}
            />
          </Dialog.Actions>
        </Dialog>
      )}

      {isAdmin && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Game Advancement
            </Text>
            <Text variant="bodySmall" style={styles.helperText}>
              Choose where the winner and loser of this game advance to
            </Text>
            
            <Text variant="bodyMedium" style={styles.inputLabel}>
              Winner Advances To
            </Text>
            <TouchableOpacity 
              style={[
                styles.gameSelectorButton,
                winnerFeedsIntoGame && styles.gameSelectorButtonSelected
              ]}
              onPress={() => openGameSelector('winner')}
            >
              <View style={styles.gameSelectorButtonContent}>
                {winnerFeedsIntoGame && (
                  <Text style={styles.gameSelectorSelectedIndicator}>✓</Text>
                )}
                <Text style={[
                  styles.gameSelectorButtonText,
                  winnerFeedsIntoGame && styles.gameSelectorButtonTextSelected
                ]}>
                  {getSelectedGameLabel(winnerFeedsIntoGame)}
                </Text>
              </View>
              <Text style={styles.gameSelectorButtonIcon}>▼</Text>
            </TouchableOpacity>
            
            <Text variant="bodyMedium" style={styles.inputLabel}>
              Loser Advances To
            </Text>
            <TouchableOpacity 
              style={[
                styles.gameSelectorButton,
                loserFeedsIntoGame && styles.gameSelectorButtonSelected
              ]}
              onPress={() => openGameSelector('loser')}
            >
              <View style={styles.gameSelectorButtonContent}>
                {loserFeedsIntoGame && (
                  <Text style={styles.gameSelectorSelectedIndicator}>✓</Text>
                )}
                <Text style={[
                  styles.gameSelectorButtonText,
                  loserFeedsIntoGame && styles.gameSelectorButtonTextSelected
                ]}>
                  {getSelectedGameLabel(loserFeedsIntoGame)}
                </Text>
              </View>
              <Text style={styles.gameSelectorButtonIcon}>▼</Text>
            </TouchableOpacity>

            {gamesFeedingIntoCurrentGame.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodyMedium" style={styles.inputLabel}>
                  Games Feeding Into This Game
                </Text>
                <Text variant="bodySmall" style={styles.helperText}>
                  This game receives teams from the following games
                </Text>
                {gamesFeedingIntoCurrentGame.map((upstreamGame) => {
                  const isWinnerFeed = upstreamGame.winnerFeedsIntoGame === gameId;
                  const isLoserFeed = upstreamGame.loserFeedsIntoGame === gameId;
                  return (
                    <View key={upstreamGame.id} style={styles.feedingGameItem}>
                      <View style={styles.feedingGameInfo}>
                        <Text variant="bodyMedium" style={styles.feedingGameTitle}>
                          {upstreamGame.gameLabel || `${upstreamGame.teamA} vs ${upstreamGame.teamB}`}
                        </Text>
                        <View style={styles.feedTypeBadgeContainer}>
                          {isWinnerFeed && (
                            <View style={[styles.feedTypeBadge, styles.feedTypeWinner]}>
                              <Text style={styles.feedTypeText}>WINNER</Text>
                            </View>
                          )}
                          {isLoserFeed && (
                            <View style={[styles.feedTypeBadge, styles.feedTypeLoser]}>
                              <Text style={styles.feedTypeText}>LOSER</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </Card.Content>
        </Card>
      )}

      <Modal
        visible={showGameSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGameSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Select {gameSelectorType === 'winner' ? 'Winner' : 'Loser'} Destination
            </Text>
            
            <TextInput
              mode="outlined"
              placeholder="Search by game label or team name..."
              value={gameSearchQuery}
              onChangeText={setGameSearchQuery}
              left={<TextInput.Icon icon="magnify" />}
              right={
                gameSearchQuery ? (
                  <TextInput.Icon 
                    icon="close" 
                    onPress={() => setGameSearchQuery('')}
                  />
                ) : null
              }
              style={styles.searchInput}
              outlineColor="#E5E7EB"
              activeOutlineColor="#2563EB"
            />
            
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={styles.gameOption}
                onPress={() => selectGame('')}
              >
                <Text style={styles.gameOptionText}>None</Text>
              </TouchableOpacity>
              <Divider style={styles.dialogDivider} />
              {filteredAvailableGames.map((game) => {
                const feedInfo = getGameFeedCount(game.id);
                const canAccept = canGameAcceptFeed(game.id);
                const isFull = feedInfo.count >= 2;
                
                return (
                  <View key={game.id}>
                    <TouchableOpacity
                      style={[
                        styles.gameOption,
                        !canAccept && styles.gameOptionDisabled
                      ]}
                      onPress={() => {
                        if (canAccept) {
                          selectGame(game.id);
                        } else {
                          Alert.alert(
                            'Game Full',
                            `This game already has 2 games feeding into it:\n\n${feedInfo.games.map(g => `• ${g.gameLabel || `${g.teamA} vs ${g.teamB}`}`).join('\n')}\n\nA game can only have a maximum of 2 source games.`
                          );
                        }
                      }}
                      disabled={!canAccept}
                    >
                      <View style={styles.gameOptionContent}>
                        <View style={styles.gameOptionHeader}>
                          <Text style={[
                            styles.gameOptionTitle,
                            !canAccept && styles.gameOptionTitleDisabled
                          ]}>
                            {game.gameLabel || `${game.teamA} vs ${game.teamB}`}
                          </Text>
                          {feedInfo.count > 0 && (
                            <View style={[
                              styles.feedCountBadge,
                              isFull && styles.feedCountBadgeFull
                            ]}>
                              <Text style={[
                                styles.feedCountText,
                                isFull && styles.feedCountTextFull
                              ]}>
                                {feedInfo.count}/2
                              </Text>
                            </View>
                          )}
                        </View>
                        {game.gameLabel && (
                          <Text style={[
                            styles.gameOptionSubtitle,
                            !canAccept && styles.gameOptionSubtitleDisabled
                          ]}>
                            {game.teamA} vs {game.teamB}
                          </Text>
                        )}
                        {feedInfo.count > 0 && (
                          <Text style={styles.feedingGamesText}>
                            Fed by: {feedInfo.games.map(g => g.gameLabel || `${g.teamA} vs ${g.teamB}`).join(', ')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <Divider />
                  </View>
                );
              })}
              {filteredAvailableGames.length === 0 && (
                <Text style={styles.noGamesText}>
                  {gameSearchQuery ? 'No matching games found' : 'No available games'}
                </Text>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowGameSelector(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>

      <View style={styles.actionsFooter}>
        <View style={styles.leftActions}>
          <PaperButton
            mode="outlined"
            onPress={handleDelete}
            disabled={saving}
            style={styles.deleteButton}
            textColor="#EF4444"
          >
            Delete
          </PaperButton>
        </View>
        <View style={styles.rightActions}>
          <Button
            title="Cancel"
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={saving}
          />
          <PaperButton
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          >
            Save Changes
          </PaperButton>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 16,
  },
  warningBanner: {
    marginBottom: 16,
    backgroundColor: '#FFF3CD',
  },
  infoBanner: {
    marginBottom: 16,
    backgroundColor: '#D1ECF1',
  },
  successBanner: {
    marginBottom: 16,
    backgroundColor: '#D4EDDA',
  },
  errorBanner: {
    marginBottom: 16,
    backgroundColor: '#F8D7DA',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  gameInfo: {
    fontWeight: '600',
    marginBottom: 4,
  },
  gameLabel: {
    color: '#6B7280',
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  scoreInput: {
    flex: 1,
  },
  teamLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 8,
    marginTop: 8,
    fontWeight: '500',
    color: '#000000',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateTimeButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  dateTimePicker: {
    width: '100%',
    height: 200,
  },
  pickerDialog: {
    backgroundColor: '#FFFFFF',
  },
  pickerDialogTitle: {
    color: '#000000',
    fontWeight: '600',
  },
  pickerDialogContent: {
    paddingHorizontal: 0,
  },
  helperText: {
    color: '#6B7280',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 8,
  },
  dependencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dependencyInfo: {
    flex: 1,
    marginRight: 12,
  },
  dependencyLabel: {
    color: '#6B7280',
    marginTop: 2,
  },
  dependencyStatus: {
    marginTop: 4,
    fontWeight: '500',
  },
  statusCompleted: {
    color: '#10B981',
  },
  statusIncomplete: {
    color: '#F59E0B',
  },
  dependencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dependencyCounter: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dependencyCountText: {
    fontWeight: '600',
    color: '#000000',
    fontSize: 14,
  },
  selectedLabel: {
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  availableLabel: {
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  selectedGameText: {
    fontWeight: '600',
    color: '#000000',
  },
  dependencyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  feedTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  feedTypeBadgeContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  feedTypeWinner: {
    backgroundColor: '#D4EDDA',
  },
  feedTypeLoser: {
    backgroundColor: '#FFF3CD',
  },
  feedTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  feedingGameItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  feedingGameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedingGameTitle: {
    flex: 1,
    marginRight: 8,
  },
  gameSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  gameSelectorButtonSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  gameSelectorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameSelectorSelectedIndicator: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: 'bold',
    marginRight: 8,
  },
  gameSelectorButtonText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  gameSelectorButtonTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  gameSelectorButtonIcon: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  modalScrollView: {
    maxHeight: 250,
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  dialogDivider: {
    backgroundColor: '#E5E7EB',
  },
  gameOption: {
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  gameOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  gameOptionContent: {
    flex: 1,
  },
  gameOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gameOptionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  gameOptionTitleDisabled: {
    color: '#9CA3AF',
  },
  gameOptionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  gameOptionSubtitleDisabled: {
    color: '#9CA3AF',
  },
  gameOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  feedingGamesText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  feedCountBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  feedCountBadgeFull: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  feedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  feedCountTextFull: {
    color: '#DC2626',
  },
  noGamesText: {
    padding: 16,
    textAlign: 'center',
    color: '#6B7280',
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  leftActions: {
    flexDirection: 'row',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  saveButton: {
    flex: 0,
    minWidth: 120,
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  teamNamesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  teamNameInput: {
    flex: 1,
  },
  vsText: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  placeholderWarning: {
    color: '#F59E0B',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default EditGameScreen;
