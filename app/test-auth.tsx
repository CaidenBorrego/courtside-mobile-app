import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Title, TextInput, HelperText } from 'react-native-paper';
import { useAuth } from '../src/contexts/AuthContext';

export default function TestAuthScreen() {
  const { user, isAuthenticated, loading, error, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Test User');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async () => {
    try {
      if (isRegistering) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Authentication Test</Title>
          
          <Text style={styles.status}>
            Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </Text>

          {loading && <Text>Loading...</Text>}
          
          {error && <Text style={styles.error}>Error: {error}</Text>}

          {user && (
            <View style={styles.userInfo}>
              <Text>User ID: {user.uid}</Text>
              <Text>Email: {user.email}</Text>
              <Text>Display Name: {user.displayName}</Text>
            </View>
          )}

          {!isAuthenticated && (
            <View style={styles.form}>
              {isRegistering && (
                <TextInput
                  label="Display Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  mode="outlined"
                  style={styles.input}
                />
              )}
              
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
              />

              <Button 
                mode="contained" 
                onPress={handleAuth}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                {isRegistering ? 'Sign Up' : 'Sign In'}
              </Button>

              <Button 
                mode="text" 
                onPress={() => setIsRegistering(!isRegistering)}
                style={styles.button}
              >
                {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Button>
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

          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>Instructions:</Text>
            <Text>1. Update .env with your Firebase config</Text>
            <Text>2. Try signing up with a new email</Text>
            <Text>3. Check Firebase Console for the new user</Text>
            <Text>4. Try signing in with the same credentials</Text>
          </View>
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
  userInfo: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  form: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginBottom: 12,
  },
  instructions: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  instructionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
});