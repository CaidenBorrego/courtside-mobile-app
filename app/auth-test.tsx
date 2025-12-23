import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Title, Paragraph } from 'react-native-paper';
import { useAuth } from '../src/contexts/AuthContext';

export default function AuthTestScreen() {
  const { user, userProfile, isAuthenticated, loading, error, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Authentication Status</Title>
          
          <Paragraph style={styles.status}>
            Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </Paragraph>

          {error && (
            <Text style={styles.error}>Error: {error}</Text>
          )}

          {user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Info:</Text>
              <Text>UID: {user.uid}</Text>
              <Text>Email: {user.email}</Text>
              <Text>Display Name: {user.displayName}</Text>
              <Text>Email Verified: {user.emailVerified ? 'Yes' : 'No'}</Text>
            </View>
          )}

          {userProfile && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Profile:</Text>
              <Text>ID: {userProfile.id}</Text>
              <Text>Display Name: {userProfile.displayName}</Text>
              <Text>Role: {userProfile.role}</Text>
              {/* NOTIFICATIONS TEMPORARILY DISABLED */}
              {/* <Text>Notifications: {userProfile.notificationsEnabled ? 'Enabled' : 'Disabled'}</Text> */}
              <Text>Following Teams: {userProfile.followingTeams.length}</Text>
              <Text>Following Games: {userProfile.followingGames.length}</Text>
            </View>
          )}

          {isAuthenticated && (
            <Button 
              mode="contained" 
              onPress={signOut}
              style={styles.button}
            >
              Sign Out
            </Button>
          )}

          {!isAuthenticated && (
            <View style={styles.section}>
              <Text>To test authentication:</Text>
              <Text>1. Replace the Firebase config in .env</Text>
              <Text>2. Use the LoginScreen or RegisterScreen</Text>
              <Text>3. Check this screen for auth status</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
});