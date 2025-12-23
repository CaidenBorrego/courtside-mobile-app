import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput, Card } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  bulkImportTournamentData,
  parseBulkImportJSON,
  generateSampleImportData,
} from '../../utils/bulkImport';
import Button from '../../components/common/Button';

const BulkImportScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigation = useNavigation();
  const [jsonData, setJsonData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoadSample = () => {
    const sampleData = generateSampleImportData();
    setJsonData(sampleData);
  };

  const handleImport = async () => {
    if (!jsonData.trim()) {
      Alert.alert('Error', 'Please enter JSON data to import');
      return;
    }

    const parsedData = parseBulkImportJSON(jsonData);
    if (!parsedData) {
      Alert.alert('Error', 'Invalid JSON format. Please check your data.');
      return;
    }

    setLoading(true);
    try {
      const result = await bulkImportTournamentData(
        parsedData,
        userProfile?.id || ''
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `Tournament imported successfully!\n\n` +
            `Divisions: ${result.divisionsCreated}\n` +
            `Locations: ${result.locationsCreated}\n` +
            `Games: ${result.gamesCreated}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import tournament data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Bulk Import Tournament Data
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Import tournament, divisions, locations, and games from JSON
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Instructions
            </Text>
            <Text variant="bodyMedium" style={styles.instructionText}>
              1. Prepare your tournament data in JSON format
            </Text>
            <Text variant="bodyMedium" style={styles.instructionText}>
              2. Paste the JSON data in the text area below
            </Text>
            <Text variant="bodyMedium" style={styles.instructionText}>
              3. Click &quot;Import&quot; to create the tournament
            </Text>
            <Text variant="bodySmall" style={styles.noteText}>
              Note: You can load a sample JSON to see the expected format
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              title="Load Sample"
              mode="outlined"
              onPress={handleLoadSample}
            />
          </Card.Actions>
        </Card>

        <View style={styles.inputContainer}>
          <Text variant="titleMedium" style={styles.inputLabel}>
            JSON Data
          </Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={20}
            value={jsonData}
            onChangeText={setJsonData}
            placeholder="Paste your JSON data here..."
            style={styles.textInput}
          />
        </View>

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#000000" />
          ) : (
            <>
              <Button
                title="Import Tournament"
                mode="contained"
                onPress={handleImport}
              />
              <View style={styles.buttonSpacer} />
              <Button
                title="Cancel"
                mode="outlined"
                onPress={() => navigation.goBack()}
              />
            </>
          )}
        </View>
      </ScrollView>
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
  card: {
    margin: 16,
  },
  cardTitle: {
    marginBottom: 12,
  },
  instructionText: {
    marginBottom: 8,
    color: '#374151',
  },
  noteText: {
    marginTop: 8,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    margin: 16,
  },
  inputLabel: {
    marginBottom: 8,
  },
  textInput: {
    minHeight: 300,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    margin: 16,
    marginTop: 8,
  },
  buttonSpacer: {
    height: 12,
  },
});

export default BulkImportScreen;
