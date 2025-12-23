import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, TextInput, Divider, Button as PaperButton } from 'react-native-paper';
import { Game } from '../../types';

/**
 * Props for the AdvancementSelector component
 * 
 * @property type - Whether this selector is for winner or loser advancement
 * @property selectedGameIds - Array of currently selected game IDs
 * @property availableGames - Array of games that can be selected (for adding new)
 * @property allGames - Array of all games in division (for displaying selected)
 * @property onAdd - Callback when a game is added to the selection
 * @property onRemove - Callback when a game is removed from the selection
 * @property maxSelections - Maximum number of games that can be selected (default: 10)
 * @property disabled - Whether the selector is disabled
 * @property getGameCapacity - Function to check if a game can accept more teams
 */
export interface AdvancementSelectorProps {
  type: 'winner' | 'loser';
  selectedGameIds: string[];
  availableGames: Game[];
  allGames?: Game[]; // Optional: all games for displaying selected ones
  onAdd: (gameId: string) => void;
  onRemove: (gameId: string) => void;
  maxSelections?: number;
  disabled?: boolean;
  getGameCapacity?: (gameId: string) => { count: number; games: Game[] };
}

/**
 * AdvancementSelector Component
 * 
 * A component for selecting multiple games that winners or losers advance to.
 * Displays a list of selected games with remove buttons and an "Add Game" button
 * that opens a modal for selecting additional games.
 * 
 * Features:
 * - Display list of selected games with labels and team names
 * - Add/remove games from selection
 * - Search and filter available games
 * - Disable games at capacity or that would create circular dependencies
 * - Show validation errors and capacity warnings
 */
const AdvancementSelector: React.FC<AdvancementSelectorProps> = ({
  type,
  selectedGameIds,
  availableGames,
  allGames,
  onAdd,
  onRemove,
  maxSelections = 10,
  disabled = false,
  getGameCapacity,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use allGames if provided, otherwise fall back to availableGames
  const gamesForDisplay = allGames || availableGames;

  // Get selected games from IDs - use gamesForDisplay to include all games
  const selectedGames = selectedGameIds
    .map(id => gamesForDisplay.find(g => g.id === id))
    .filter((g): g is Game => g !== undefined);

  // Check if at max selections
  const atMaxSelections = selectedGameIds.length >= maxSelections;

  // Get game label for display
  const getGameLabel = (game: Game): string => {
    return game.gameLabel || `${game.teamA} vs ${game.teamB}`;
  };

  // Check if a game can accept more teams
  const canGameAcceptFeed = (gameId: string): boolean => {
    if (!getGameCapacity) return true;
    
    const { count } = getGameCapacity(gameId);
    
    // If already selected, it's always allowed (we're just keeping it)
    if (selectedGameIds.includes(gameId)) return true;
    
    // Otherwise, check if there's room for one more
    return count < 2;
  };

  // Filter available games based on search query
  const filteredGames = availableGames.filter(game => {
    // Don't show already selected games
    if (selectedGameIds.includes(game.id)) return false;
    
    // Apply search filter
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const labelMatch = game.gameLabel?.toLowerCase().includes(query);
    const teamAMatch = game.teamA.toLowerCase().includes(query);
    const teamBMatch = game.teamB.toLowerCase().includes(query);
    
    return labelMatch || teamAMatch || teamBMatch;
  });

  // Handle adding a game
  const handleAddGame = (gameId: string) => {
    if (atMaxSelections) {
      Alert.alert(
        'Maximum Selections Reached',
        `You can only select up to ${maxSelections} games for ${type} advancement.`
      );
      return;
    }

    if (!canGameAcceptFeed(gameId)) {
      const capacityInfo = getGameCapacity?.(gameId);
      if (capacityInfo) {
        Alert.alert(
          'Game Full',
          `This game already has 2 games feeding into it:\n\n${capacityInfo.games.map(g => `• ${getGameLabel(g)}`).join('\n')}\n\nA game can only have a maximum of 2 source games.`
        );
      }
      return;
    }

    onAdd(gameId);
    setShowModal(false);
    setSearchQuery('');
  };

  // Handle removing a game
  const handleRemoveGame = (gameId: string) => {
    onRemove(gameId);
  };

  // Open the modal
  const openModal = () => {
    if (disabled) return;
    if (atMaxSelections) {
      Alert.alert(
        'Maximum Selections Reached',
        `You can only select up to ${maxSelections} games for ${type} advancement.`
      );
      return;
    }
    setSearchQuery('');
    setShowModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Selected games list */}
      {selectedGames.length > 0 && (
        <View style={styles.selectedGamesContainer}>
          {selectedGames.map((game) => (
            <View key={game.id} style={styles.selectedGameItem}>
              <View style={styles.selectedGameContent}>
                <Text style={styles.selectedGameIndicator}>✓</Text>
                <View style={styles.selectedGameInfo}>
                  <Text style={styles.selectedGameLabel}>
                    {getGameLabel(game)}
                  </Text>
                  {game.gameLabel && (
                    <Text style={styles.selectedGameTeams}>
                      {game.teamA} vs {game.teamB}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveGame(game.id)}
                style={styles.removeButton}
                disabled={disabled}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add game button */}
      <TouchableOpacity
        style={[
          styles.addButton,
          (disabled || atMaxSelections) && styles.addButtonDisabled,
        ]}
        onPress={openModal}
        disabled={disabled || atMaxSelections}
      >
        <Text style={[
          styles.addButtonText,
          (disabled || atMaxSelections) && styles.addButtonTextDisabled,
        ]}>
          + Add {type === 'winner' ? 'Winner' : 'Loser'} Destination
        </Text>
      </TouchableOpacity>

      {/* Show count and max */}
      {selectedGameIds.length > 0 && (
        <Text style={styles.countText}>
          {selectedGameIds.length} / {maxSelections} selected
        </Text>
      )}

      {/* Game selection modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Select {type === 'winner' ? 'Winner' : 'Loser'} Destination
            </Text>

            {/* Search input */}
            <TextInput
              mode="outlined"
              placeholder="Search by game label or team name..."
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
              outlineColor="#E5E7EB"
              activeOutlineColor="#2563EB"
            />

            {/* Available games list */}
            <ScrollView style={styles.modalScrollView}>
              {filteredGames.map((game) => {
                const capacityInfo = getGameCapacity?.(game.id);
                const canAccept = canGameAcceptFeed(game.id);
                const isFull = capacityInfo ? capacityInfo.count >= 2 : false;

                return (
                  <View key={game.id}>
                    <TouchableOpacity
                      style={[
                        styles.gameOption,
                        !canAccept && styles.gameOptionDisabled,
                      ]}
                      onPress={() => handleAddGame(game.id)}
                      disabled={!canAccept}
                    >
                      <View style={styles.gameOptionContent}>
                        <View style={styles.gameOptionHeader}>
                          <Text
                            style={[
                              styles.gameOptionTitle,
                              !canAccept && styles.gameOptionTitleDisabled,
                            ]}
                          >
                            {getGameLabel(game)}
                          </Text>
                          {capacityInfo && capacityInfo.count > 0 && (
                            <View
                              style={[
                                styles.capacityBadge,
                                isFull && styles.capacityBadgeFull,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.capacityText,
                                  isFull && styles.capacityTextFull,
                                ]}
                              >
                                {capacityInfo.count}/2
                              </Text>
                            </View>
                          )}
                        </View>
                        {game.gameLabel && (
                          <Text
                            style={[
                              styles.gameOptionSubtitle,
                              !canAccept && styles.gameOptionSubtitleDisabled,
                            ]}
                          >
                            {game.teamA} vs {game.teamB}
                          </Text>
                        )}
                        {capacityInfo && capacityInfo.count > 0 && (
                          <Text style={styles.feedingGamesText}>
                            Fed by: {capacityInfo.games.map(g => getGameLabel(g)).join(', ')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <Divider />
                  </View>
                );
              })}
              {filteredGames.length === 0 && (
                <Text style={styles.noGamesText}>
                  {searchQuery ? 'No matching games found' : 'No available games'}
                </Text>
              )}
            </ScrollView>

            {/* Cancel button */}
            <PaperButton
              mode="outlined"
              onPress={() => setShowModal(false)}
              style={styles.cancelButton}
            >
              Cancel
            </PaperButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selectedGamesContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedGameItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedGameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedGameIndicator: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
    marginRight: 8,
  },
  selectedGameInfo: {
    flex: 1,
  },
  selectedGameLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  selectedGameTeams: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 24,
    color: '#DC2626',
    fontWeight: 'bold',
    lineHeight: 24,
  },
  addButton: {
    padding: 14,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 8,
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  addButtonDisabled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  addButtonTextDisabled: {
    color: '#9CA3AF',
  },
  countText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'right',
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
  searchInput: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: 16,
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
  feedingGamesText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  capacityBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  capacityBadgeFull: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  capacityTextFull: {
    color: '#DC2626',
  },
  noGamesText: {
    padding: 16,
    textAlign: 'center',
    color: '#6B7280',
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default AdvancementSelector;
