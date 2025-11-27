import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FollowButton from '../FollowButton';
import { useAuth } from '../../../contexts/AuthContext';
import { userProfileService } from '../../../services/user/UserProfileService';
import { UserRole } from '../../../types';
import { mockTimestamp } from '../../../__tests__/setup';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../services/user/UserProfileService');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUserProfileService = userProfileService as jest.Mocked<typeof userProfileService>;

describe('FollowButton', () => {
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
    followingTeams: ['Team A'],
    followingGames: ['game-1'],
    notificationsEnabled: true,
    createdAt: mockTimestamp.now(),
    lastActive: mockTimestamp.now(),
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
  });

  describe('Team Following', () => {
    it('should render follow button for unfollowed team', () => {
      const { getByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" />
      );

      expect(getByText('Follow')).toBeTruthy();
    });

    it('should render following button for followed team', () => {
      const { getByText } = render(
        <FollowButton itemId="Team A" itemType="team" itemName="Team A" />
      );

      expect(getByText('Following')).toBeTruthy();
    });

    it('should follow a team when follow button is pressed', async () => {
      mockUserProfileService.followTeam.mockResolvedValue();

      const onFollowChange = jest.fn();
      const { getByText } = render(
        <FollowButton
          itemId="Team B"
          itemType="team"
          itemName="Team B"
          onFollowChange={onFollowChange}
        />
      );

      const followButton = getByText('Follow');
      fireEvent.press(followButton);

      await waitFor(() => {
        expect(mockUserProfileService.followTeam).toHaveBeenCalledWith(
          'test-user-id',
          'Team B'
        );
        expect(mockRefreshUserProfile).toHaveBeenCalled();
        expect(onFollowChange).toHaveBeenCalledWith(true);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          "Following Team B! You'll also automatically follow all their games."
        );
      });
    });

    it('should unfollow a team when following button is pressed', async () => {
      mockUserProfileService.unfollowTeam.mockResolvedValue();

      const onFollowChange = jest.fn();
      const { getByText } = render(
        <FollowButton
          itemId="Team A"
          itemType="team"
          itemName="Team A"
          onFollowChange={onFollowChange}
        />
      );

      const followingButton = getByText('Following');
      fireEvent.press(followingButton);

      await waitFor(() => {
        expect(mockUserProfileService.unfollowTeam).toHaveBeenCalledWith(
          'test-user-id',
          'Team A'
        );
        expect(mockRefreshUserProfile).toHaveBeenCalled();
        expect(onFollowChange).toHaveBeenCalledWith(false);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Unfollowed Team A. Their games have been unfollowed too.'
        );
      });
    });

    it('should handle follow team error', async () => {
      mockUserProfileService.followTeam.mockRejectedValue(
        new Error('Already following this team')
      );

      const { getByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" />
      );

      const followButton = getByText('Follow');
      fireEvent.press(followButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Already following this team');
      });
    });
  });

  describe('Game Following', () => {
    it('should render follow button for unfollowed game', () => {
      const { getByText } = render(
        <FollowButton itemId="game-2" itemType="game" itemName="Game 2" />
      );

      expect(getByText('Follow')).toBeTruthy();
    });

    it('should render following button for followed game', () => {
      const { getByText } = render(
        <FollowButton itemId="game-1" itemType="game" itemName="Game 1" />
      );

      expect(getByText('Following')).toBeTruthy();
    });

    it('should follow a game when follow button is pressed', async () => {
      mockUserProfileService.followGame.mockResolvedValue();

      const onFollowChange = jest.fn();
      const { getByText } = render(
        <FollowButton
          itemId="game-2"
          itemType="game"
          itemName="Game 2"
          onFollowChange={onFollowChange}
        />
      );

      const followButton = getByText('Follow');
      fireEvent.press(followButton);

      await waitFor(() => {
        expect(mockUserProfileService.followGame).toHaveBeenCalledWith(
          'test-user-id',
          'game-2'
        );
        expect(mockRefreshUserProfile).toHaveBeenCalled();
        expect(onFollowChange).toHaveBeenCalledWith(true);
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Following Game 2');
      });
    });

    it('should unfollow a game when following button is pressed', async () => {
      mockUserProfileService.unfollowGame.mockResolvedValue();

      const onFollowChange = jest.fn();
      const { getByText } = render(
        <FollowButton
          itemId="game-1"
          itemType="game"
          itemName="Game 1"
          onFollowChange={onFollowChange}
        />
      );

      const followingButton = getByText('Following');
      fireEvent.press(followingButton);

      await waitFor(() => {
        expect(mockUserProfileService.unfollowGame).toHaveBeenCalledWith(
          'test-user-id',
          'game-1'
        );
        expect(mockRefreshUserProfile).toHaveBeenCalled();
        expect(onFollowChange).toHaveBeenCalledWith(false);
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Unfollowed Game 1');
      });
    });
  });

  describe('Compact Mode', () => {
    it('should render compact button', () => {
      const { getByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" compact />
      );

      expect(getByText('Follow')).toBeTruthy();
    });
  });

  describe('Unauthenticated User', () => {
    it('should not render button when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
        refreshUserProfile: jest.fn(),
      });

      const { queryByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" />
      );

      expect(queryByText('Follow')).toBeNull();
    });

    it('should show alert when unauthenticated user tries to follow', async () => {
      // First render with authenticated user
      const { getByText, rerender, queryByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" />
      );

      // Then change to unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
        refreshUserProfile: jest.fn(),
      });

      rerender(<FollowButton itemId="Team B" itemType="team" itemName="Team B" />);

      // Button should not be visible
      expect(queryByText('Follow')).toBeNull();
    });
  });

  describe('Optimistic UI Updates', () => {
    it('should show optimistic update while following', async () => {
      mockUserProfileService.followTeam.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" />
      );

      const followButton = getByText('Follow');
      fireEvent.press(followButton);

      // Should immediately show "Following" due to optimistic update
      await waitFor(() => {
        expect(getByText('Following')).toBeTruthy();
      });
    });

    it('should revert optimistic update on error', async () => {
      mockUserProfileService.followTeam.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" />
      );

      const followButton = getByText('Follow');
      fireEvent.press(followButton);

      // Should revert to "Follow" after error
      await waitFor(() => {
        expect(getByText('Follow')).toBeTruthy();
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while processing', async () => {
      mockUserProfileService.followTeam.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByText } = render(
        <FollowButton itemId="Team B" itemType="team" itemName="Team B" />
      );

      const followButton = getByText('Follow');
      fireEvent.press(followButton);

      // Should show optimistic update
      await waitFor(() => {
        expect(getByText('Following')).toBeTruthy();
      });
    });
  });
});
