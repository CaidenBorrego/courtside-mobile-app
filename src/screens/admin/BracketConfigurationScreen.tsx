import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, FAB, Portal, Dialog, TextInput, Chip, RadioButton } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { firebaseService } from '../../services/firebase';
import { bracketService } from '../../services/tournament/BracketService';
import { Bracket, Game, Pool, BracketSeed } from '../../types';
import { Timestamp } from 'firebase/firestore';
import Button from '../../components/common/Button';

type BracketConfigurationScreenRouteProp = RouteProp<
  { BracketConfiguration: { divisionId: string; tournamentId: string } },
  'BracketConfiguration'
>;

const BracketConfigurationScreen: React.FC = () => {
  const route = useRoute<BracketConfigurationScreenRouteProp>();
  const { divisionId, tournamentId } = route.params;

  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [bracketGames, setBracketGames] = useState<Map<string, Game[]>>(new Map());
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showBracketDialog, setShowBracketDialog] = useState(false);
  const [editingBracket, setEditingBracket] = useState<Bracket | null>(null);
  const [bracketForm, setBracketForm] = useState({
    name: '',
    size: '8' as '4' | '8' | '16' | '32',
    seedingSource: 'manual' as 'manual' | 'pools' | 'mixed',
    selectedPools: [] as string[],
    manualSeeds: [] as { position: number; teamName: string }[],
    newSeedTeamName: '',
  });
  const [generatingGames, setGeneratingGames] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load brackets
      const bracketsData = await firebaseService.getBracketsByDivision(divisionId);
      setBrackets(bracketsData);

      // Load games for each bracket
      const gamesMap = new Map<string, Game[]>();
      await Promise.all(
        bracketsData.map(async (bracket) => {
          const games = await firebaseService.getGamesByBracket(bracket.id);
          gamesMap.set(bracket.id, games);
        })
      );
      setBracketGames(gamesMap);

      // Load pools for seeding options
      const poolsData = await firebaseService.getPoolsByDivision(divisionId);
      setPools(poolsData);
    } catch (error) {
      console.error('Error loading brackets:', error);
      Alert.alert('Error', 'Failed to load brackets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBracket = () => {
    setEditingBracket(null);
    setBracketForm({
      name: '',
      size: '8',
      seedingSource: 'manual',
      selectedPools: [],
      manualSeeds: [],
      newSeedTeamName: '',
    });
    setShowBracketDialog(true);
  };

  const handleEditBracket = (bracket: Bracket) => {
    setEditingBracket(bracket);
    
    // Extract manual seeds from bracket
    const manualSeeds = bracket.seeds
      .filter(seed => seed.teamName)
      .map(seed => ({
        position: seed.position,
        teamName: seed.teamName!,
      }));

    // Extract selected pools from bracket seeds
    const selectedPools = Array.from(
      new Set(
        bracket.seeds
          .filter(seed => seed.sourcePoolId)
          .map(seed => seed.sourcePoolId!)
      )
    );

    setBracketForm({
      name: bracket.name,
      size: bracket.size.toString() as '4' | '8' | '16' | '32',
      seedingSource: bracket.seedingSource,
      selectedPools,
      manualSeeds,
      newSeedTeamName: '',
    });
    setShowBracketDialog(true);
  };

  const handleAddManualSeed = () => {
    const teamName = bracketForm.newSeedTeamName.trim();
    if (!teamName) {
      Alert.alert('Validation Error', 'Please enter a team name');
      return;
    }

    const size = parseInt(bracketForm.size);
    if (bracketForm.manualSeeds.length >= size) {
      Alert.alert('Validation Error', `Bracket can only have ${size} teams`);
      return;
    }

    if (bracketForm.manualSeeds.some(seed => seed.teamName === teamName)) {
      Alert.alert('Validation Error', 'Team already added to bracket');
      return;
    }

    const position = bracketForm.manualSeeds.length + 1;
    const newSeeds = [...bracketForm.manualSeeds, { position, teamName }];
    setBracketForm({ ...bracketForm, manualSeeds: newSeeds, newSeedTeamName: '' });
  };

  const handleRemoveManualSeed = (position: number) => {
    const newSeeds = bracketForm.manualSeeds
      .filter(seed => seed.position !== position)
      .map((seed, index) => ({ ...seed, position: index + 1 }));
    setBracketForm({ ...bracketForm, manualSeeds: newSeeds });
  };

  const handleTogglePool = (poolId: string) => {
    const isSelected = bracketForm.selectedPools.includes(poolId);
    const newSelectedPools = isSelected
      ? bracketForm.selectedPools.filter(id => id !== poolId)
      : [...bracketForm.selectedPools, poolId];
    
    setBracketForm({ ...bracketForm, selectedPools: newSelectedPools });
  };

  const getPreviewText = (): string => {
    const size = parseInt(bracketForm.size);
    const rounds = Math.log2(size);
    const totalGames = size - 1;

    let preview = `This will create a ${size}-team single-elimination bracket with ${rounds} rounds and ${totalGames} games.\n\n`;

    if (bracketForm.seedingSource === 'manual') {
      const seededCount = bracketForm.manualSeeds.length;
      preview += `${seededCount} of ${size} seeds assigned manually.`;
      if (seededCount < size) {
        preview += ` ${size - seededCount} positions will be TBD.`;
      }
    } else if (bracketForm.seedingSource === 'pools') {
      if (bracketForm.selectedPools.length === 0) {
        preview += 'No pools selected for seeding. Teams will be TBD.';
      } else {
        preview += `Teams will be seeded from ${bracketForm.selectedPools.length} pool(s).`;
      }
    } else {
      preview += 'Mixed seeding: combine pool results with manual assignments.';
    }

    return preview;
  };

  const handleSaveBracket = async () => {
    // Validate form
    if (!bracketForm.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a bracket name');
      return;
    }

    const size = parseInt(bracketForm.size) as 4 | 8 | 16 | 32;

    try {
      setGeneratingGames(true);

      if (editingBracket) {
        // Update existing bracket
        await bracketService.updateBracket(editingBracket.id, {
          name: bracketForm.name,
          seedingSource: bracketForm.seedingSource,
          updatedAt: Timestamp.now(),
        });

        // Update seeds if manual seeding
        if (bracketForm.seedingSource === 'manual' && bracketForm.manualSeeds.length > 0) {
          const bracket = await bracketService.getBracket(editingBracket.id);
          const updatedSeeds: BracketSeed[] = bracket.seeds.map(seed => {
            const manualSeed = bracketForm.manualSeeds.find(s => s.position === seed.position);
            if (manualSeed) {
              return {
                position: seed.position,
                teamName: manualSeed.teamName,
                sourcePoolId: undefined,
                sourcePoolRank: undefined,
              };
            }
            return seed;
          });

          await bracketService.updateBracket(editingBracket.id, {
            seeds: updatedSeeds,
            updatedAt: Timestamp.now(),
          });

          // Update bracket games with new seeds
          await (bracketService as any).updateBracketGamesWithSeeds(editingBracket.id, updatedSeeds);
        }

        // Seed from pools if selected
        if (bracketForm.seedingSource === 'pools' && bracketForm.selectedPools.length > 0) {
          await bracketService.seedBracketFromPools(editingBracket.id, bracketForm.selectedPools);
        }

        Alert.alert('Success', 'Bracket updated successfully');
      } else {
        // Create new bracket
        const bracket = await bracketService.createBracket(
          divisionId,
          tournamentId,
          bracketForm.name,
          size,
          bracketForm.seedingSource
        );

        // Update seeds if manual seeding
        if (bracketForm.seedingSource === 'manual' && bracketForm.manualSeeds.length > 0) {
          const updatedSeeds: BracketSeed[] = bracket.seeds.map(seed => {
            const manualSeed = bracketForm.manualSeeds.find(s => s.position === seed.position);
            if (manualSeed) {
              return {
                position: seed.position,
                teamName: manualSeed.teamName,
                sourcePoolId: undefined,
                sourcePoolRank: undefined,
              };
            }
            return seed;
          });

          await bracketService.updateBracket(bracket.id, {
            seeds: updatedSeeds,
            updatedAt: Timestamp.now(),
          });
        }

        // Generate bracket games
        await bracketService.generateBracketGames(bracket.id);

        // Seed from pools if selected
        if (bracketForm.seedingSource === 'pools' && bracketForm.selectedPools.length > 0) {
          await bracketService.seedBracketFromPools(bracket.id, bracketForm.selectedPools);
        }

        const totalGames = size - 1;
        Alert.alert('Success', `Bracket created with ${totalGames} games`);
      }

      setShowBracketDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving bracket:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save bracket');
    } finally {
      setGeneratingGames(false);
    }
  };

  const handleDeleteBracket = async (bracket: Bracket) => {
    const games = bracketGames.get(bracket.id) || [];
    const hasGames = games.length > 0;

    Alert.alert(
      'Delete Bracket',
      hasGames
        ? `Are you sure you want to delete "${bracket.name}"? This will also delete ${games.length} associated game(s) and any bracket dependencies.`
        : `Are you sure you want to delete "${bracket.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bracketService.deleteBracket(bracket.id);
              Alert.alert('Success', 'Bracket deleted successfully');
              loadData();
            } catch (error) {
              console.error('Error deleting bracket:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete bracket');
            }
          },
        },
      ]
    );
  };

  const getSeedingStatusText = (bracket: Bracket): string => {
    const seededCount = bracket.seeds.filter(seed => seed.teamName).length;
    if (seededCount === 0) {
      return 'Not seeded';
    } else if (seededCount === bracket.size) {
      return 'Fully seeded';
    } else {
      return `${seededCount}/${bracket.size} seeded`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading brackets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Bracket Configuration
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Manage single-elimination brackets
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {brackets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="titleMedium">No Brackets</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Create brackets for single-elimination tournament play
            </Text>
          </View>
        ) : (
          brackets.map((bracket) => {
            const games = bracketGames.get(bracket.id) || [];
            const seedingStatus = getSeedingStatusText(bracket);
            
            return (
              <Card key={bracket.id} style={styles.bracketCard}>
                <Card.Content>
                  <Text variant="titleLarge">{bracket.name}</Text>
                  <View style={styles.bracketDetails}>
                    <Text variant="bodyMedium" style={styles.detailText}>
                      Size: {bracket.size} teams
                    </Text>
                    <Text variant="bodyMedium" style={styles.detailText}>
                      Games: {games.length}
                    </Text>
                    <Text variant="bodyMedium" style={styles.detailText}>
                      Seeding: {seedingStatus}
                    </Text>
                  </View>
                  <View style={styles.seedingInfo}>
                    <Text variant="bodySmall" style={styles.seedingLabel}>
                      Seeding Source: {bracket.seedingSource}
                    </Text>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <Button
                    title="Edit"
                    mode="outlined"
                    onPress={() => handleEditBracket(bracket)}
                  />
                  <Button
                    title="Delete"
                    mode="outlined"
                    onPress={() => handleDeleteBracket(bracket)}
                  />
                </Card.Actions>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={showBracketDialog}
          onDismiss={() => setShowBracketDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>
            {editingBracket ? 'Edit Bracket' : 'Create Bracket'}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput
                label="Bracket Name"
                value={bracketForm.name}
                onChangeText={(text) => setBracketForm({ ...bracketForm, name: text })}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Gold Bracket, Championship"
              />

              <View style={styles.sizeSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Bracket Size
                </Text>
                <RadioButton.Group
                  onValueChange={(value) => setBracketForm({ ...bracketForm, size: value as any })}
                  value={bracketForm.size}
                >
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="4 teams" value="4" />
                    <RadioButton.Item label="8 teams" value="8" />
                  </View>
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="16 teams" value="16" />
                    <RadioButton.Item label="32 teams" value="32" />
                  </View>
                </RadioButton.Group>
              </View>

              <View style={styles.seedingSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Seeding Source
                </Text>
                <RadioButton.Group
                  onValueChange={(value) => setBracketForm({ ...bracketForm, seedingSource: value as any })}
                  value={bracketForm.seedingSource}
                >
                  <RadioButton.Item label="Manual" value="manual" />
                  <RadioButton.Item label="From Pools" value="pools" />
                  <RadioButton.Item label="Mixed" value="mixed" />
                </RadioButton.Group>
              </View>

              {bracketForm.seedingSource === 'manual' && (
                <View style={styles.manualSeedingSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Manual Seeds
                  </Text>

                  <View style={styles.addSeedRow}>
                    <TextInput
                      label="Team Name"
                      value={bracketForm.newSeedTeamName}
                      onChangeText={(text) => setBracketForm({ ...bracketForm, newSeedTeamName: text })}
                      mode="outlined"
                      style={styles.seedInput}
                      placeholder="Enter team name"
                      onSubmitEditing={handleAddManualSeed}
                    />
                    <Button
                      title="Add"
                      mode="contained"
                      onPress={handleAddManualSeed}
                    />
                  </View>

                  {bracketForm.manualSeeds.length > 0 && (
                    <View style={styles.seedsList}>
                      {bracketForm.manualSeeds.map((seed) => (
                        <Chip
                          key={seed.position}
                          onClose={() => handleRemoveManualSeed(seed.position)}
                          style={styles.seedChip}
                        >
                          #{seed.position}: {seed.teamName}
                        </Chip>
                      ))}
                    </View>
                  )}

                  <Text variant="bodySmall" style={styles.seedCount}>
                    {bracketForm.manualSeeds.length} of {bracketForm.size} seeds assigned
                  </Text>
                </View>
              )}

              {(bracketForm.seedingSource === 'pools' || bracketForm.seedingSource === 'mixed') && (
                <View style={styles.poolSelectionSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Select Pools for Seeding
                  </Text>

                  {pools.length === 0 ? (
                    <Text variant="bodySmall" style={styles.noPoolsText}>
                      No pools available. Create pools first to use pool-based seeding.
                    </Text>
                  ) : (
                    <View style={styles.poolsList}>
                      {pools.map((pool) => (
                        <Chip
                          key={pool.id}
                          selected={bracketForm.selectedPools.includes(pool.id)}
                          onPress={() => handleTogglePool(pool.id)}
                          style={styles.poolChip}
                        >
                          {pool.name} ({pool.teams.length} teams)
                        </Chip>
                      ))}
                    </View>
                  )}

                  <Text variant="bodySmall" style={styles.poolCount}>
                    {bracketForm.selectedPools.length} pool(s) selected
                  </Text>
                </View>
              )}

              <View style={styles.previewSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Preview
                </Text>
                <View style={styles.previewBox}>
                  <Text variant="bodySmall" style={styles.previewText}>
                    {getPreviewText()}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowBracketDialog(false)}
              disabled={generatingGames}
            />
            <Button
              title={editingBracket ? 'Update' : 'Create'}
              mode="contained"
              onPress={handleSaveBracket}
              disabled={generatingGames}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateBracket}
        label="New Bracket"
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
  bracketCard: {
    margin: 16,
    marginBottom: 8,
  },
  bracketDetails: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  detailText: {
    color: '#6B7280',
  },
  seedingInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  seedingLabel: {
    color: '#374151',
    textTransform: 'capitalize',
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
  sizeSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
    color: '#374151',
  },
  radioRow: {
    flexDirection: 'row',
  },
  seedingSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  manualSeedingSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  addSeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  seedInput: {
    flex: 1,
  },
  seedsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  seedChip: {
    marginBottom: 4,
  },
  seedCount: {
    color: '#6B7280',
    marginTop: 4,
  },
  poolSelectionSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  noPoolsText: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  poolsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  poolChip: {
    marginBottom: 4,
  },
  poolCount: {
    color: '#6B7280',
    marginTop: 4,
  },
  previewSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  previewText: {
    color: '#374151',
    lineHeight: 20,
  },
});

export default BracketConfigurationScreen;
