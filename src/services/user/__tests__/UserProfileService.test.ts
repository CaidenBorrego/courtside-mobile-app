import { Timestamp } from 'firebase/firestore';
import { UserProfileService } from '../UserProfileService';
import {
  UserProfile,
  UserRole,
} from '../../../types';

// Mock Firebase Firestore
jest.mock('firebase/firestore');

// Mock the FirebaseService
const mockFirebaseService = {
  createUserProfile: jest.fn(),
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  followTeam: jest.fn(),
  unfollowTeam: jest.fn(),
  followGame: jest.fn(),
  unfollowGame: jest.fn(),
  onUserProfileSnapshot: jest.fn(),
};

jest.mock('../../firebase/FirebaseService', () => ({
  firebaseService: mockFirebaseService,
}));

describe('UserProfileService', () => {
  let userProfileService: UserProfileService;
  let mockTimestamp: jest.MockedFunction<typeof Timestamp.now>;

  beforeEach(() => {
    jest.clearAllMocks();
    userProfileService = new UserProfileService();
    
    // Mock Timestamp.now
    mockTimestamp = jest.fn().mockReturnValue({
      seconds: 1640995200,
      nanoseconds: 0,
    } as any);
    (Timestamp as any).now = mockTimestamp;
  });

  describe('createUserProfile', () => {
    it('should create user profile with default values', async () => {
      mockFirebaseService.createUserProfile.mockResolvedValue(undefined);

      await userProfileService.createUserProfile(
        'user-123',
        'test@example.com',
        'Test User',
        'fcm-token-123'
      );

      expect(mockFirebaseService.createUserProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.USER,
          followingTeams: [],
          followingGames: [],
          notificationsEnabled: true,
          fcmToken: 'fcm-token-123',
          lastActive: expect.anything(),
          createdAt: expect.anything(),
        })
      );
    });

    it('should create user profile without FCM token', async () => {
      mockFirebaseService.createUserProfile.mockResolvedValue(undefined);

      await userProfileService.createUserProfile(
        'user-123',
        'test@example.com',
        'Test User'
      );

      expect(mockFirebaseService.createUserProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.USER,
          fcmToken: undefined,
        })
      );
    });

    it('should handle errors when creating user profile', async () => {
      mockFirebaseService.createUserProfile.mockRejectedValue(
        new Error('Firestore error')
      );

      await expect(
        userProfileService.createUserProfile(
          'user-123',
          'test@example.com',
          'Test User'
        )
      ).rejects.toThrow('Failed to create user profile');
    });
  });

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.USER,
        followingTeams: ['Lakers'],
        followingGames: ['game-1'],
        // NOTIFICATIONS TEMPORARILY DISABLED
        // notificationsEnabled: true,
        lastActive: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await userProfileService.getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(mockFirebaseService.getUserProfile).toHaveBeenCalledWith('user-123');
    });

    it('should handle errors when fetching user profile', async () => {
      mockFirebaseService.getUserProfile.mockRejectedValue(
        new Error('User not found')
      );

      await expect(
        userProfileService.getUserProfile('non-existent')
      ).rejects.toThrow('Failed to fetch user profile');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile with lastActive timestamp', async () => {
      mockFirebaseService.updateUserProfile.mockResolvedValue(undefined);

      const updates = {
        displayName: 'Updated Name',
        // NOTIFICATIONS TEMPORARILY DISABLED
        // notificationsEnabled: false,
      };

      await userProfileService.updateUserProfile('user-123', updates);

      expect(mockFirebaseService.updateUserProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          ...updates,
          lastActive: expect.anything(),
        })
      );
    });
  });

  // NOTIFICATIONS TEMPORARILY DISABLED
  describe.skip('updateFCMToken', () => {
    it('should update FCM token', async () => {
      // Test skipped - notifications disabled
    });
  });

  describe.skip('toggleNotifications', () => {
    it('should enable notifications', async () => {
      // Test skipped - notifications disabled
    });

    it('should disable notifications', async () => {
      // Test skipped - notifications disabled
    });
  });

  describe('Following Teams', () => {
    const mockProfile: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.USER,
      followingTeams: ['Lakers'],
      followingGames: ['game-1'],
      // NOTIFICATIONS TEMPORARILY DISABLED
      // notificationsEnabled: true,
      lastActive: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    describe('followTeam', () => {
      it('should follow a team successfully', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue({
          ...mockProfile,
          followingTeams: [],
        });
        mockFirebaseService.followTeam.mockResolvedValue(undefined);

        await userProfileService.followTeam('user-123', 'Warriors');

        expect(mockFirebaseService.followTeam).toHaveBeenCalledWith(
          'user-123',
          'Warriors'
        );
      });

      it('should throw error if already following team', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

        await expect(
          userProfileService.followTeam('user-123', 'Lakers')
        ).rejects.toThrow('Already following this team');
      });

      it('should handle Firebase errors', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue({
          ...mockProfile,
          followingTeams: [],
        });
        mockFirebaseService.followTeam.mockRejectedValue(
          new Error('Firestore error')
        );

        await expect(
          userProfileService.followTeam('user-123', 'Warriors')
        ).rejects.toThrow('Failed to follow team');
      });
    });

    describe('unfollowTeam', () => {
      it('should unfollow a team successfully', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);
        mockFirebaseService.unfollowTeam.mockResolvedValue(undefined);

        await userProfileService.unfollowTeam('user-123', 'Lakers');

        expect(mockFirebaseService.unfollowTeam).toHaveBeenCalledWith(
          'user-123',
          'Lakers'
        );
      });

      it('should throw error if not following team', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue({
          ...mockProfile,
          followingTeams: [],
        });

        await expect(
          userProfileService.unfollowTeam('user-123', 'Warriors')
        ).rejects.toThrow('Not following this team');
      });
    });

    describe('isFollowingTeam', () => {
      it('should return true if following team', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

        const result = await userProfileService.isFollowingTeam('user-123', 'Lakers');

        expect(result).toBe(true);
      });

      it('should return false if not following team', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

        const result = await userProfileService.isFollowingTeam('user-123', 'Warriors');

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        mockFirebaseService.getUserProfile.mockRejectedValue(
          new Error('User not found')
        );

        const result = await userProfileService.isFollowingTeam('user-123', 'Lakers');

        expect(result).toBe(false);
      });
    });

    describe('getFollowedTeams', () => {
      it('should return followed teams', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

        const result = await userProfileService.getFollowedTeams('user-123');

        expect(result).toEqual(['Lakers']);
      });

      it('should return empty array on error', async () => {
        mockFirebaseService.getUserProfile.mockRejectedValue(
          new Error('User not found')
        );

        const result = await userProfileService.getFollowedTeams('user-123');

        expect(result).toEqual([]);
      });
    });

    describe('bulkUnfollowTeams', () => {
      it('should unfollow multiple teams', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue({
          ...mockProfile,
          followingTeams: ['Lakers', 'Warriors', 'Celtics'],
        });
        mockFirebaseService.updateUserProfile.mockResolvedValue(undefined);

        await userProfileService.bulkUnfollowTeams('user-123', ['Lakers', 'Warriors']);

        expect(mockFirebaseService.updateUserProfile).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            followingTeams: ['Celtics'],
            lastActive: expect.anything(),
          })
        );
      });
    });
  });

  describe('Following Games', () => {
    const mockProfile: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.USER,
      followingTeams: ['Lakers'],
      followingGames: ['game-1'],
      // NOTIFICATIONS TEMPORARILY DISABLED
      // notificationsEnabled: true,
      lastActive: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    describe('followGame', () => {
      it('should follow a game successfully', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue({
          ...mockProfile,
          followingGames: [],
        });
        mockFirebaseService.followGame.mockResolvedValue(undefined);

        await userProfileService.followGame('user-123', 'game-2');

        expect(mockFirebaseService.followGame).toHaveBeenCalledWith(
          'user-123',
          'game-2'
        );
      });

      it('should throw error if already following game', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

        await expect(
          userProfileService.followGame('user-123', 'game-1')
        ).rejects.toThrow('Already following this game');
      });
    });

    describe('unfollowGame', () => {
      it('should unfollow a game successfully', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);
        mockFirebaseService.unfollowGame.mockResolvedValue(undefined);

        await userProfileService.unfollowGame('user-123', 'game-1');

        expect(mockFirebaseService.unfollowGame).toHaveBeenCalledWith(
          'user-123',
          'game-1'
        );
      });

      it('should throw error if not following game', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue({
          ...mockProfile,
          followingGames: [],
        });

        await expect(
          userProfileService.unfollowGame('user-123', 'game-2')
        ).rejects.toThrow('Not following this game');
      });
    });

    describe('isFollowingGame', () => {
      it('should return true if following game', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

        const result = await userProfileService.isFollowingGame('user-123', 'game-1');

        expect(result).toBe(true);
      });

      it('should return false if not following game', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

        const result = await userProfileService.isFollowingGame('user-123', 'game-2');

        expect(result).toBe(false);
      });
    });

    describe('bulkUnfollowGames', () => {
      it('should unfollow multiple games', async () => {
        mockFirebaseService.getUserProfile.mockResolvedValue({
          ...mockProfile,
          followingGames: ['game-1', 'game-2', 'game-3'],
        });
        mockFirebaseService.updateUserProfile.mockResolvedValue(undefined);

        await userProfileService.bulkUnfollowGames('user-123', ['game-1', 'game-2']);

        expect(mockFirebaseService.updateUserProfile).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            followingGames: ['game-3'],
            lastActive: expect.anything(),
          })
        );
      });
    });
  });

  describe('clearAllFollowing', () => {
    it('should clear all following lists', async () => {
      mockFirebaseService.updateUserProfile.mockResolvedValue(undefined);

      await userProfileService.clearAllFollowing('user-123');

      expect(mockFirebaseService.updateUserProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          followingTeams: [],
          followingGames: [],
          lastActive: expect.anything(),
        })
      );
    });
  });

  describe('getFollowingStats', () => {
    it('should return following statistics', async () => {
      const mockProfile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.USER,
        followingTeams: ['Lakers', 'Warriors'],
        followingGames: ['game-1', 'game-2', 'game-3'],
        // NOTIFICATIONS TEMPORARILY DISABLED
        // notificationsEnabled: true,
        lastActive: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockFirebaseService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await userProfileService.getFollowingStats('user-123');

      expect(result).toEqual({
        teamsCount: 2,
        gamesCount: 3,
        totalCount: 5,
      });
    });

    it('should return zero stats on error', async () => {
      mockFirebaseService.getUserProfile.mockRejectedValue(
        new Error('User not found')
      );

      const result = await userProfileService.getFollowingStats('user-123');

      expect(result).toEqual({
        teamsCount: 0,
        gamesCount: 0,
        totalCount: 0,
      });
    });
  });

  describe('onUserProfileSnapshot', () => {
    it('should set up user profile listener', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockFirebaseService.onUserProfileSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = userProfileService.onUserProfileSnapshot('user-123', mockCallback);

      expect(mockFirebaseService.onUserProfileSnapshot).toHaveBeenCalledWith(
        'user-123',
        mockCallback
      );
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});