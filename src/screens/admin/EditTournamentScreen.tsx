import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput, Card, Button as PaperButton } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseService } from '../../services/firebase';
import { Tournament, UserRole, RootStackParamList } from '../../types';
import { Timestamp } from 'firebase/firestore';
import Button from '../../components/common/Button';

type EditTournamentRouteProp = RouteProp<RootStackParamList & { EditTournament: { tournamentId: string } }, 'EditTournament'>;
type EditTournamentNavigationProp = StackNavigationProp<RootStackParamList>;

const EditTournamentScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigation = useNavigation<EditTournamentNavigationProp>();
  const route = useRoute<EditTournamentRouteProp>();
  const { tournamentId } = route.params;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check if user is admin
  const isAdmin = userProfile?.role === UserRole.ADMIN;

  useEffect(() => {
    if (isAdmin) {
      loadTournament();
    } else {
      setLoading(false);
    }
  }, [isAdmin, tournamentId]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const tournamentData = await firebaseService.getTournament(tournamentId);
      setTournament(tournamentData);

      // Set form values - extract date in UTC to match how we save
      const formatDateForInput = (timestamp: any) => {
        try {
          const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
          // Get UTC date components
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      setName(tournamentData.name);
      setCity(tournamentData.city);
      setState(tournamentData.state);
      setAddress(tournamentData.address || '');
      setStartDate(formatDateForInput(tournamentData.startDate));
      setEndDate(formatDateForInput(tournamentData.endDate));
    } catch (error) {
      console.error('Error loading tournament:', error);
      Alert.alert('Error', 'Failed to load tournament details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tournament) return;

    // Validation
    if (!name.trim() || !city.trim() || !state.trim() || !startDate || !endDate) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      // Parse dates - create Date at UTC midnight to ensure consistency
      const parseDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Create date at UTC midnight
        const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        return date;
      };

      const startDateObj = parseDate(startDate);
      const endDateObj = parseDate(endDate);

      console.log('Saving dates:', {
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
      });

      const updates: any = {
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        address: address.trim() || undefined,
        startDate: Timestamp.fromDate(startDateObj),
        endDate: Timestamp.fromDate(endDateObj),
      };

      await firebaseService.updateTournament(tournamentId, updates);
      Alert.alert('Success', 'Tournament updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating tournament:', error);
      Alert.alert('Error', 'Failed to update tournament');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text variant="headlineMedium" style={styles.accessDeniedTitle}>
          Access Denied
        </Text>
        <Text variant="bodyLarge" style={styles.accessDeniedText}>
          You do not have permission to edit tournaments.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading tournament...</Text>
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="headlineMedium">Tournament Not Found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Tournament Information
          </Text>
          <TextInput
            label="Tournament Name *"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            label="City *"
            mode="outlined"
            value={city}
            onChangeText={setCity}
            style={styles.input}
          />
          <TextInput
            label="State *"
            mode="outlined"
            value={state}
            onChangeText={setState}
            style={styles.input}
          />
          <TextInput
            label="Address"
            mode="outlined"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            multiline
            numberOfLines={2}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Dates
          </Text>
          <TextInput
            label="Start Date (YYYY-MM-DD) *"
            mode="outlined"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2024-01-01"
            style={styles.input}
          />
          <TextInput
            label="End Date (YYYY-MM-DD) *"
            mode="outlined"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2024-01-07"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <View style={styles.actions}>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
  input: {
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
  },
});

export default EditTournamentScreen;
