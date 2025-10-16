import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import LoginScreen from '../LoginScreen';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

// Mock AuthContext
const mockSignIn = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: () => ({
    signIn: mockSignIn,
    loading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

const renderLoginScreen = () => {
  return render(
    <PaperProvider>
      <LoginScreen navigation={mockNavigation} />
    </PaperProvider>
  );
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form correctly', () => {
    const { getByText, getByLabelText } = renderLoginScreen();

    expect(getByText('Welcome to CourtSide')).toBeTruthy();
    expect(getByText('Sign in to follow your favorite teams and games')).toBeTruthy();
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText("Don't have an account?")).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('should validate email field', async () => {
    const { getByLabelText, getByText } = renderLoginScreen();

    const emailInput = getByLabelText('Email');
    const signInButton = getByText('Sign In');

    // Test empty email
    fireEvent.press(signInButton);
    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });

    // Test invalid email
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);
    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('should validate password field', async () => {
    const { getByLabelText, getByText } = renderLoginScreen();

    const emailInput = getByLabelText('Email');
    const signInButton = getByText('Sign In');

    // Enter valid email but no password
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('should call signIn with correct credentials', async () => {
    const { getByLabelText, getByText } = renderLoginScreen();

    const emailInput = getByLabelText('Email');
    const passwordInput = getByLabelText('Password');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should toggle password visibility', () => {
    const { getByLabelText } = renderLoginScreen();

    const passwordInput = getByLabelText('Password');
    const toggleButton = getByLabelText('toggle password visibility');

    // Initially password should be hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // Toggle to show password
    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Toggle to hide password again
    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('should navigate to register screen', () => {
    const { getByText } = renderLoginScreen();

    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('should clear field errors when user starts typing', async () => {
    const { getByLabelText, getByText, queryByText } = renderLoginScreen();

    const emailInput = getByLabelText('Email');
    const signInButton = getByText('Sign In');

    // Trigger validation error
    fireEvent.press(signInButton);
    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });

    // Start typing to clear error
    fireEvent.changeText(emailInput, 'test');
    await waitFor(() => {
      expect(queryByText('Email is required')).toBeNull();
    });
  });
});

// Test with loading state
describe('LoginScreen - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state during sign in', () => {
    jest.doMock('../../../contexts/AuthContext', () => ({
      ...jest.requireActual('../../../contexts/AuthContext'),
      useAuth: () => ({
        signIn: mockSignIn,
        loading: true,
        error: null,
        clearError: mockClearError,
      }),
    }));

    const { getByText } = renderLoginScreen();

    expect(getByText('Signing In...')).toBeTruthy();
  });
});

// Test with error state
describe('LoginScreen - Error State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display auth error', () => {
    jest.doMock('../../../contexts/AuthContext', () => ({
      ...jest.requireActual('../../../contexts/AuthContext'),
      useAuth: () => ({
        signIn: mockSignIn,
        loading: false,
        error: 'Invalid email or password',
        clearError: mockClearError,
      }),
    }));

    const { getByText } = renderLoginScreen();

    expect(getByText('Invalid email or password')).toBeTruthy();
  });
});