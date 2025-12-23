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

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signIn, loading, error, clearError } = useAuth();
  const { colors } = useTheme();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (error) {
      clearError();
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      email: '',
      password: '',
    };

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Password must be at least 6 characters long';
    }

    setFormErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await signIn(formData.email.trim(), formData.password);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
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
            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to follow your favorite teams and games
            </Text>

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

            {error && (
              <HelperText type="error" visible={true} style={styles.authError}>
                {error}
              </HelperText>
            )}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[styles.loginButton, { backgroundColor: colors.text, opacity: loading ? 0.6 : 1 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.loginButtonText, { color: colors.background }]}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>
                Don&apos;t have an account?{' '}
              </Text>
              <TouchableOpacity onPress={navigateToRegister} disabled={loading}>
                <Text style={[styles.registerLink, { color: colors.text }]}>
                  Sign Up
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
    marginBottom: 28,
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
  loginButton: {
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
  loginButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 15,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LoginScreen;
