import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Title } from 'react-native-paper';
import { useAuth } from '../src/contexts/AuthContext';
import { LoginScreen } from '../src/screens/auth';
import AuthTestScreen from './auth-test';

export default function DemoScreen() {
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (isAuthenticated) {
    return <AuthTestScreen />;
  }

  if (showLogin) {
    return (
      <View style={styles.container}>
        <LoginScreen navigation={{ navigate: () => {} }} />
        <Button 
          mode="text" 
          onPress={() => setShowLogin(false)}
          style={styles.backButton}
        >
          Back to Demo
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>CourtSide Auth Demo</Title>
          
          <Button 
            mode="contained" 
            onPress={() => setShowLogin(true)}
            style={styles.button}
          >
            Test Login Screen
          </Button>

          <Button 
            mode="outlined" 
            onPress={() => {/* Navigate to register */}}
            style={styles.button}
          >
            Test Register Screen
          </Button>
        </Card.Content>
      </Card>
    </View>
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
  button: {
    marginBottom: 12,
  },
  backButton: {
    marginTop: 16,
  },
});