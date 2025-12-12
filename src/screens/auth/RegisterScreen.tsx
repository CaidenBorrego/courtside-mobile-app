import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
} from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../utils';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { signUp, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Clear auth error when user starts typing
    if (error) {
      clearError();
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors = {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    };

    // Validate display name
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    }

    // Validate email
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate password
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Password must be at least 6 characters long';
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return !errors.displayName && !errors.email && !errors.password && !errors.confirmPassword;
  };

  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await signUp(formData.email.trim(), formData.password, formData.displayName.trim());
      // Navigation will be handled by the auth state change
    } catch (error) {
      // Error is handled by the context and displayed in the UI
      console.error('Registration error:', error);
    }
  };

  // Navigate to login screen
  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Create Account</Title>
              <Paragraph style={styles.subtitle}>
                Join CourtSide to follow your favorite teams
              </Paragraph>

              {/* Display Name Input */}
              <TextInput
                label="Display Name"
                value={formData.displayName}
                onChangeText={(value) => handleInputChange('displayName', value)}
                mode="outlined"
                autoCapitalize="words"
                autoComplete="name"
                error={!!formErrors.displayName}
                style={styles.input}
                disabled={loading}
              />
              <HelperText type="error" visible={!!formErrors.displayName}>
                {formErrors.displayName}
              </HelperText>

              {/* Email Input */}
              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={!!formErrors.email}
                style={styles.input}
                disabled={loading}
              />
              <HelperText type="error" visible={!!formErrors.email}>
                {formErrors.email}
              </HelperText>

              {/* Password Input */}
              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                error={!!formErrors.password}
                style={styles.input}
                disabled={loading}
              />
              <HelperText type="error" visible={!!formErrors.password}>
                {formErrors.password}
              </HelperText>

              {/* Confirm Password Input */}
              <TextInput
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                error={!!formErrors.confirmPassword}
                style={styles.input}
                disabled={loading}
              />
              <HelperText type="error" visible={!!formErrors.confirmPassword}>
                {formErrors.confirmPassword}
              </HelperText>

              {/* Auth Error */}
              {error && (
                <HelperText type="error" visible={true} style={styles.authError}>
                  {error}
                </HelperText>
              )}

              {/* Register Button */}
              <Button
                mode="contained"
                onPress={handleRegister}
                style={styles.registerButton}
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Button mode="text" onPress={navigateToLogin} disabled={loading} compact>
                  Sign In
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 4,
  },
  authError: {
    textAlign: 'center',
    marginBottom: 16,
  },
  registerButton: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 4,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    opacity: 0.7,
  },
});

export default RegisterScreen;
