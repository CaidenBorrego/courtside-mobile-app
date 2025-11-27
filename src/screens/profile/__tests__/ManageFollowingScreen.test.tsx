import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ManageFollowingScreen from '../ManageFollowingScreen';
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

describe('ManageFollowingScreen', () => {
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
    followingTeams: ['Team A', 'Team B', 'Team C'],
    followingGames: ['game-1', 'game-2'],
    notificationsEnabled: true,
    createdAt: mockTimestamp.now(),
    lastActive: mockTimestamp.now(),
  };

  const mockGame1 = {
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

  const mockGame2 = {
    id: 'game-2',
    tournamentId: 'tournament-1',
    divisionId: 'division-1',
    teamA: 'Team C',
    teamB: 'Team D',
    scoreA: 15,
    scoreB: 12,
    startTime: mockTimestamp.now(),
    locationId: 'location-1',
    status: GameStatus.COMPLETED,
    createdAt: mockTimestamp.now(),
  };

  const mockRefreshUserProfile = jest.fn();

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
      signOut: jest.fn(),
      clearError: jest.fn(),
      refreshUserProfile: mockRefreshUserProfile,
    });

    mockFirebaseService.getGame.mockImplementation((gameId: string) => {
      if (gameId === 'game-1') return Promise.resolve(mockGame1);
      if (gameId === 'game-2') return Promise.resolve(mockGame2);
      return Promise.reject(new Error('Game not found'));
    });
  });

  describe('Teams Mode', () => {
    it('should render followed teams list', async () => {
      const { getByText } = render(<ManageFollowingScreen type="teams" />);

      await waitFor(() => {
        expect(getByText('Team A')).toBeTruthy();
        expect(getByText('Team B')).toBeTruthy();
        expect(getByText('Team C')).toBeTruthy();
      });
    });

    it('should filter teams based on search query', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <ManageFollowingScreen type="teams" />
      );

      await waitFor(() => {
        expect(getByText('Team A')).toBeTruthy();
      });

      const searchBar = getByPlaceholderText('Search teams...');
      fireEvent.changeText(searchBar, 'Team A');

      await waitFor(() => {
        expect(getByText('Team A')).toBeTruthy();
        expect(queryByText('Team B')).toBeNull();
        expect(queryByText('Team C')).toBeNull();
      });
    });

    it('should select and deselect teams', async () => {
      const { getByText, queryByText } = render(<ManageFollowingScreen type="teams" />);

      await waitFor(() => {
        expect(getByText('Team A')).toBeTruthy();
      });

      const teamItem = getByText('Team A');
      fireEvent.press(teamItem);

      // Team should be selected
      await waitFor(() => {
        expect(getByText('Unfollow (1)')).toBeTruthy();
      });

      // Deselect
      fireEvent.press(teamItem);

      await waitFor(() => {
        expect(queryByText('Unfollow (1)')).toBeNull();
      });
    });

    it('should select all teams', async () => {
      const { getByText } = render(<ManageFollowingScreen type="teams" />);

      await waitFor(() => {
        expect(getByText('Select All')).toBeTruthy();
      });

      const selectAllButton = getByText('Select All');
      fireEvent.press(selectAllButton);

      await waitFor(() => {
        expect(getByText('Unfollow (3)')).toBeTruthy();
        expect(getByText('Deselect All')).toBeTruthy();
      });
    });

    it('should bulk unfollow selected teams', async () => {
      mockUserProfileService.bulkUnfollowTeams.mockResolvedValue();

      const { getByText } = render(<ManageFollowingScreen type="teams" />);

      await waitFor(() => {
        expect(getByText('Team A')).toBeTruthy();
      });

      // Select Team A
      const teamItem = getByText('Team A');
      fireEvent.press(teamItem);

      await waitFor(() => {
        expect(getByText('Unfollow (1)')).toBeTruthy();
      });

      // Click unfollow button
      const unfollowButton = getByText('Unfollow (1)');
      fireEvent.press(unfollowButton);

      // Confirm alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirm Unfollow',
        'Are you sure you want to unfollow 1 teams?',
        expect.any(Array)
      );

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];
      await confirmButton.onPress();

      await waitFor(() => {
        expect(mockUserProfileService.bulkUnfollowTeams).toHaveBeenCalledWith(
          'test-user-id',
          ['Team A']
        );
        expect(mockRefreshUserProfile).toHaveBeenCalled();
      });
    });

    it('should clear all teams', async () => {
      mockUserProfileService.bulkUnfollowTeams.mockResolvedValue();

      const { getByText } = render(<ManageFollowingScreen type="teams" />);

      await waitFor(() => {
        expect(getByText('Clear All')).toBeTruthy();
      });

      const clearAllButton = getByText('Clear All');
      fireEvent.press(clearAllButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear All',
        'Are you sure you want to unfollow all teams?',
        expect.any(Array)
      );

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];
      await confirmButton.onPress();

      await waitFor(() => {
        expect(mockUserProfileService.bulkUnfollowTeams).toHaveBeenCalledWith(
          'test-user-id',
          ['Team A', 'Team B', 'Team C']
        );
        expect(mockRefreshUserProfile).toHaveBeenCalled();
      });
    });

    it('should show empty state when no teams are followed', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser as any,
        userProfile: {
          ...mockUserProfile,
          followingTeams: [],
        },
        loading: false,
        error: null,
        isAuthenticated: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
        refreshUserProfile: mockRefreshUserProfile,
      });

      const { getByText } = render(<ManageFollowingScreen type="teams" />);

      await waitFor(() => {
        expect(getByText('No teams followed')).toBeTruthy();
        expect(getByText('Start following teams to see them here')).toBeTruthy();
      });
    });
  });

  describe('Games Mode', () => {
    it('should render followed games list', async () => {
      const { getByText } = render(<ManageFollowingScreen type="games" />);

      await waitFor(() => {
        expect(getByText('Team A vs Team B')).toBeTruthy();
        expect(getByText('Team C vs Team D')).toBeTruthy();
        expect(getByText('10 - 8')).toBeTruthy();
        expect(getByText('15 - 12')).toBeTruthy();
      });
    });

    it('should filter games based on search query', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <ManageFollowingScreen type="games" />
      );

      await waitFor(() => {
        expect(getByText('Team A vs Team B')).toBeTruthy();
      });

      const searchBar = getByPlaceholderText('Search games...');
      fireEvent.changeText(searchBar, 'Team A');

      await waitFor(() => {
        expect(getByText('Team A vs Team B')).toBeTruthy();
        expect(queryByText('Team C vs Team D')).toBeNull();
      });
    });

    it('should bulk unfollow selected games', async () => {
      mockUserProfileService.bulkUnfollowGames.mockResolvedValue();

      const { getByText } = render(<ManageFollowingScreen type="games" />);

      await waitFor(() => {
        expect(getByText('Team A vs Team B')).toBeTruthy();
      });

      // Select game
      const gameItem = getByText('Team A vs Team B');
      fireEvent.press(gameItem);

      await waitFor(() => {
        expect(getByText('Unfollow (1)')).toBeTruthy();
      });

      // Click unfollow button
      const unfollowButton = getByText('Unfollow (1)');
      fireEvent.press(unfollowButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];
      await confirmButton.onPress();

      await waitFor(() => {
        expect(mockUserProfileService.bulkUnfollowGames).toHaveBeenCalledWith(
          'test-user-id',
          ['game-1']
        );
        expect(mockRefreshUserProfile).toHaveBeenCalled();
      });
    });

    it('should show empty state when no games are followed', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser as any,
        userProfile: {
          ...mockUserProfile,
          followingGames: [],
        },
        loading: false,
        error: null,
        isAuthenticated: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
        refreshUserProfile: mockRefreshUserProfile,
      });

      const { getByText } = render(<ManageFollowingScreen type="games" />);

      await waitFor(() => {
        expect(getByText('No games followed')).toBeTruthy();
        expect(getByText('Start following games to see them here')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle bulk unfollow error', async () => {
      mockUserProfileService.bulkUnfollowTeams.mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<ManageFollowingScreen type="teams" />);

      await waitFor(() => {
        expect(getByText('Team A')).toBeTruthy();
      });

      // Select and unfollow
      const teamItem = getByText('Team A');
      fireEvent.press(teamItem);

      await waitFor(() => {
        expect(getByText('Unfollow (1)')).toBeTruthy();
      });

      const unfollowButton = getByText('Unfollow (1)');
      fireEvent.press(unfollowButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];
      await confirmButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to unfollow teams');
      });
    });
  });
});
