import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Keyboard,
} from 'react-native';
import {
  Text,
  FAB,
  Dialog,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { firebaseService } from '../../services/firebase';
import {
  Tournament,
  Division,
  Game,
  GameStatus,
  Location,
} from '../../types';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import Button from '../../components/common/Button';

type ManageTournamentScreenRouteProp = RouteProp<
  { ManageTournament: { tournamentId: string } },
  'ManageTournament'
>;

const ManageTournamentScreen: React.FC = () => {
  const route = useRoute<ManageTournamentScreenRouteProp>();
  const { tournamentId } = route.params;

  const navigation = useNavigation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Game dialog state
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [gameForm, setGameForm] = useState({
    divisionId: '',
    teamA: '',
    teamB: '',
    startTime: new Date(),
    court: '',
    gameLabel: '',
  });

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tournamentData, divisionsData, gamesData, locationsData] = await Promise.all([
        firebaseService.getTournament(tournamentId),
        firebaseService.getDivisionsByTournament(tournamentId),
        firebaseService.getGamesByTournament(tournamentId),
        firebaseService.getLocations(),
      ]);
      setTournament(tournamentData);
      setDivisions(divisionsData);
      setGames(gamesData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const [tournamentData, divisionsData, gamesData, locationsData] = await Promise.all([
        firebaseService.getTournament(tournamentId),
        firebaseService.getDivisionsByTournament(tournamentId),
        firebaseService.getGamesByTournament(tournamentId),
        firebaseService.getLocations(),
      ]);
      setTournament(tournamentData);
      setDivisions(divisionsData);
      setGames(gamesData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh tournament data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateGame = () => {
    const now = new Date();
    
    setGameForm({
      divisionId: divisions.length > 0 ? divisions[0].id : '',
      teamA: '',
      teamB: '',
      startTime: now,
      court: '',
      gameLabel: '',
    });
    setShowGameDialog(true);
  };

  const handleEditGame = (game: Game) => {
    (navigation as any).navigate('EditGame', { gameId: game.id });
  };

  const handleSaveGame = async () => {
    if (!gameForm.divisionId || !gameForm.teamA || !gameForm.teamB || !gameForm.startTime) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Use the first location or create a default one if none exist
      let locationId = locations.length > 0 ? locations[0].id : '';
      
      if (!locationId) {
        const defaultLocationId = await firebaseService.createLocation({
          name: 'Default Location',
          address: '',
          city: '',
          state: '',
          createdAt: Timestamp.now(),
        });
        locationId = defaultLocationId;
      }

      const startTime = Timestamp.fromDate(gameForm.startTime);

      await firebaseService.createGame({
        tournamentId,
        divisionId: gameForm.divisionId,
        teamA: gameForm.teamA.trim(),
        teamB: gameForm.teamB.trim(),
        scoreA: 0,
        scoreB: 0,
        startTime,
        locationId,
        court: gameForm.court.trim() || undefined,
        gameLabel: gameForm.gameLabel.trim() || undefined,
        status: GameStatus.SCHEDULED,
        createdAt: Timestamp.now(),
      });
      Alert.alert('Success', 'Game created successfully');
      setShowGameDialog(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving game:', error);
      Alert.alert('Error', 'Failed to save game');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (divisions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineMedium">No Divisions</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          This tournament needs divisions before you can create games.
        </Text>
        <Text variant="bodySmall" style={styles.emptyHint}>
          Contact your administrator to set up divisions.
        </Text>
      </View>
    );
  }

  // Filter games based on search query
  const filteredGames = games.filter((game) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const teamAMatch = game.teamA.toLowerCase().includes(query);
    const teamBMatch = game.teamB.toLowerCase().includes(query);
    const labelMatch = game.gameLabel?.toLowerCase().includes(query);
    
    return teamAMatch || teamBMatch || labelMatch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {tournament?.name}
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Manage games
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          mode="outlined"
          placeholder="Search by team name or game label..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          left={<TextInput.Icon icon="magnify" />}
          right={
            searchQuery ? (
              <TextInput.Icon 
                icon="close" 
                onPress={() => setSearchQuery('')}
              />
            ) : null
          }
          style={styles.searchInput}
          outlineStyle={styles.searchOutline}
        />
        {searchQuery && (
          <Text variant="bodySmall" style={styles.searchResults}>
            {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'} found
          </Text>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
      >
        {filteredGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="titleMedium">
              {searchQuery ? 'No Matching Games' : 'No Games'}
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {searchQuery 
                ? 'Try a different search term' 
                : 'Create games for this tournament'}
            </Text>
          </View>
        ) : (
          filteredGames.map((game) => {
            const division = divisions.find(d => d.id === game.divisionId);
            const location = locations.find(l => l.id === game.locationId);
            
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
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                );
              }

              const teamAWon = game.status === GameStatus.COMPLETED && game.scoreA > game.scoreB;
              const teamBWon = game.status === GameStatus.COMPLETED && game.scoreB > game.scoreA;

              return (
                <View style={styles.scoreContainer}>
                  <Text style={[styles.score, teamAWon && styles.winningScore]}>
                    {game.scoreA}
                  </Text>
                  <Text style={styles.scoreSeparator}> - </Text>
                  <Text style={[styles.score, teamBWon && styles.winningScore]}>
                    {game.scoreB}
                  </Text>
                </View>
              );
            };

            return (
              <View key={game.id} style={styles.gameCardContainer}>
                <View style={styles.card}>
                  {/* Game Label */}
                  {game.gameLabel && (
                    <View style={styles.gameLabelContainer}>
                      <Text style={styles.gameLabelText}>
                        {game.gameLabel}
                      </Text>
                    </View>
                  )}

                  {/* Header */}
                  <View style={styles.header}>
                    <View style={styles.headerLeft}>
                      <Text style={styles.timeText}>
                        {formatTime(game.startTime)}
                      </Text>
                      {game.court && (
                        <>
                          <Text style={styles.separator}>•</Text>
                          <Text style={styles.courtText}>
                            {game.court}
                          </Text>
                        </>
                      )}
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {getStatusLabel(game.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Teams */}
                  <View style={styles.teamsContainer}>
                    {/* Team A */}
                    <View style={styles.teamSection}>
                      <Image
                        source={{ uri: game.teamAImageUrl || 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=200&h=200&fit=crop' }}
                        style={styles.teamImage}
                        resizeMode="cover"
                      />
                      <Text 
                        style={[
                          styles.teamName,
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
                        source={{ uri: game.teamBImageUrl || 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=200&h=200&fit=crop' }}
                        style={styles.teamImage}
                        resizeMode="cover"
                      />
                      <Text 
                        style={[
                          styles.teamName,
                          game.status === GameStatus.COMPLETED && game.scoreB > game.scoreA && styles.winnerText
                        ]}
                        numberOfLines={2}
                      >
                        {game.teamB}
                      </Text>
                    </View>
                  </View>

                  {/* Additional Info */}
                  {(division || location) && (
                    <View style={styles.additionalInfo}>
                      {division && (
                        <Text style={styles.infoText}>
                          {division.name}
                        </Text>
                      )}
                      {location && (
                        <Text style={styles.infoText}>
                          {location.name}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Edit Button */}
                  <View style={styles.editButtonContainer}>
                    <Button
                      title="Edit Game"
                      mode="contained"
                      onPress={() => handleEditGame(game)}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Dialog
        visible={showGameDialog}
        onDismiss={() => setShowGameDialog(false)}
        style={styles.dialog}
      >
          <Dialog.Title style={styles.dialogTitle}>Create Game</Dialog.Title>
          <Text variant="bodySmall" style={styles.dialogSubtitle}>
            Create a basic game. Advanced settings like game advancements and dependencies can be configured after creation by editing the game.
          </Text>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView>
              <TextInput
                label="Game Label"
                value={gameForm.gameLabel}
                onChangeText={(text) => setGameForm({ ...gameForm, gameLabel: text })}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Pool A Game 1, Finals"
                outlineColor="#E5E7EB"
                activeOutlineColor="#000000"
              />
              <Text variant="bodyMedium" style={styles.inputLabel}>
                Division *
              </Text>
              <SegmentedButtons
                value={gameForm.divisionId}
                onValueChange={(value) => setGameForm({ ...gameForm, divisionId: value })}
                buttons={divisions.map((division) => ({
                  value: division.id,
                  label: division.name,
                }))}
                theme={{
                  colors: {
                    secondaryContainer: '#2563EB',
                    onSecondaryContainer: '#FFFFFF',
                    onSurface: '#000000',
                    outline: '#D1D5DB',
                  }
                }}
                style={styles.input}
              />
              <TextInput
                label="Team A *"
                value={gameForm.teamA}
                onChangeText={(text) => setGameForm({ ...gameForm, teamA: text })}
                mode="outlined"
                style={styles.input}
                outlineColor="#E5E7EB"
                activeOutlineColor="#000000"
              />
              <TextInput
                label="Team B *"
                value={gameForm.teamB}
                onChangeText={(text) => setGameForm({ ...gameForm, teamB: text })}
                mode="outlined"
                style={styles.input}
                outlineColor="#E5E7EB"
                activeOutlineColor="#000000"
              />
              
              <Text variant="bodyMedium" style={styles.inputLabel}>
                Start Date & Time *
              </Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateTimeButtonText}>
                    📅 {format(gameForm.startTime, 'MMM dd, yyyy')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateTimeButtonText}>
                    🕐 {format(gameForm.startTime, 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                label="Court"
                value={gameForm.court}
                onChangeText={(text) => setGameForm({ ...gameForm, court: text })}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Court 1, Main Gym"
                outlineColor="#E5E7EB"
                activeOutlineColor="#000000"
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowGameDialog(false)}
            />
            <Button
              title="Create"
              mode="contained"
              onPress={handleSaveGame}
            />
          </Dialog.Actions>
        </Dialog>

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
              value={gameForm.startTime}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setGameForm({ ...gameForm, startTime: selectedDate });
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
              value={gameForm.startTime}
              mode="time"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setGameForm({ ...gameForm, startTime: selectedDate });
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

      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={handleCreateGame}
        label="New Game"
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
  pageHeader: {
    padding: 16,
    backgroundColor: '#000000',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
  },
  searchOutline: {
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  searchResults: {
    marginTop: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#F3F4F6',
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
    color: '#6B7280',
  },
  separator: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  courtText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 4,
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 12,
  },
  gameCardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gameLabelContainer: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  gameLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
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
    backgroundColor: '#F3F4F6',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#000000',
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
    color: '#000000',
  },
  winningScore: {
    fontWeight: '800',
    fontSize: 26,
  },
  scoreSeparator: {
    fontSize: 18,
    fontWeight: '400',
    color: '#6B7280',
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#6B7280',
  },
  additionalInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  editButtonContainer: {
    marginTop: 12,
  },
  dialog: {
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
  },
  dialogTitle: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 20,
  },
  dialogSubtitle: {
    color: '#6B7280',
    paddingHorizontal: 24,
    paddingBottom: 16,
    lineHeight: 20,
  },
  dialogScrollArea: {
    paddingHorizontal: 24,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 8,
    marginTop: 8,
    color: '#000000',
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
});

export default ManageTournamentScreen;
