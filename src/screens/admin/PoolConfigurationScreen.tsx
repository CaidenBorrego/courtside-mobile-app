import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, FAB, Portal, Dialog, TextInput, Chip } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { firebaseService } from '../../services/firebase';
import { poolService } from '../../services/tournament/PoolService';
import { Pool, Game } from '../../types';
import Button from '../../components/common/Button';

type PoolConfigurationScreenRouteProp = RouteProp<
  { PoolConfiguration: { divisionId: string; tournamentId: string } },
  'PoolConfiguration'
>;

const PoolConfigurationScreen: React.FC = () => {
  const route = useRoute<PoolConfigurationScreenRouteProp>();
  const { divisionId, tournamentId } = route.params;

  const [pools, setPools] = useState<Pool[]>([]);
  const [poolGames, setPoolGames] = useState<Map<string, Game[]>>(new Map());
  const [loading, setLoading] = useState(true);

  // Form state
  const [showPoolDialog, setShowPoolDialog] = useState(false);
  const [editingPool, setEditingPool] = useState<Pool | null>(null);
  const [poolForm, setPoolForm] = useState({
    name: '',
    advancementCount: '',
    teams: [] as string[],
    newTeamName: '',
  });
  const [generatingGames, setGeneratingGames] = useState(false);
  const [previewGames, setPreviewGames] = useState<Array<{ teamA: string; teamB: string; gameNumber: number }>>([]);

  useEffect(() => {
    loadPools();
  }, [divisionId]);

  const loadPools = async () => {
    try {
      setLoading(true);
      const poolsData = await firebaseService.getPoolsByDivision(divisionId);
      setPools(poolsData);

      // Load games for each pool
      const gamesMap = new Map<string, Game[]>();
      await Promise.all(
        poolsData.map(async (pool) => {
          const games = await firebaseService.getGamesByPool(pool.id);
          gamesMap.set(pool.id, games);
        })
      );
      setPoolGames(gamesMap);
    } catch (error) {
      console.error('Error loading pools:', error);
      Alert.alert('Error', 'Failed to load pools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = () => {
    setEditingPool(null);
    setPoolForm({
      name: '',
      advancementCount: '',
      teams: [],
      newTeamName: '',
    });
    setPreviewGames([]);
    setShowPoolDialog(true);
  };

  const handleEditPool = (pool: Pool) => {
    setEditingPool(pool);
    setPoolForm({
      name: pool.name,
      advancementCount: pool.advancementCount?.toString() || '',
      teams: [...pool.teams],
      newTeamName: '',
    });
    generateGamePreview([...pool.teams]);
    setShowPoolDialog(true);
  };

  const handleAddTeam = () => {
    const teamName = poolForm.newTeamName.trim();
    if (!teamName) {
      Alert.alert('Validation Error', 'Please enter a team name');
      return;
    }

    if (poolForm.teams.includes(teamName)) {
      Alert.alert('Validation Error', 'Team name already exists in this pool');
      return;
    }

    if (poolForm.teams.length >= 16) {
      Alert.alert('Validation Error', 'Pool cannot have more than 16 teams');
      return;
    }

    const newTeams = [...poolForm.teams, teamName];
    setPoolForm({ ...poolForm, teams: newTeams, newTeamName: '' });
    generateGamePreview(newTeams);
  };

  const handleRemoveTeam = (teamName: string) => {
    const newTeams = poolForm.teams.filter(t => t !== teamName);
    setPoolForm({ ...poolForm, teams: newTeams });
    generateGamePreview(newTeams);
  };

  const generateGamePreview = (teams: string[]) => {
    if (teams.length < 2) {
      setPreviewGames([]);
      return;
    }

    const games: Array<{ teamA: string; teamB: string; gameNumber: number }> = [];
    let gameNumber = 1;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        games.push({
          teamA: teams[i],
          teamB: teams[j],
          gameNumber: gameNumber++,
        });
      }
    }

    setPreviewGames(games);
  };

  const handleSavePool = async () => {
    // Validate form
    if (!poolForm.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a pool name');
      return;
    }

    if (poolForm.teams.length < 2) {
      Alert.alert('Validation Error', 'Pool must have at least 2 teams');
      return;
    }

    const advancementCount = poolForm.advancementCount
      ? parseInt(poolForm.advancementCount)
      : undefined;

    if (advancementCount !== undefined && (advancementCount < 0 || advancementCount > poolForm.teams.length)) {
      Alert.alert('Validation Error', 'Invalid advancement count');
      return;
    }

    try {
      setGeneratingGames(true);

      if (editingPool) {
        // Update existing pool
        const updates: any = {
          name: poolForm.name,
        };
        if (advancementCount !== undefined) {
          updates.advancementCount = advancementCount;
        }
        await poolService.updatePool(editingPool.id, updates);

        // Check if teams changed
        const teamsChanged = 
          poolForm.teams.length !== editingPool.teams.length ||
          poolForm.teams.some((team, index) => team !== editingPool.teams[index]);

        if (teamsChanged) {
          // Regenerate games with new teams
          await poolService.updatePoolTeams(editingPool.id, poolForm.teams);
        }

        Alert.alert('Success', 'Pool updated successfully');
      } else {
        // Create new pool
        const pool = await poolService.createPool(
          divisionId,
          tournamentId,
          poolForm.name,
          poolForm.teams,
          advancementCount
        );

        // Generate games
        await poolService.generatePoolGames(pool.id);

        Alert.alert('Success', `Pool created with ${previewGames.length} games`);
      }

      setShowPoolDialog(false);
      loadPools();
    } catch (error) {
      console.error('Error saving pool:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save pool');
    } finally {
      setGeneratingGames(false);
    }
  };

  const handleDeletePool = async (pool: Pool) => {
    const games = poolGames.get(pool.id) || [];
    const hasGames = games.length > 0;

    Alert.alert(
      'Delete Pool',
      hasGames
        ? `Are you sure you want to delete "${pool.name}"? This will also delete ${games.length} associated game(s).`
        : `Are you sure you want to delete "${pool.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await poolService.deletePool(pool.id);
              Alert.alert('Success', 'Pool deleted successfully');
              loadPools();
            } catch (error) {
              console.error('Error deleting pool:', error);
              Alert.alert('Error', 'Failed to delete pool');
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
        <Text style={styles.loadingText}>Loading pools...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Pool Configuration
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Manage pools for round-robin play
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {pools.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="titleMedium">No Pools</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Create pools to organize teams for round-robin play
            </Text>
          </View>
        ) : (
          pools.map((pool) => {
            const games = poolGames.get(pool.id) || [];
            return (
              <Card key={pool.id} style={styles.poolCard}>
                <Card.Content>
                  <Text variant="titleLarge">{pool.name}</Text>
                  <View style={styles.poolDetails}>
                    <Text variant="bodyMedium" style={styles.detailText}>
                      Teams: {pool.teams.length}
                    </Text>
                    <Text variant="bodyMedium" style={styles.detailText}>
                      Games: {games.length}
                    </Text>
                    {pool.advancementCount && (
                      <Text variant="bodyMedium" style={styles.detailText}>
                        Advancing: {pool.advancementCount}
                      </Text>
                    )}
                  </View>
                  {pool.teams.length > 0 && (
                    <View style={styles.teamsContainer}>
                      <Text variant="bodySmall" style={styles.teamsLabel}>
                        Teams:
                      </Text>
                      {pool.teams.map((team, index) => (
                        <Text key={index} variant="bodySmall" style={styles.teamName}>
                          • {team}
                        </Text>
                      ))}
                    </View>
                  )}
                </Card.Content>
                <Card.Actions>
                  <Button
                    title="Edit"
                    mode="outlined"
                    onPress={() => handleEditPool(pool)}
                  />
                  <Button
                    title="Delete"
                    mode="outlined"
                    onPress={() => handleDeletePool(pool)}
                  />
                </Card.Actions>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={showPoolDialog}
          onDismiss={() => setShowPoolDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>
            {editingPool ? 'Edit Pool' : 'Create Pool'}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput
                label="Pool Name"
                value={poolForm.name}
                onChangeText={(text) => setPoolForm({ ...poolForm, name: text })}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Pool A, Pool B"
              />

              <TextInput
                label="Advancement Count (Optional)"
                value={poolForm.advancementCount}
                onChangeText={(text) => setPoolForm({ ...poolForm, advancementCount: text })}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                placeholder="Number of teams advancing to brackets"
              />

              <View style={styles.teamsSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Teams
                </Text>

                <View style={styles.addTeamRow}>
                  <TextInput
                    label="Team Name"
                    value={poolForm.newTeamName}
                    onChangeText={(text) => setPoolForm({ ...poolForm, newTeamName: text })}
                    mode="outlined"
                    style={styles.teamInput}
                    placeholder="Enter team name"
                    onSubmitEditing={handleAddTeam}
                  />
                  <Button
                    title="Add"
                    mode="contained"
                    onPress={handleAddTeam}
                  />
                </View>

                {poolForm.teams.length > 0 && (
                  <View style={styles.teamsList}>
                    {poolForm.teams.map((team, index) => (
                      <Chip
                        key={index}
                        onClose={() => handleRemoveTeam(team)}
                        style={styles.teamChip}
                      >
                        {team}
                      </Chip>
                    ))}
                  </View>
                )}

                <Text variant="bodySmall" style={styles.teamCount}>
                  {poolForm.teams.length} team(s) added
                </Text>
              </View>

              {previewGames.length > 0 && (
                <View style={styles.previewSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Game Preview ({previewGames.length} games)
                  </Text>
                  <View style={styles.previewList}>
                    {previewGames.slice(0, 5).map((game) => (
                      <Text key={game.gameNumber} variant="bodySmall" style={styles.previewGame}>
                        Game {game.gameNumber}: {game.teamA} vs {game.teamB}
                      </Text>
                    ))}
                    {previewGames.length > 5 && (
                      <Text variant="bodySmall" style={styles.previewMore}>
                        ... and {previewGames.length - 5} more games
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowPoolDialog(false)}
              disabled={generatingGames}
            />
            <Button
              title={editingPool ? 'Update' : 'Create'}
              mode="contained"
              onPress={handleSavePool}
              disabled={generatingGames}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreatePool}
        label="New Pool"
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
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    marginTop: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
  poolCard: {
    margin: 16,
    marginBottom: 8,
  },
  poolDetails: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  detailText: {
    color: '#6B7280',
  },
  teamsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  teamsLabel: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#374151',
  },
  teamName: {
    color: '#6B7280',
    marginLeft: 8,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  dialog: {
    maxHeight: '85%',
  },
  input: {
    marginBottom: 12,
  },
  teamsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
    color: '#374151',
  },
  addTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  teamInput: {
    flex: 1,
  },

  teamsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  teamChip: {
    marginBottom: 4,
  },
  teamCount: {
    color: '#6B7280',
    marginTop: 4,
  },
  previewSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewList: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  previewGame: {
    color: '#374151',
    marginBottom: 4,
  },
  previewMore: {
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default PoolConfigurationScreen;
