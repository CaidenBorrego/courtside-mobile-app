import { Timestamp } from 'firebase/firestore';
import { firebaseService } from '../firebase/FirebaseService';
import {
  UserProfile,
  CreateUserProfileData,
  UpdateUserProfileData,
  UserRole,
} from '../../types';

export class UserProfileService {
  /**
   * Creates a new user profile in Firestore
   * Called during user registration process
   */
  async createUserProfile(
    uid: string,
    email: string,
    displayName: string,
    fcmToken?: string
  ): Promise<void> {
    try {
      const profileData: CreateUserProfileData = {
        email,
        displayName,
        role: UserRole.USER,
        followingTeams: [],
        followingGames: [],
        notificationsEnabled: true,
        fcmToken,
        lastActive: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      await firebaseService.createUserProfile(uid, profileData);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Gets user profile by UID
   */
  async getUserProfile(uid: string): Promise<UserProfile> {
    try {
      return await firebaseService.getUserProfile(uid);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Updates user profile with new data
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const updateData: UpdateUserProfileData = {
        ...updates,
        lastActive: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await firebaseService.updateUserProfile(uid, updateData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Updates user's FCM token for push notifications
   */
  async updateFCMToken(uid: string, fcmToken: string): Promise<void> {
    try {
      await this.updateUserProfile(uid, { fcmToken });
    } catch (error) {
      console.error('Error updating FCM token:', error);
      throw new Error('Failed to update FCM token');
    }
  }

  /**
   * Updates user's last active timestamp
   */
  async updateLastActive(uid: string): Promise<void> {
    try {
      await this.updateUserProfile(uid, { lastActive: Timestamp.now() });
    } catch (error) {
      console.error('Error updating last active:', error);
      throw new Error('Failed to update last active');
    }
  }

  /**
   * Toggles notification preferences for user
   */
  async toggleNotifications(uid: string, enabled: boolean): Promise<void> {
    try {
      await this.updateUserProfile(uid, { notificationsEnabled: enabled });
    } catch (error) {
      console.error('Error toggling notifications:', error);
      throw new Error('Failed to toggle notifications');
    }
  }

  // Following/Unfollowing functionality

  /**
   * Follows a team - adds team name to user's followingTeams array
   * Also automatically follows all games involving this team
   */
  async followTeam(uid: string, teamName: string): Promise<void> {
    try {
      // First check if user is already following this team
      const profile = await this.getUserProfile(uid);
      if (profile.followingTeams.includes(teamName)) {
        throw new Error('Already following this team');
      }

      // Follow the team
      await firebaseService.followTeam(uid, teamName);

      // Get all games involving this team across all tournaments
      const tournaments = await firebaseService.getActiveTournaments();
      const allGamesPromises = tournaments.map(tournament =>
        firebaseService.getGamesByTournament(tournament.id)
      );
      const allGamesArrays = await Promise.all(allGamesPromises);
      const allGames = allGamesArrays.flat();

      // Filter games where this team is playing
      const teamGames = allGames.filter(
        game => game.teamA === teamName || game.teamB === teamName
      );

      // Follow all games for this team (that aren't already followed)
      const gameIdsToFollow = teamGames
        .map(game => game.id)
        .filter(gameId => !profile.followingGames.includes(gameId));

      if (gameIdsToFollow.length > 0) {
        // Add all game IDs at once
        for (const gameId of gameIdsToFollow) {
          await firebaseService.followGame(uid, gameId);
        }
      }
    } catch (error) {
      console.error('Error following team:', error);
      if (error instanceof Error && error.message === 'Already following this team') {
        throw error;
      }
      throw new Error('Failed to follow team');
    }
  }

  /**
   * Unfollows a team - removes team name from user's followingTeams array
   * Also automatically unfollows all games involving only this team
   * (keeps games if user follows the other team in the game)
   */
  async unfollowTeam(uid: string, teamName: string): Promise<void> {
    try {
      // First check if user is actually following this team
      const profile = await this.getUserProfile(uid);
      if (!profile.followingTeams.includes(teamName)) {
        throw new Error('Not following this team');
      }

      // Unfollow the team
      await firebaseService.unfollowTeam(uid, teamName);

      // Get all games involving this team
      const tournaments = await firebaseService.getActiveTournaments();
      const allGamesPromises = tournaments.map(tournament =>
        firebaseService.getGamesByTournament(tournament.id)
      );
      const allGamesArrays = await Promise.all(allGamesPromises);
      const allGames = allGamesArrays.flat();

      // Filter games where this team is playing
      const teamGames = allGames.filter(
        game => game.teamA === teamName || game.teamB === teamName
      );

      // Get updated profile to check remaining followed teams
      const updatedProfile = await this.getUserProfile(uid);
      const remainingFollowedTeams = updatedProfile.followingTeams;

      // Unfollow games where this was the only followed team
      const gameIdsToUnfollow = teamGames
        .filter(game => {
          // Check if user follows the other team in this game
          const otherTeam = game.teamA === teamName ? game.teamB : game.teamA;
          return !remainingFollowedTeams.includes(otherTeam);
        })
        .map(game => game.id)
        .filter(gameId => updatedProfile.followingGames.includes(gameId));

      if (gameIdsToUnfollow.length > 0) {
        for (const gameId of gameIdsToUnfollow) {
          await firebaseService.unfollowGame(uid, gameId);
        }
      }
    } catch (error) {
      console.error('Error unfollowing team:', error);
      if (error instanceof Error && error.message === 'Not following this team') {
        throw error;
      }
      throw new Error('Failed to unfollow team');
    }
  }

  /**
   * Follows a game - adds game ID to user's followingGames array
   * Note: Does NOT automatically follow teams (teams follow games, not vice versa)
   */
  async followGame(uid: string, gameId: string): Promise<void> {
    try {
      // First check if user is already following this game
      const profile = await this.getUserProfile(uid);
      if (profile.followingGames.includes(gameId)) {
        throw new Error('Already following this game');
      }

      await firebaseService.followGame(uid, gameId);
    } catch (error) {
      console.error('Error following game:', error);
      if (error instanceof Error && error.message === 'Already following this game') {
        throw error;
      }
      throw new Error('Failed to follow game');
    }
  }

  /**
   * Unfollows a game - removes game ID from user's followingGames array
   * Note: Does NOT automatically unfollow teams
   */
  async unfollowGame(uid: string, gameId: string): Promise<void> {
    try {
      // First check if user is actually following this game
      const profile = await this.getUserProfile(uid);
      if (!profile.followingGames.includes(gameId)) {
        throw new Error('Not following this game');
      }

      await firebaseService.unfollowGame(uid, gameId);
    } catch (error) {
      console.error('Error unfollowing game:', error);
      if (error instanceof Error && error.message === 'Not following this game') {
        throw error;
      }
      throw new Error('Failed to unfollow game');
    }
  }

  /**
   * Checks if user is following a specific team
   */
  async isFollowingTeam(uid: string, teamName: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile.followingTeams.includes(teamName);
    } catch (error) {
      console.error('Error checking if following team:', error);
      return false;
    }
  }

  /**
   * Checks if user is following a specific game
   */
  async isFollowingGame(uid: string, gameId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile.followingGames.includes(gameId);
    } catch (error) {
      console.error('Error checking if following game:', error);
      return false;
    }
  }

  /**
   * Gets all teams that the user is following
   */
  async getFollowedTeams(uid: string): Promise<string[]> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile.followingTeams;
    } catch (error) {
      console.error('Error getting followed teams:', error);
      return [];
    }
  }

  /**
   * Gets all games that the user is following
   */
  async getFollowedGames(uid: string): Promise<string[]> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile.followingGames;
    } catch (error) {
      console.error('Error getting followed games:', error);
      return [];
    }
  }

  /**
   * Bulk unfollow teams - removes multiple teams from following list
   */
  async bulkUnfollowTeams(uid: string, teamNames: string[]): Promise<void> {
    try {
      const profile = await this.getUserProfile(uid);
      const updatedFollowingTeams = profile.followingTeams.filter(
        team => !teamNames.includes(team)
      );

      await this.updateUserProfile(uid, {
        followingTeams: updatedFollowingTeams
      });
    } catch (error) {
      console.error('Error bulk unfollowing teams:', error);
      throw new Error('Failed to unfollow teams');
    }
  }

  /**
   * Bulk unfollow games - removes multiple games from following list
   */
  async bulkUnfollowGames(uid: string, gameIds: string[]): Promise<void> {
    try {
      const profile = await this.getUserProfile(uid);
      const updatedFollowingGames = profile.followingGames.filter(
        game => !gameIds.includes(game)
      );

      await this.updateUserProfile(uid, {
        followingGames: updatedFollowingGames
      });
    } catch (error) {
      console.error('Error bulk unfollowing games:', error);
      throw new Error('Failed to unfollow games');
    }
  }

  /**
   * Clears all followed teams and games
   */
  async clearAllFollowing(uid: string): Promise<void> {
    try {
      await this.updateUserProfile(uid, {
        followingTeams: [],
        followingGames: []
      });
    } catch (error) {
      console.error('Error clearing all following:', error);
      throw new Error('Failed to clear following lists');
    }
  }

  /**
   * Gets following statistics for user
   */
  async getFollowingStats(uid: string): Promise<{
    teamsCount: number;
    gamesCount: number;
    totalCount: number;
  }> {
    try {
      const profile = await this.getUserProfile(uid);
      const teamsCount = profile.followingTeams.length;
      const gamesCount = profile.followingGames.length;

      return {
        teamsCount,
        gamesCount,
        totalCount: teamsCount + gamesCount
      };
    } catch (error) {
      console.error('Error getting following stats:', error);
      return {
        teamsCount: 0,
        gamesCount: 0,
        totalCount: 0
      };
    }
  }

  /**
   * Syncs followed teams with their games
   * Automatically follows any new games for followed teams
   * Should be called periodically or when user opens the app
   */
  async syncTeamGames(uid: string): Promise<{ added: number; skipped: number }> {
    try {
      const profile = await this.getUserProfile(uid);
      
      if (profile.followingTeams.length === 0) {
        return { added: 0, skipped: 0 };
      }

      // Get all games across all tournaments
      const tournaments = await firebaseService.getActiveTournaments();
      const allGamesPromises = tournaments.map(tournament =>
        firebaseService.getGamesByTournament(tournament.id)
      );
      const allGamesArrays = await Promise.all(allGamesPromises);
      const allGames = allGamesArrays.flat();

      // Find games involving followed teams that aren't already followed
      const gamesToFollow = allGames.filter(game => {
        const involvesFollowedTeam = 
          profile.followingTeams.includes(game.teamA) || 
          profile.followingTeams.includes(game.teamB);
        const notAlreadyFollowed = !profile.followingGames.includes(game.id);
        return involvesFollowedTeam && notAlreadyFollowed;
      });

      // Follow all new games
      let added = 0;
      for (const game of gamesToFollow) {
        try {
          await firebaseService.followGame(uid, game.id);
          added++;
        } catch (error) {
          console.error(`Error following game ${game.id}:`, error);
        }
      }

      return { 
        added, 
        skipped: allGames.length - gamesToFollow.length 
      };
    } catch (error) {
      console.error('Error syncing team games:', error);
      throw new Error('Failed to sync team games');
    }
  }

  /**
   * Sets up real-time listener for user profile changes
   */
  onUserProfileSnapshot(uid: string, callback: (profile: UserProfile | null) => void) {
    return firebaseService.onUserProfileSnapshot(uid, callback);
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();