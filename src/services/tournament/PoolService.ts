import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Pool,
  Game,
  PoolStanding,
  CreatePoolData,
  UpdatePoolData,
  GameStatus,
} from '../../types';
import { PoolValidator } from '../../utils/tournamentValidation';
import { TiedStandingsResolver } from '../../utils/edgeCaseHandlers';
import { cacheData, getCachedData, clearCache, CacheKeys } from '../../utils/cache';

/**
 * Service for managing pool play functionality including:
 * - Pool creation and management
 * - Round-robin game generation
 * - Pool standings calculation
 * - Team advancement logic
 * 
 * Implements caching for performance optimization (Requirement 6.1)
 */
export class PoolService {
  private readonly poolsCollection = collection(db, 'pools');
  private readonly gamesCollection = collection(db, 'games');
  private readonly CACHE_EXPIRY_MINUTES = 5; // Cache for 5 minutes

  /**
   * Create a new pool and optionally generate round-robin games
   * Requirements: 1.4, 1.5, 9.1
   * 
   * @param divisionId - The division this pool belongs to
   * @param tournamentId - The tournament this pool belongs to
   * @param name - Name of the pool (e.g., "Pool A")
   * @param teams - Array of team names in this pool
   * @param advancementCount - Optional number of teams that advance to brackets
   * @returns The created pool with its ID
   */
  async createPool(
    divisionId: string,
    tournamentId: string,
    name: string,
    teams: string[],
    advancementCount?: number
  ): Promise<Pool> {
    try {
      // Get existing pools for validation
      const existingPools = await this.getPoolsByDivision(divisionId);

      // Validate pool configuration
      const validation = PoolValidator.validatePoolConfig(
        name,
        teams,
        advancementCount,
        existingPools
      );

      if (!validation.isValid) {
        const errorMessages = validation.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message)
          .join('; ');
        throw new Error(errorMessages);
      }

      // Create pool data
      const poolData: CreatePoolData = {
        divisionId,
        tournamentId,
        name,
        teams,
        advancementCount,
        createdAt: Timestamp.now(),
      };

      // Create pool document
      const docRef = await addDoc(this.poolsCollection, poolData);

      const pool: Pool = {
        id: docRef.id,
        ...poolData,
        updatedAt: Timestamp.now(),
      };

      return pool;
    } catch (error) {
      console.error('Error creating pool:', error);
      throw error instanceof Error ? error : new Error('Failed to create pool');
    }
  }

  /**
   * Generate round-robin games for a pool
   * Each team plays every other team exactly once
   * Requirements: 1.4, 1.5, 9.1
   * 
   * Formula: For N teams, generates N*(N-1)/2 games
   * 
   * @param poolId - The pool to generate games for
   * @returns Array of created game IDs
   */
  async generatePoolGames(poolId: string): Promise<string[]> {
    try {
      // Fetch pool data
      const poolDoc = await getDoc(doc(this.poolsCollection, poolId));
      if (!poolDoc.exists()) {
        throw new Error('Pool not found');
      }

      const pool = { id: poolDoc.id, ...poolDoc.data() } as Pool;

      // Validate pool has teams
      if (!pool.teams || pool.teams.length < 2) {
        throw new Error('Pool must have at least 2 teams to generate games');
      }

      // Generate round-robin matchups
      const games: Array<{
        teamA: string;
        teamB: string;
        gameNumber: number;
      }> = [];

      let gameNumber = 1;
      for (let i = 0; i < pool.teams.length; i++) {
        for (let j = i + 1; j < pool.teams.length; j++) {
          games.push({
            teamA: pool.teams[i],
            teamB: pool.teams[j],
            gameNumber: gameNumber++,
          });
        }
      }

      // Create game documents in batch
      const batch = writeBatch(db);
      const gameIds: string[] = [];

      games.forEach(({ teamA, teamB, gameNumber }) => {
        const gameRef = doc(this.gamesCollection);
        gameIds.push(gameRef.id);

        batch.set(gameRef, {
          tournamentId: pool.tournamentId,
          divisionId: pool.divisionId,
          teamA,
          teamB,
          scoreA: 0,
          scoreB: 0,
          startTime: Timestamp.now(), // Default to now, admin will schedule later
          locationId: '', // To be assigned by admin
          court: '',
          status: GameStatus.SCHEDULED,
          poolId: pool.id,
          poolGameNumber: gameNumber,
          gameLabel: `${pool.name} Game ${gameNumber}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();

      return gameIds;
    } catch (error) {
      console.error('Error generating pool games:', error);
      throw error instanceof Error ? error : new Error('Failed to generate pool games');
    }
  }

  /**
   * Get a pool by ID
   * 
   * @param poolId - The pool ID
   * @returns The pool data
   */
  async getPool(poolId: string): Promise<Pool> {
    try {
      const poolDoc = await getDoc(doc(this.poolsCollection, poolId));
      if (!poolDoc.exists()) {
        throw new Error('Pool not found');
      }

      return { id: poolDoc.id, ...poolDoc.data() } as Pool;
    } catch (error) {
      console.error('Error fetching pool:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch pool');
    }
  }

  /**
   * Get all pools for a division
   * 
   * @param divisionId - The division ID
   * @returns Array of pools
   */
  async getPoolsByDivision(divisionId: string): Promise<Pool[]> {
    try {
      const q = query(
        this.poolsCollection,
        where('divisionId', '==', divisionId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Pool));
    } catch (error) {
      console.error('Error fetching pools by division:', error);
      throw new Error('Failed to fetch pools');
    }
  }

  /**
   * Get all games for a specific pool
   * 
   * @param poolId - The pool ID
   * @returns Array of games in the pool
   */
  async getGamesByPool(poolId: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('poolId', '==', poolId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Game));
    } catch (error) {
      console.error('Error fetching games by pool:', error);
      throw new Error('Failed to fetch pool games');
    }
  }

  /**
   * Get paginated games for a specific pool
   * Requirements: 5.1
   * 
   * @param poolId - The pool ID
   * @param limit - Maximum number of games to return
   * @param offset - Number of games to skip
   * @returns Paginated array of games
   */
  async getGamesByPoolPaginated(
    poolId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ games: Game[]; hasMore: boolean; total: number }> {
    try {
      // Get total count first
      const allGamesQuery = query(
        this.gamesCollection,
        where('poolId', '==', poolId)
      );
      const allGamesSnapshot = await getDocs(allGamesQuery);
      const total = allGamesSnapshot.size;

      // Get paginated games
      const games = allGamesSnapshot.docs
        .slice(offset, offset + limit)
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Game));

      const hasMore = offset + limit < total;

      return {
        games,
        hasMore,
        total,
      };
    } catch (error) {
      console.error('Error fetching paginated pool games:', error);
      throw new Error('Failed to fetch paginated pool games');
    }
  }

  /**
   * Calculate current standings for a pool
   * Requirements: 6.1, 6.2, 3.3
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
  async calculateStandings(poolId: string, useCache: boolean = true): Promise<PoolStanding[]> {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = CacheKeys.POOL_STANDINGS(poolId);
        const cached = await getCachedData<PoolStanding[]>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Fetch pool and its games
      const pool = await this.getPool(poolId);
      const games = await this.getGamesByPool(poolId);

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
      
      // Initial sort by wins and point differential
      standings.sort((a, b) => {
        // First by wins (descending)
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // Then by point differential (descending)
        return b.pointDifferential - a.pointDifferential;
      });

      // Resolve ties using comprehensive tiebreaker rules
      const resolvedStandings = TiedStandingsResolver.resolveTies(standings, games);

      // Cache the result
      const cacheKey = CacheKeys.POOL_STANDINGS(poolId);
      await cacheData(cacheKey, resolvedStandings, { expiryMinutes: this.CACHE_EXPIRY_MINUTES });

      return resolvedStandings;
    } catch (error) {
      console.error('Error calculating pool standings:', error);
      throw error instanceof Error ? error : new Error('Failed to calculate standings');
    }
  }

  /**
   * Get teams that should advance from a pool based on standings
   * Requirements: 3.2, 4.4, 9.5
   * 
   * @param poolId - The pool ID
   * @param count - Number of teams to advance (defaults to pool's advancementCount)
   * @returns Array of team names in advancement order
   */
  async getAdvancingTeams(poolId: string, count?: number): Promise<string[]> {
    try {
      const pool = await this.getPool(poolId);
      const standings = await this.calculateStandings(poolId);

      // Determine how many teams should advance
      const advanceCount = count ?? pool.advancementCount ?? 0;

      if (advanceCount <= 0) {
        return [];
      }

      if (advanceCount > standings.length) {
        throw new Error(`Cannot advance ${advanceCount} teams from pool with only ${standings.length} teams`);
      }

      // Return top N teams based on standings
      return standings.slice(0, advanceCount).map(standing => standing.teamName);
    } catch (error) {
      console.error('Error getting advancing teams:', error);
      throw error instanceof Error ? error : new Error('Failed to get advancing teams');
    }
  }

  /**
   * Update pool teams and regenerate games
   * Requirements: 3.2, 4.4, 9.5
   * 
   * This will delete all existing pool games and create new ones
   * 
   * @param poolId - The pool ID
   * @param teams - New array of team names
   * @returns Array of new game IDs
   */
  async updatePoolTeams(poolId: string, teams: string[]): Promise<string[]> {
    try {
      // Get existing games
      const existingGames = await this.getGamesByPool(poolId);

      // Validate pool update
      const validation = PoolValidator.validatePoolUpdate(
        poolId,
        { teams },
        existingGames
      );

      if (!validation.isValid) {
        const errorMessages = validation.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message)
          .join('; ');
        throw new Error(errorMessages);
      }

      // Delete existing pool games
      const batch = writeBatch(db);
      existingGames.forEach(game => {
        const gameRef = doc(this.gamesCollection, game.id);
        batch.delete(gameRef);
      });

      // Update pool with new teams
      const poolRef = doc(this.poolsCollection, poolId);
      batch.update(poolRef, {
        teams,
        updatedAt: Timestamp.now(),
      });

      await batch.commit();

      // Generate new games
      const newGameIds = await this.generatePoolGames(poolId);

      return newGameIds;
    } catch (error) {
      console.error('Error updating pool teams:', error);
      throw error instanceof Error ? error : new Error('Failed to update pool teams');
    }
  }

  /**
   * Delete a pool and all associated games
   * Requirements: 3.2, 4.4, 9.5
   * 
   * @param poolId - The pool ID to delete
   */
  async deletePool(poolId: string): Promise<void> {
    try {
      // Get all games for this pool
      const games = await this.getGamesByPool(poolId);

      // Delete pool and all its games in a batch
      const batch = writeBatch(db);

      // Delete all games
      games.forEach(game => {
        const gameRef = doc(this.gamesCollection, game.id);
        batch.delete(gameRef);
      });

      // Delete pool
      const poolRef = doc(this.poolsCollection, poolId);
      batch.delete(poolRef);

      await batch.commit();
    } catch (error) {
      console.error('Error deleting pool:', error);
      throw error instanceof Error ? error : new Error('Failed to delete pool');
    }
  }

  /**
   * Update pool metadata (name, advancement count)
   * 
   * @param poolId - The pool ID
   * @param updates - Fields to update
   */
  async updatePool(poolId: string, updates: UpdatePoolData): Promise<void> {
    try {
      const poolRef = doc(this.poolsCollection, poolId);
      await updateDoc(poolRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      // Invalidate cache
      await this.invalidatePoolCache(poolId);
    } catch (error) {
      console.error('Error updating pool:', error);
      throw error instanceof Error ? error : new Error('Failed to update pool');
    }
  }

  /**
   * Invalidate cached standings for a pool
   * Should be called when a pool game is completed or pool is updated
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
}

// Export singleton instance
export const poolService = new PoolService();
