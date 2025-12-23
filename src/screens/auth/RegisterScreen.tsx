import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  HelperText,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../utils';
import { useTheme } from '../../hooks/useTheme';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { signUp, loading, error, clearError } = useAuth();
  const { colors } = useTheme();

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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo/Icon Section */}
          <View style={styles.logoContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.text }]}>
              <Ionicons name="basketball" size={48} color={colors.background} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>CourtSide</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join CourtSide to follow your favorite teams
            </Text>

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
              outlineColor={colors.border}
              activeOutlineColor={colors.text}
              textColor={colors.text}
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
              outlineColor={colors.border}
              activeOutlineColor={colors.text}
              textColor={colors.text}
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
              outlineColor={colors.border}
              activeOutlineColor={colors.text}
              textColor={colors.text}
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
              outlineColor={colors.border}
              activeOutlineColor={colors.text}
              textColor={colors.text}
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
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={[styles.registerButton, { backgroundColor: colors.text, opacity: loading ? 0.6 : 1 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.registerButtonText, { color: colors.background }]}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={navigateToLogin} disabled={loading}>
                <Text style={[styles.loginLink, { color: colors.text }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  authError: {
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  registerButton: {
    marginTop: 24,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default RegisterScreen;
