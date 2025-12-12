import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, FAB, Portal, Dialog, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseService } from '../../services/firebase';
import { Tournament, UserRole, TournamentStatus, RootStackParamList } from '../../types';
import { Timestamp } from 'firebase/firestore';
import Button from '../../components/common/Button';

type AdminPanelNavigationProp = StackNavigationProp<RootStackParamList>;

const AdminPanelScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigation = useNavigation<AdminPanelNavigationProp>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    startDate: '',
    endDate: '',
  });

  // Check if user is admin
  const isAdmin = userProfile?.role === UserRole.ADMIN;

  useEffect(() => {
    if (isAdmin) {
      loadTournaments();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await firebaseService.getTournaments();
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = () => {
    setEditingTournament(null);
    setFormData({
      name: '',
      city: '',
      state: '',
      startDate: '',
      endDate: '',
    });
    setShowCreateDialog(true);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      city: tournament.city,
      state: tournament.state,
      startDate: tournament.startDate.toDate().toISOString().split('T')[0],
      endDate: tournament.endDate.toDate().toISOString().split('T')[0],
    });
    setShowCreateDialog(true);
  };

  const handleSaveTournament = async () => {
    // Validate form
    if (!formData.name || !formData.city || !formData.state || !formData.startDate || !formData.endDate) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    try {
      const startDate = Timestamp.fromDate(new Date(formData.startDate));
      const endDate = Timestamp.fromDate(new Date(formData.endDate));

      if (editingTournament) {
        // Update existing tournament
        await firebaseService.updateTournament(editingTournament.id, {
          name: formData.name,
          city: formData.city,
          state: formData.state,
          startDate,
          endDate,
          updatedAt: Timestamp.now(),
        });
        Alert.alert('Success', 'Tournament updated successfully');
      } else {
        // Create new tournament
        await firebaseService.createTournament({
          name: formData.name,
          city: formData.city,
          state: formData.state,
          startDate,
          endDate,
          status: TournamentStatus.UPCOMING,
          createdBy: userProfile?.id || '',
          createdAt: Timestamp.now(),
        });
        Alert.alert('Success', 'Tournament created successfully');
      }

      setShowCreateDialog(false);
      loadTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      Alert.alert('Error', 'Failed to save tournament');
    }
  };

  const handleDeleteTournament = (tournament: Tournament) => {
    Alert.alert(
      'Delete Tournament',
      `Are you sure you want to delete "${tournament.name}"? This will also delete all related divisions and games.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseService.deleteTournamentWithRelatedData(tournament.id);
              Alert.alert('Success', 'Tournament deleted successfully');
              loadTournaments();
            } catch (error) {
              console.error('Error deleting tournament:', error);
              Alert.alert('Error', 'Failed to delete tournament');
            }
          },
        },
      ]
    );
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text variant="headlineMedium" style={styles.accessDeniedTitle}>
          Access Denied
        </Text>
        <Text variant="bodyLarge" style={styles.accessDeniedText}>
          You do not have permission to access the admin panel.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Tournament Management
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Manage tournaments, divisions, and games
          </Text>
        </View>

        <View style={styles.quickActions}>
          <Button
            title="Bulk Import"
            mode="contained-tonal"
            onPress={() => navigation.navigate('BulkImport')}
          />
        </View>

        {tournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="titleLarge">No Tournaments</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Create your first tournament to get started
            </Text>
          </View>
        ) : (
          tournaments.map((tournament) => (
            <Card key={tournament.id} style={styles.tournamentCard}>
              <Card.Content>
                <Text variant="titleLarge">{tournament.name}</Text>
                <Text variant="bodyMedium" style={styles.tournamentLocation}>
                  {tournament.city}, {tournament.state}
                </Text>
                <Text variant="bodySmall" style={styles.tournamentDates}>
                  {tournament.startDate.toDate().toLocaleDateString()} -{' '}
                  {tournament.endDate.toDate().toLocaleDateString()}
                </Text>
                <Text variant="bodySmall" style={styles.tournamentStatus}>
                  Status: {tournament.status}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  title="Manage"
                  mode="contained"
                  onPress={() => navigation.navigate('ManageTournament', { tournamentId: tournament.id })}
                />
                <Button
                  title="Edit"
                  mode="outlined"
                  onPress={() => handleEditTournament(tournament)}
                />
                <Button
                  title="Delete"
                  mode="outlined"
                  onPress={() => handleDeleteTournament(tournament)}
                />
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={showCreateDialog}
          onDismiss={() => setShowCreateDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>
            {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput
                label="Tournament Name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="City"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="State"
                value={formData.state}
                onChangeText={(text) => setFormData({ ...formData, state: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Start Date (YYYY-MM-DD)"
                value={formData.startDate}
                onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                mode="outlined"
                style={styles.input}
                placeholder="2024-01-01"
              />
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={formData.endDate}
                onChangeText={(text) => setFormData({ ...formData, endDate: text })}
                mode="outlined"
                style={styles.input}
                placeholder="2024-01-07"
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              title="Cancel"
              mode="text"
              onPress={() => setShowCreateDialog(false)}
            />
            <Button
              title={editingTournament ? 'Update' : 'Create'}
              mode="contained"
              onPress={handleSaveTournament}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateTournament}
        label="New Tournament"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#000000',
  },
  headerTitle: {
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#F3F4F6',
  },
  quickActions: {
    padding: 16,
    paddingBottom: 8,
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
  tournamentCard: {
    margin: 16,
    marginBottom: 8,
  },
  tournamentLocation: {
    marginTop: 8,
    color: '#6B7280',
  },
  tournamentDates: {
    marginTop: 4,
    color: '#9CA3AF',
  },
  tournamentStatus: {
    marginTop: 4,
    color: '#000000',
    textTransform: 'capitalize',
  },
  dialog: {
    maxHeight: '80%',
  },
  input: {
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
});

export default AdminPanelScreen;
