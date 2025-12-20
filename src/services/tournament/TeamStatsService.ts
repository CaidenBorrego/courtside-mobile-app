import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Game,
  TeamStats,
  PoolStanding,
  GameStatus,
  Pool,
} from '../../types';
import { cacheData, getCachedData, clearCache, CacheKeys } from '../../utils/cache';

/**
 * Service for calculating team statistics and standings
 * Provides methods for:
 * - Individual team statistics calculation
 * - Division-wide standings
 * - Pool-specific standings
 * - Team game history
 * 
 * Implements caching for performance optimization (Requirement 6.1)
 */
export class TeamStatsService {
  private readonly gamesCollection = collection(db, 'games');
  private readonly poolsCollection = collection(db, 'pools');
  private readonly CACHE_EXPIRY_MINUTES = 5; // Cache for 5 minutes

  /**
   * Calculate comprehensive statistics for a specific team in a division
   * Requirements: 10.2, 10.3, 11.2, 11.3
   * 
   * Uses caching to improve performance (Requirement 6.1)
   * 
   * @param teamName - The name of the team
   * @param divisionId - The division ID
   * @param useCache - Whether to use cached data (default: true)
   * @returns Team statistics including wins, losses, points, and differential
   */
  async calculateTeamStats(
    teamName: string,
    divisionId: string,
    useCache: boolean = true
  ): Promise<TeamStats> {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = CacheKeys.TEAM_STATS(teamName, divisionId);
        const cached = await getCachedData<TeamStats>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Fetch all games for this team in the division
      const games = await this.getTeamGames(teamName, divisionId);

      // Initialize stats
      const stats: TeamStats = {
        teamName,
        divisionId,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0,
        gamesPlayed: 0,
      };

      // Process completed games
      games.forEach(game => {
        if (game.status === GameStatus.COMPLETED) {
          stats.gamesPlayed++;

          // Determine if team is teamA or teamB
          const isTeamA = game.teamA === teamName;
          const teamScore = isTeamA ? game.scoreA : game.scoreB;
          const opponentScore = isTeamA ? game.scoreB : game.scoreA;

          // Update points
          stats.pointsFor += teamScore;
          stats.pointsAgainst += opponentScore;

          // Update wins/losses
          if (teamScore > opponentScore) {
            stats.wins++;
          } else if (teamScore < opponentScore) {
            stats.losses++;
          }
          // Note: Ties are not counted as wins or losses
        }
      });

      // Calculate point differential
      stats.pointDifferential = stats.pointsFor - stats.pointsAgainst;

      // Cache the result
      const cacheKey = CacheKeys.TEAM_STATS(teamName, divisionId);
      await cacheData(cacheKey, stats, { expiryMinutes: this.CACHE_EXPIRY_MINUTES });

      return stats;
    } catch (error) {
      console.error('Error calculating team stats:', error);
      throw error instanceof Error ? error : new Error('Failed to calculate team stats');
    }
  }

  /**
   * Get standings for all teams in a division
   * Requirements: 10.2, 10.3, 11.2, 11.3
   * 
   * Teams are ranked by:
   * 1. Wins (descending)
   * 2. Point differential (descending)
   * 
   * Uses caching to improve performance (Requirement 6.1)
   * 
   * @param divisionId - The division ID
   * @param useCache - Whether to use cached data (default: true)
   * @returns Array of team statistics sorted by rank
   */
  async getDivisionStandings(divisionId: string, useCache: boolean = true): Promise<TeamStats[]> {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = CacheKeys.DIVISION_STANDINGS(divisionId);
        const cached = await getCachedData<TeamStats[]>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Fetch all games in the division
      const q = query(
        this.gamesCollection,
        where('divisionId', '==', divisionId)
      );
      const querySnapshot = await getDocs(q);
      const games = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Game));

      // Extract unique team names
      const teamNames = new Set<string>();
      games.forEach(game => {
        if (game.teamA) teamNames.add(game.teamA);
        if (game.teamB) teamNames.add(game.teamB);
      });

      // Calculate stats for each team
      const standingsMap = new Map<string, TeamStats>();
      
      teamNames.forEach(teamName => {
        standingsMap.set(teamName, {
          teamName,
          divisionId,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointDifferential: 0,
          gamesPlayed: 0,
        });
      });

      // Process completed games
      games.forEach(game => {
        if (game.status === GameStatus.COMPLETED) {
          const teamAStats = standingsMap.get(game.teamA);
          const teamBStats = standingsMap.get(game.teamB);

          if (teamAStats && teamBStats) {
            // Update games played
            teamAStats.gamesPlayed++;
            teamBStats.gamesPlayed++;

            // Update points
            teamAStats.pointsFor += game.scoreA;
            teamAStats.pointsAgainst += game.scoreB;
            teamBStats.pointsFor += game.scoreB;
            teamBStats.pointsAgainst += game.scoreA;

            // Determine winner and update W-L record
            if (game.scoreA > game.scoreB) {
              teamAStats.wins++;
              teamBStats.losses++;
            } else if (game.scoreB > game.scoreA) {
              teamBStats.wins++;
              teamAStats.losses++;
            }
            // Note: Ties are not counted as wins or losses

            // Update point differential
            teamAStats.pointDifferential = teamAStats.pointsFor - teamAStats.pointsAgainst;
            teamBStats.pointDifferential = teamBStats.pointsFor - teamBStats.pointsAgainst;
          }
        }
      });

      // Convert to array and sort
      const standings = Array.from(standingsMap.values());
      
      standings.sort((a, b) => {
        // First by wins (descending)
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // Then by point differential (descending)
        return b.pointDifferential - a.pointDifferential;
      });

      // Assign ranks
      standings.forEach((standing, index) => {
        standing.rank = index + 1;
      });

      // Cache the result
      const cacheKey = CacheKeys.DIVISION_STANDINGS(divisionId);
      await cacheData(cacheKey, standings, { expiryMinutes: this.CACHE_EXPIRY_MINUTES });

      return standings;
    } catch (error) {
      console.error('Error getting division standings:', error);
      throw error instanceof Error ? error : new Error('Failed to get division standings');
    }
  }

  /**
   * Get all games for a specific team in a division
   * Requirements: 10.2, 10.3, 11.2, 11.3
   * 
   * @param teamName - The name of the team
   * @param divisionId - The division ID
   * @returns Array of games sorted by start time (most recent first)
   */
  async getTeamGames(
    teamName: string,
    divisionId: string
  ): Promise<Game[]> {
    try {
      // Query for games where team is teamA
      const qTeamA = query(
        this.gamesCollection,
        where('divisionId', '==', divisionId),
        where('teamA', '==', teamName)
      );
      const snapshotA = await getDocs(qTeamA);
      const gamesA = snapshotA.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Game));

      // Query for games where team is teamB
      const qTeamB = query(
        this.gamesCollection,
        where('divisionId', '==', divisionId),
        where('teamB', '==', teamName)
      );
      const snapshotB = await getDocs(qTeamB);
      const gamesB = snapshotB.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Game));

      // Combine and sort by start time (most recent first)
      const allGames = [...gamesA, ...gamesB];
      allGames.sort((a, b) => {
        const timeA = a.startTime?.toMillis() || 0;
        const timeB = b.startTime?.toMillis() || 0;
        return timeB - timeA; // Descending order (most recent first)
      });

      return allGames;
    } catch (error) {
      console.error('Error getting team games:', error);
      throw error instanceof Error ? error : new Error('Failed to get team games');
    }
  }

  /**
   * Calculate standings for a specific pool
   * Requirements: 6.2, 6.3
   * 
   * Teams are ranked by:
   * 1. Wins (descending)
   * 2. Point differential (descending)
   * 
   * Uses caching to improve performance (Requirement 6.1)
   * 
   * @param poolId - The pool ID
   * @param useCache - Whether to use cached data (default: true)
   * @returns Array of pool standings sorted by rank
   */
  async getPoolStandings(poolId: string, useCache: boolean = true): Promise<PoolStanding[]> {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = CacheKeys.POOL_STANDINGS(poolId);
        const cached = await getCachedData<PoolStanding[]>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Fetch pool data
      const poolDoc = await getDocs(
        query(this.poolsCollection, where('__name__', '==', poolId))
      );
      
      if (poolDoc.empty) {
        throw new Error('Pool not found');
      }

      const pool = {
        id: poolDoc.docs[0].id,
        ...poolDoc.docs[0].data(),
      } as Pool;

      // Fetch all games for this pool
      const q = query(
        this.gamesCollection,
        where('poolId', '==', poolId)
      );
      const querySnapshot = await getDocs(q);
      const games = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Game));

      // Initialize standings for each team
      const standingsMap = new Map<string, PoolStanding>();
      
      pool.teams.forEach(teamName => {
        standingsMap.set(teamName, {
          teamName,
          divisionId: pool.divisionId,
          poolId: pool.id,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointDifferential: 0,
          gamesPlayed: 0,
          poolRank: 0, // Will be set after sorting
        });
      });

      // Process completed games
      games.forEach(game => {
        if (game.status === GameStatus.COMPLETED) {
          const teamAStats = standingsMap.get(game.teamA);
          const teamBStats = standingsMap.get(game.teamB);

          if (teamAStats && teamBStats) {
            // Update games played
            teamAStats.gamesPlayed++;
            teamBStats.gamesPlayed++;

            // Update points
            teamAStats.pointsFor += game.scoreA;
            teamAStats.pointsAgainst += game.scoreB;
            teamBStats.pointsFor += game.scoreB;
            teamBStats.pointsAgainst += game.scoreA;

            // Determine winner and update W-L record
            if (game.scoreA > game.scoreB) {
              teamAStats.wins++;
              teamBStats.losses++;
            } else if (game.scoreB > game.scoreA) {
              teamBStats.wins++;
              teamAStats.losses++;
            }
            // Note: Ties are not counted as wins or losses

            // Update point differential
            teamAStats.pointDifferential = teamAStats.pointsFor - teamAStats.pointsAgainst;
            teamBStats.pointDifferential = teamBStats.pointsFor - teamBStats.pointsAgainst;
          }
        }
      });

      // Convert to array and sort
      const standings = Array.from(standingsMap.values());
      
      standings.sort((a, b) => {
        // First by wins (descending)
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // Then by point differential (descending)
        return b.pointDifferential - a.pointDifferential;
      });

      // Assign ranks
      standings.forEach((standing, index) => {
        standing.poolRank = index + 1;
        standing.rank = index + 1;
      });

      // Cache the result
      const cacheKey = CacheKeys.POOL_STANDINGS(poolId);
      await cacheData(cacheKey, standings, { expiryMinutes: this.CACHE_EXPIRY_MINUTES });

      return standings;
    } catch (error) {
      console.error('Error getting pool standings:', error);
      throw error instanceof Error ? error : new Error('Failed to get pool standings');
    }
  }

  /**
   * Invalidate cached standings for a division
   * Should be called when a game is completed
   * Requirements: 6.1
   * 
   * @param divisionId - The division ID
   */
  async invalidateDivisionCache(divisionId: string): Promise<void> {
    try {
      const cacheKey = CacheKeys.DIVISION_STANDINGS(divisionId);
      await clearCache(cacheKey);
    } catch (error) {
      console.error('Error invalidating division cache:', error);
    }
  }

  /**
   * Invalidate cached standings for a pool
   * Should be called when a pool game is completed
   * Requirements: 6.1
   * 
   * @param poolId - The pool ID
   */
  async invalidatePoolCache(poolId: string): Promise<void> {
    try {
      const cacheKey = CacheKeys.POOL_STANDINGS(poolId);
      await clearCache(cacheKey);
    } catch (error) {
      console.error('Error invalidating pool cache:', error);
    }
  }

  /**
   * Invalidate cached stats for a team
   * Should be called when a team's game is completed
   * Requirements: 6.1
   * 
   * @param teamName - The team name
   * @param divisionId - The division ID
   */
  async invalidateTeamCache(teamName: string, divisionId: string): Promise<void> {
    try {
      const cacheKey = CacheKeys.TEAM_STATS(teamName, divisionId);
      await clearCache(cacheKey);
    } catch (error) {
      console.error('Error invalidating team cache:', error);
    }
  }
}

// Export singleton instance
export const teamStatsService = new TeamStatsService();
