import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  Portal,
  Dialog,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { firebaseService } from '../../services/firebase';
import {
  Tournament,
  Division,
  Game,
  Gender,
  GameStatus,
  Location,
  Pool,
  Bracket,
  TournamentFormat,
} from '../../types';
import { Timestamp } from 'firebase/firestore';
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
  const [pools, setPools] = useState<Pool[]>([]);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'divisions' | 'games' | 'structure'>('divisions');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);

  // Division dialog state
  const [showDivisionDialog, setShowDivisionDialog] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [divisionForm, setDivisionForm] = useState({
    name: '',
    ageGroup: '',
    gender: Gender.MIXED,
    skillLevel: '',
    format: TournamentFormat.HYBRID,
  });

  // Game dialog state
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameForm, setGameForm] = useState({
    divisionId: '',
    teamA: '',
    teamB: '',
    scoreA: '0',
    scoreB: '0',
    startTime: '',
    locationId: '',
    status: GameStatus.SCHEDULED,
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

      // Set default selected division if available
      if (divisionsData.length > 0 && !selectedDivisionId) {
        setSelectedDivisionId(divisionsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const loadStructureData = async (divisionId: string) => {
    try {
      const [poolsData, bracketsData] = await Promise.all([
        firebaseService.getPoolsByDivision(divisionId),
        firebaseService.getBracketsByDivision(divisionId),
      ]);
      setPools(poolsData);
      setBrackets(bracketsData);
    } catch (error) {
      console.error('Error loading structure data:', error);
      Alert.alert('Error', 'Failed to load pools and brackets');
    }
  };

  useEffect(() => {
    if (activeTab === 'structure' && selectedDivisionId) {
      loadStructureData(selectedDivisionId);
    }
  }, [activeTab, selectedDivisionId]);

  // Division handlers
  const handleCreateDivision = () => {
    setEditingDivision(null);
    setDivisionForm({
      name: '',
      ageGroup: '',
      gender: Gender.MIXED,
      skillLevel: '',
      format: TournamentFormat.HYBRID,
    });
    setShowDivisionDialog(true);
  };

  const handleEditDivision = (division: Division) => {
    setEditingDivision(division);
    setDivisionForm({
      name: division.name,
      ageGroup: division.ageGroup,
      gender: division.gender,
      skillLevel: division.skillLevel,
      format: division.format || TournamentFormat.HYBRID,
    });
    setShowDivisionDialog(true);
  };

  const handleSaveDivision = async () => {
    if (!divisionForm.name || !divisionForm.ageGroup || !divisionForm.skillLevel) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    try {
      if (editingDivision) {
        await firebaseService.updateDivision(editingDivision.id, {
          name: divisionForm.name,
          ageGroup: divisionForm.ageGroup,
          gender: divisionForm.gender,
          skillLevel: divisionForm.skillLevel,
          format: divisionForm.format,
          updatedAt: Timestamp.now(),
        });
        Alert.alert('Success', 'Division updated successfully');
      } else {
        await firebaseService.createDivision({
          tournamentId,
          name: divisionForm.name,
          ageGroup: divisionForm.ageGroup,
          gender: divisionForm.gender,
          skillLevel: divisionForm.skillLevel,
          format: divisionForm.format,
          createdAt: Timestamp.now(),
        });
        Alert.alert('Success', 'Division created successfully');
      }
      setShowDivisionDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving division:', error);
      Alert.alert('Error', 'Failed to save division');
    }
  };

  const handleDeleteDivision = (division: Division) => {
    Alert.alert(
      'Delete Division',
      `Are you sure you want to delete "${division.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseService.deleteDivision(division.id);
              Alert.alert('Success', 'Division deleted successfully');
              loadData();
            } catch (error) {
              console.error('Error deleting division:', error);
              Alert.alert('Error', 'Failed to delete division');
            }
          },
        },
      ]
    );
  };

  // Game handlers
  const handleCreateGame = () => {
    setEditingGame(null);
    setGameForm({
      divisionId: divisions.length > 0 ? divisions[0].id : '',
      teamA: '',
      teamB: '',
      scoreA: '0',
      scoreB: '0',
      startTime: '',
      locationId: locations.length > 0 ? locations[0].id : '',
      status: GameStatus.SCHEDULED,
    });
    setShowGameDialog(true);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setGameForm({
      divisionId: game.divisionId,
      teamA: game.teamA,
      teamB: game.teamB,
      scoreA: game.scoreA.toString(),
      scoreB: game.scoreB.toString(),
      startTime: game.startTime.toDate().toISOString().slice(0, 16),
      locationId: game.locationId,
      status: game.status,
    });
    setShowGameDialog(true);
  };

  const handleSaveGame = async () => {
    if (!gameForm.divisionId || !gameForm.teamA || !gameForm.teamB || !gameForm.startTime || !gameForm.locationId) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      const startTime = Timestamp.fromDate(new Date(gameForm.startTime));
      const scoreA = parseInt(gameForm.scoreA) || 0;
      const scoreB = parseInt(gameForm.scoreB) || 0;

      if (editingGame) {
        await firebaseService.updateGame(editingGame.id, {
          divisionId: gameForm.divisionId,
          teamA: gameForm.teamA,
          teamB: gameForm.teamB,
          scoreA,
          scoreB,
          startTime,
          locationId: gameForm.locationId,
          status: gameForm.status,
          updatedAt: Timestamp.now(),
        });
        Alert.alert('Success', 'Game updated successfully');
      } else {
        await firebaseService.createGame({
          tournamentId,
          divisionId: gameForm.divisionId,
          teamA: gameForm.teamA,
          teamB: gameForm.teamB,
          scoreA,
          scoreB,
          startTime,
          locationId: gameForm.locationId,
          status: gameForm.status,
          createdAt: Timestamp.now(),
        });
        Alert.alert('Success', 'Game created successfully');
      }
      setShowGameDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving game:', error);
      Alert.alert('Error', 'Failed to save game');
    }
  };

  const handleDeleteGame = (game: Game) => {
    Alert.alert(
      'Delete Game',
      `Are you sure you want to delete this game?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseService.deleteGame(game.id);
              Alert.alert('Success', 'Game deleted successfully');
              loadData();
            } catch (error) {
              console.error('Error deleting game:', error);
              Alert.alert('Error', 'Failed to delete game');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {tournament?.name}
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Manage divisions and games
        </Text>
      </View>

      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'divisions' | 'games' | 'structure')}
        buttons={[
          { value: 'divisions', label: 'Divisions' },
          { value: 'games', label: 'Games' },
          { value: 'structure', label: 'Structure' },
        ]}
        style={styles.segmentedButtons}
      />

      <ScrollView style={styles.scrollView}>
        {activeTab === 'divisions' ? (
          <>
            {divisions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="titleMedium">No Divisions</Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Create divisions to organize games
                </Text>
              </View>
            ) : (
              divisions.map((division) => (
                <Card key={division.id} style={styles.card}>
                  <Card.Content>
                    <Text variant="titleMedium">{division.name}</Text>
                    <Text variant="bodySmall" style={styles.cardDetail}>
                      Age: {division.ageGroup} | Gender: {division.gender}
                    </Text>
                    <Text variant="bodySmall" style={styles.cardDetail}>
                      Skill: {division.skillLevel}
                    </Text>
                  </Card.Content>
                  <Card.Actions>
                    <Button
                      title="Edit"
                      mode="outlined"
                      onPress={() => handleEditDivision(division)}
                    />
                    <Button
                      title="Delete"
                      mode="outlined"
                      onPress={() => handleDeleteDivision(division)}
                    />
                  </Card.Actions>
                </Card>
              ))
            )}
          </>
        ) : activeTab === 'games' ? (
          <>
            {games.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="titleMedium">No Games</Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Create games for this tournament
                </Text>
              </View>
            ) : (
              games.map((game) => (
                <Card key={game.id} style={styles.card}>
                  <Card.Content>
                    <Text variant="titleMedium">
                      {game.teamA} vs {game.teamB}
                    </Text>
                    <Text variant="bodyMedium" style={styles.cardDetail}>
                      Score: {game.scoreA} - {game.scoreB}
                    </Text>
                    <Text variant="bodySmall" style={styles.cardDetail}>
                      {game.startTime.toDate().toLocaleString()}
                    </Text>
                    <Text variant="bodySmall" style={styles.cardDetail}>
                      Status: {game.status}
                    </Text>
                  </Card.Content>
                  <Card.Actions>
                    <Button
                      title="Edit"
                      mode="outlined"
                      onPress={() => handleEditGame(game)}
                    />
                    <Button
                      title="Delete"
                      mode="outlined"
                      onPress={() => handleDeleteGame(game)}
                    />
                  </Card.Actions>
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            {/* Structure Tab */}
            {divisions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="titleMedium">No Divisions</Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Create divisions first to configure tournament structure
                </Text>
              </View>
            ) : (
              <>
                {/* Division Selector */}
                <View style={styles.divisionSelector}>
                  <Text variant="titleSmall" style={styles.selectorLabel}>
                    Select Division:
                  </Text>
                  <SegmentedButtons
                    value={selectedDivisionId || ''}
                    onValueChange={(value) => setSelectedDivisionId(value)}
                    buttons={divisions.map((division) => ({
                      value: division.id,
                      label: division.name,
                    }))}
                    style={styles.divisionButtons}
                  />
                </View>

                {selectedDivisionId && (() => {
                  const selectedDivision = divisions.find(d => d.id === selectedDivisionId);
                  const format = selectedDivision?.format || TournamentFormat.HYBRID;
                  const showPools = format === TournamentFormat.POOL_ONLY || format === TournamentFormat.HYBRID;
                  const showBrackets = format === TournamentFormat.BRACKET_ONLY || format === TournamentFormat.HYBRID;

                  return (
                    <>
                      {/* Format Info */}
                      <View style={styles.formatInfo}>
                        <Text variant="bodyMedium" style={styles.formatLabel}>
                          Format: {format === TournamentFormat.POOL_ONLY ? 'Pool Only' : 
                                   format === TournamentFormat.BRACKET_ONLY ? 'Bracket Only' : 'Hybrid'}
                        </Text>
                        <Text variant="bodySmall" style={styles.formatDescription}>
                          {format === TournamentFormat.POOL_ONLY && 
                            'This division uses round-robin pools only'}
                          {format === TournamentFormat.BRACKET_ONLY && 
                            'This division uses single-elimination brackets only'}
                          {format === TournamentFormat.HYBRID && 
                            'This division uses pool play followed by elimination brackets'}
                        </Text>
                      </View>

                      {/* Pools Section */}
                      {showPools && (
                        <View style={styles.structureSection}>
                          <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                              Pools
                            </Text>
                            <Button
                              title="Configure"
                              mode="contained"
                              onPress={() => {
                                (navigation as any).navigate('PoolConfiguration', {
                                  divisionId: selectedDivisionId,
                                  tournamentId,
                                });
                              }}
                            />
                          </View>
                          <Card style={styles.structureCard}>
                            <Card.Content>
                              {pools.length === 0 ? (
                                <Text variant="bodyMedium" style={styles.emptyStructureText}>
                                  No pools configured for this division
                                </Text>
                              ) : (
                                <>
                                  <Text variant="bodyMedium" style={styles.structureInfo}>
                                    {pools.length} pool(s) configured
                                  </Text>
                                  {pools.map((pool) => (
                                    <View key={pool.id} style={styles.structureItem}>
                                      <Text variant="bodySmall">
                                        • {pool.name} ({pool.teams.length} teams)
                                      </Text>
                                    </View>
                                  ))}
                                </>
                              )}
                            </Card.Content>
                          </Card>
                        </View>
                      )}

                      {/* Brackets Section */}
                      {showBrackets && (
                        <View style={styles.structureSection}>
                          <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                              Brackets
                            </Text>
                            <Button
                              title="Configure"
                              mode="contained"
                              onPress={() => {
                                (navigation as any).navigate('BracketConfiguration', {
                                  divisionId: selectedDivisionId,
                                  tournamentId,
                                });
                              }}
                            />
                          </View>
                          <Card style={styles.structureCard}>
                            <Card.Content>
                              {brackets.length === 0 ? (
                                <Text variant="bodyMedium" style={styles.emptyStructureText}>
                                  No brackets configured for this division
                                </Text>
                              ) : (
                                <>
                                  <Text variant="bodyMedium" style={styles.structureInfo}>
                                    {brackets.length} bracket(s) configured
                                  </Text>
                                  {brackets.map((bracket) => (
                                    <View key={bracket.id} style={styles.structureItem}>
                                      <Text variant="bodySmall">
                                        • {bracket.name} ({bracket.size} teams)
                                      </Text>
                                    </View>
                                  ))}
                                </>
                              )}
                            </Card.Content>
                          </Card>
                        </View>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Division Dialog */}
      <Portal>
        <Dialog
          visible={showDivisionDialog}
          onDismiss={() => setShowDivisionDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>
            {editingDivision ? 'Edit Division' : 'Create Division'}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput
                label="Division Name"
                value={divisionForm.name}
                onChangeText={(text) => setDivisionForm({ ...divisionForm, name: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Age Group"
                value={divisionForm.ageGroup}
                onChangeText={(text) => setDivisionForm({ ...divisionForm, ageGroup: text })}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., U12, U14, Adult"
              />
              <TextInput
                label="Skill Level"
                value={divisionForm.skillLevel}
                onChangeText={(text) => setDivisionForm({ ...divisionForm, skillLevel: text })}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Beginner, Intermediate, Advanced"
              />
              <Text variant="bodyMedium" style={styles.inputLabel}>
                Gender
              </Text>
              <SegmentedButtons
                value={divisionForm.gender}
                onValueChange={(value) =>
                  setDivisionForm({ ...divisionForm, gender: value as Gender })
                }
                buttons={[
                  { value: Gender.MALE, label: 'Male' },
                  { value: Gender.FEMALE, label: 'Female' },
                  { value: Gender.MIXED, label: 'Mixed' },
                ]}
                style={styles.input}
              />
              <Text variant="bodyMedium" style={styles.inputLabel}>
                Tournament Format
              </Text>
              <SegmentedButtons
                value={divisionForm.format}
                onValueChange={(value) =>
                  setDivisionForm({ ...divisionForm, format: value as TournamentFormat })
                }
                buttons={[
                  { value: TournamentFormat.POOL_ONLY, label: 'Pool Only' },
                  { value: TournamentFormat.BRACKET_ONLY, label: 'Bracket Only' },
                  { value: TournamentFormat.HYBRID, label: 'Hybrid' },
                ]}
                style={styles.input}
              />
              <Text variant="bodySmall" style={styles.formatHint}>
                {divisionForm.format === TournamentFormat.POOL_ONLY && 
                  'Round-robin pools only, no elimination brackets'}
                {divisionForm.format === TournamentFormat.BRACKET_ONLY && 
                  'Single-elimination brackets only, no pool play'}
                {divisionForm.format === TournamentFormat.HYBRID && 
                  'Pool play followed by elimination brackets'}
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowDivisionDialog(false)}
            />
            <Button
              title={editingDivision ? 'Update' : 'Create'}
              mode="contained"
              onPress={handleSaveDivision}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Game Dialog */}
      <Portal>
        <Dialog
          visible={showGameDialog}
          onDismiss={() => setShowGameDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>
            {editingGame ? 'Edit Game' : 'Create Game'}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput
                label="Team A"
                value={gameForm.teamA}
                onChangeText={(text) => setGameForm({ ...gameForm, teamA: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Team B"
                value={gameForm.teamB}
                onChangeText={(text) => setGameForm({ ...gameForm, teamB: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Score A"
                value={gameForm.scoreA}
                onChangeText={(text) => setGameForm({ ...gameForm, scoreA: text })}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Score B"
                value={gameForm.scoreB}
                onChangeText={(text) => setGameForm({ ...gameForm, scoreB: text })}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Start Time (YYYY-MM-DDTHH:MM)"
                value={gameForm.startTime}
                onChangeText={(text) => setGameForm({ ...gameForm, startTime: text })}
                mode="outlined"
                style={styles.input}
                placeholder="2024-01-01T10:00"
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowGameDialog(false)}
            />
            <Button
              title={editingGame ? 'Update' : 'Create'}
              mode="contained"
              onPress={handleSaveGame}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {activeTab !== 'structure' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={activeTab === 'divisions' ? handleCreateDivision : handleCreateGame}
          label={activeTab === 'divisions' ? 'New Division' : 'New Game'}
        />
      )}
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
  header: {
    padding: 16,
    backgroundColor: '#000000',
  },
  headerTitle: {
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#F3F4F6',
  },
  segmentedButtons: {
    margin: 16,
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
  card: {
    margin: 16,
    marginBottom: 8,
  },
  cardDetail: {
    marginTop: 4,
    color: '#6B7280',
  },
  dialog: {
    maxHeight: '80%',
  },
  input: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 8,
    color: '#6B7280',
  },
  formatHint: {
    marginTop: 4,
    marginBottom: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  formatInfo: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formatLabel: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  formatDescription: {
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  divisionSelector: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectorLabel: {
    marginBottom: 8,
    color: '#374151',
    fontWeight: '600',
  },
  divisionButtons: {
    marginTop: 4,
  },
  structureSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  structureCard: {
    backgroundColor: '#FFFFFF',
  },
  emptyStructureText: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  structureInfo: {
    marginBottom: 8,
    color: '#374151',
    fontWeight: '500',
  },
  structureItem: {
    marginTop: 4,
    paddingLeft: 8,
  },
});

export default ManageTournamentScreen;
