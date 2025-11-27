import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../ProfileScreen';
import { useAuth } from '../../../contexts/AuthContext';
import { userProfileService } from '../../../services/user/UserProfileService';
import { firebaseService } from '../../../services/firebase';
import { UserRole, GameStatus } from '../../../types';
import { mockTimestamp } from '../../../__tests__/setup';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../services/user/UserProfileService');
jest.mock('../../../services/firebase');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUserProfileService = userProfileService as jest.Mocked<typeof userProfileService>;
const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;

describe('ProfileScreen', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockUserProfile = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.USER,
    followingTeams: ['Team A', 'Team B'],
    followingGames: ['game-1', 'game-2'],
    notificationsEnabled: true,
    createdAt: mockTimestamp.now(),
    lastActive: mockTimestamp.now(),
  };

  const mockGame = {
    id: 'game-1',
    tournamentId: 'tournament-1',
    divisionId: 'division-1',
    teamA: 'Team A',
    teamB: 'Team B',
    scoreA: 10,
    scoreB: 8,
    startTime: mockTimestamp.now(),
    locationId: 'location-1',
    status: GameStatus.COMPLETED,
    createdAt: mockTimestamp.now(),
  };

  const mockRefreshUserProfile = jest.fn();
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');

    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      userProfile: mockUserProfile,
      loading: false,
      error: null,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      clearError: jest.fn(),
      refreshUserProfile: mockRefreshUserProfile,
    });

    mockFirebaseService.getGame.mockResolvedValue(mockGame);
  });

  it('should render user information correctly', async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByText('USER')).toBeTruthy();
    });
  });

  it('should display following statistics', async () => {
    const { getAllByText, getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      const twoElements = getAllByText('2');
      expect(twoElements.length).toBeGreaterThan(0); // Teams and games count
      expect(getByText('Teams')).toBeTruthy();
      expect(getByText('Games')).toBeTruthy();
    });
  });

  it('should display followed teams list', async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Team A')).toBeTruthy();
      expect(getByText('Team B')).toBeTruthy();
    });
  });

  it('should toggle notifications', async () => {
    mockUserProfileService.toggleNotifications.mockResolvedValue();

    const { getByRole } = render(<ProfileScreen />);

    await waitFor(() => {
      const notificationSwitch = getByRole('switch');
      expect(notificationSwitch).toBeTruthy();
    });

    const notificationSwitch = getByRole('switch');
    fireEvent(notificationSwitch, 'onValueChange', false);

    await waitFor(() => {
      expect(mockUserProfileService.toggleNotifications).toHaveBeenCalledWith(
        'test-user-id',
        false
      );
      expect(mockRefreshUserProfile).toHaveBeenCalled();
    });
  });

  it('should handle unfollow team', async () => {
    mockUserProfileService.unfollowTeam.mockResolvedValue();

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Team A')).toBeTruthy();
    });

    const teamItem = getByText('Team A');
    fireEvent.press(teamItem);

    // Confirm the alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Unfollow Team',
      'Are you sure you want to unfollow Team A?',
      expect.any(Array)
    );

    // Simulate pressing "Unfollow" button
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const unfollowButton = alertCall[2][1];
    await unfollowButton.onPress();

    await waitFor(() => {
      expect(mockUserProfileService.unfollowTeam).toHaveBeenCalledWith(
        'test-user-id',
        'Team A'
      );
      expect(mockRefreshUserProfile).toHaveBeenCalled();
    });
  });

  it('should handle unfollow game', async () => {
    mockUserProfileService.unfollowGame.mockResolvedValue();

    const { getAllByText } = render(<ProfileScreen />);

    await waitFor(() => {
      const gameElements = getAllByText('Team A vs Team B');
      expect(gameElements.length).toBeGreaterThan(0);
    });

    const gameElements = getAllByText('Team A vs Team B');
    fireEvent.press(gameElements[0]);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Unfollow Game',
      expect.stringContaining('Team A vs Team B'),
      expect.any(Array)
    );
  });

  it('should handle sign out', async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Sign Out')).toBeTruthy();
    });

    const signOutButton = getByText('Sign Out');
    fireEvent.press(signOutButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );

    // Simulate pressing "Sign Out" button
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmButton = alertCall[2][1];
    await confirmButton.onPress();

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('should show loading state when user profile is not available', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      userProfile: null,
      loading: true,
      error: null,
      isAuthenticated: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      clearError: jest.fn(),
      refreshUserProfile: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Loading profile...')).toBeTruthy();
  });

  it('should show empty state when no teams are followed', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      userProfile: {
        ...mockUserProfile,
        followingTeams: [],
        followingGames: [],
      },
      loading: false,
      error: null,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      clearError: jest.fn(),
      refreshUserProfile: mockRefreshUserProfile,
    });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('No teams followed yet')).toBeTruthy();
      expect(getByText('No games followed yet')).toBeTruthy();
    });
  });

  it('should handle notification toggle error', async () => {
    mockUserProfileService.toggleNotifications.mockRejectedValue(
      new Error('Failed to update')
    );

    const { getByRole } = render(<ProfileScreen />);

    await waitFor(() => {
      const notificationSwitch = getByRole('switch');
      expect(notificationSwitch).toBeTruthy();
    });

    const notificationSwitch = getByRole('switch');
    fireEvent(notificationSwitch, 'onValueChange', false);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to update notification preferences'
      );
    });
  });

  it('should load followed games data', async () => {
    const { getAllByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(mockFirebaseService.getGame).toHaveBeenCalledWith('game-1');
      expect(mockFirebaseService.getGame).toHaveBeenCalledWith('game-2');
      const gameElements = getAllByText('Team A vs Team B');
      expect(gameElements.length).toBeGreaterThan(0);
      const scoreElements = getAllByText('10 - 8');
      expect(scoreElements.length).toBeGreaterThan(0);
    });
  });
});
