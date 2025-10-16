import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import RegisterScreen from '../RegisterScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

// Mock AuthContext
const mockSignUp = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: () => ({
    signUp: mockSignUp,
    loading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

const renderRegisterScreen = () => {
  return render(
    <PaperProvider>
      <RegisterScreen navigation={mockNavigation} />
    </PaperProvider>
  );
};

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render register form correctly', () => {
    const { getByText, getByLabelText } = renderRegisterScreen();

    expect(getByText('Join CourtSide')).toBeTruthy();
    expect(getByText('Create your account to start following teams and games')).toBeTruthy();
    expect(getByLabelText('Display Name')).toBeTruthy();
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByLabelText('Confirm Password')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Already have an account?')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should validate all required fields', async () => {
    const { getByText } = renderRegisterScreen();

    const createAccountButton = getByText('Create Account');
    fireEvent.press(createAccountButton);

    await waitFor(() => {
      expect(getByText('Display name is required')).toBeTruthy();
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
      expect(getByText('Please confirm your password')).toBeTruthy();
    });
  });

  it('should validate display name length', async () => {
    const { getByLabelText, getByText } = renderRegisterScreen();

    const displayNameInput = getByLabelText('Display Name');
    const createAccountButton = getByText('Create Account');

    // Test short display name
    fireEvent.changeText(displayNameInput, 'A');
    fireEvent.press(createAccountButton);

    await waitFor(() => {
      expect(getByText('Display name must be at least 2 characters long')).toBeTruthy();
    });
  });

  it('should validate email format', async () => {
    const { getByLabelText, getByText } = renderRegisterScreen();

    const emailInput = getByLabelText('Email');
    const createAccountButton = getByText('Create Account');

    // Test invalid email
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(createAccountButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('should validate password length', async () => {
    const { getByLabelText, getByText } = renderRegisterScreen();

    const passwordInput = getByLabelText('Password');
    const createAccountButton = getByText('Create Account');

    // Test short password
    fireEvent.changeText(passwordInput, '123');
    fireEvent.press(createAccountButton);

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters long')).toBeTruthy();
    });
  });

  it('should validate password confirmation', async () => {
    const { getByLabelText, getByText } = renderRegisterScreen();

    const passwordInput = getByLabelText('Password');
    const confirmPasswordInput = getByLabelText('Confirm Password');
    const createAccountButton = getByText('Create Account');

    // Test mismatched passwords
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password456');
    fireEvent.press(createAccountButton);

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('should call signUp with correct data', async () => {
    const { getByLabelText, getByText } = renderRegisterScreen();

    const displayNameInput = getByLabelText('Display Name');
    const emailInput = getByLabelText('Email');
    const passwordInput = getByLabelText('Password');
    const confirmPasswordInput = getByLabelText('Confirm Password');
    const createAccountButton = getByText('Create Account');

    fireEvent.changeText(displayNameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(createAccountButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
    });
  });

  it('should toggle password visibility', () => {
    const { getByLabelText } = renderRegisterScreen();

    const passwordInput = getByLabelText('Password');
    const confirmPasswordInput = getByLabelText('Confirm Password');
    const passwordToggle = getByLabelText('toggle password visibility');
    const confirmPasswordToggle = getByLabelText('toggle confirm password visibility');

    // Initially passwords should be hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);
    expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

    // Toggle password visibility
    fireEvent.press(passwordToggle);
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Toggle confirm password visibility
    fireEvent.press(confirmPasswordToggle);
    expect(confirmPasswordInput.props.secureTextEntry).toBe(false);
  });

  it('should navigate to login screen', () => {
    const { getByText } = renderRegisterScreen();

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('should clear field errors when user starts typing', async () => {
    const { getByLabelText, getByText, queryByText } = renderRegisterScreen();

    const displayNameInput = getByLabelText('Display Name');
    const createAccountButton = getByText('Create Account');

    // Trigger validation error
    fireEvent.press(createAccountButton);
    await waitFor(() => {
      expect(getByText('Display name is required')).toBeTruthy();
    });

    // Start typing to clear error
    fireEvent.changeText(displayNameInput, 'Test');
    await waitFor(() => {
      expect(queryByText('Display name is required')).toBeNull();
    });
  });
});