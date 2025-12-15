import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Pool,
  Bracket,
  Game,
  GameStatus,
} from '../../types';
import { poolService } from './PoolService';
import { bracketService } from './BracketService';

/**
 * Validation result for tournament structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Tournament format configuration
 */
export interface TournamentFormat {
  hasPoolPlay: boolean;
  hasBrackets: boolean;
  isHybrid: boolean;
  poolCount: number;
  bracketCount: number;
}

/**
 * Service for coordinating tournament structure operations including:
 * - Pool-to-bracket advancement coordination
 * - Tournament format management
 * - Structure validation
 * - Cross-service coordination
 */
export class TournamentStructureService {
  private readonly poolsCollection = collection(db, 'pools');
  private readonly bracketsCollection = collection(db, 'brackets');
  private readonly gamesCollection = collection(db, 'games');

  /**
   * Coordinate advancement from pools to brackets
   * Requirements: 3.1, 3.3
   * 
   * This method:
   * 1. Verifies all pool games are complete
   * 2. Gets all pools and brackets for the division
   * 3. Seeds brackets from pool results
   * 4. Updates bracket games with advancing teams
   * 
   * @param divisionId - The division ID
   * @throws Error if pools are not complete or configuration is invalid
   */
  async advancePoolsToBrackets(divisionId: string): Promise<void> {
    try {
      // Check if all pools are complete
      const poolsComplete = await this.arePoolsComplete(divisionId);
      if (!poolsComplete) {
        throw new Error('Cannot advance to brackets: not all pool games are completed');
      }

      // Get all pools for this division
      const poolsQuery = query(
        this.poolsCollection,
        where('divisionId', '==', divisionId)
      );
      const poolsSnapshot = await getDocs(poolsQuery);
      
      if (poolsSnapshot.empty) {
        throw new Error('No pools found for division');
      }

      const pools = poolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Pool));

      // Get all brackets for this division
      const bracketsQuery = query(
        this.bracketsCollection,
        where('divisionId', '==', divisionId)
      );
      const bracketsSnapshot = await getDocs(bracketsQuery);

      if (bracketsSnapshot.empty) {
        throw new Error('No brackets found for division');
      }

      const brackets = bracketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Bracket));

      // Filter brackets that should be seeded from pools
      const poolSeededBrackets = brackets.filter(
        bracket => bracket.seedingSource === 'pools' || bracket.seedingSource === 'mixed'
      );

      if (poolSeededBrackets.length === 0) {
        throw new Error('No brackets configured to seed from pools');
      }

      // Seed each bracket from pools
      const poolIds = pools.map(pool => pool.id);
      
      for (const bracket of poolSeededBrackets) {
        await bracketService.seedBracketFromPools(bracket.id, poolIds);
        console.log(`Seeded bracket ${bracket.name} from pools`);
      }

      console.log(`Successfully advanced ${pools.length} pools to ${poolSeededBrackets.length} brackets`);
    } catch (error) {
      console.error('Error advancing pools to brackets:', error);
      throw error instanceof Error ? error : new Error('Failed to advance pools to brackets');
    }
  }

  /**
   * Check if all pool games in a division are complete
   * Requirements: 3.1, 3.3
   * 
   * @param divisionId - The division ID
   * @returns True if all pool games are completed, false otherwise
   */
  async arePoolsComplete(divisionId: string): Promise<boolean> {
    try {
      // Get all pools for this division
      const poolsQuery = query(
        this.poolsCollection,
        where('divisionId', '==', divisionId)
      );
      const poolsSnapshot = await getDocs(poolsQuery);

      if (poolsSnapshot.empty) {
        // No pools means nothing to complete
        return true;
      }

      const poolIds = poolsSnapshot.docs.map(doc => doc.id);

      // Check each pool's games
      for (const poolId of poolIds) {
        const games = await poolService.getGamesByPool(poolId);
        
        // Check if any games are not completed
        const hasIncompleteGames = games.some(
          game => game.status !== GameStatus.COMPLETED && game.status !== GameStatus.CANCELLED
        );

        if (hasIncompleteGames) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking if pools are complete:', error);
      throw error instanceof Error ? error : new Error('Failed to check pool completion status');
    }
  }

  /**
   * Get tournament format configuration for a division
   * 
   * @param divisionId - The division ID
   * @returns Tournament format information
   */
  async getTournamentFormat(divisionId: string): Promise<TournamentFormat> {
    try {
      // Get pools for division
      const poolsQuery = query(
        this.poolsCollection,
        where('divisionId', '==', divisionId)
      );
      const poolsSnapshot = await getDocs(poolsQuery);
      const poolCount = poolsSnapshot.size;

      // Get brackets for division
      const bracketsQuery = query(
        this.bracketsCollection,
        where('divisionId', '==', divisionId)
      );
      const bracketsSnapshot = await getDocs(bracketsQuery);
      const bracketCount = bracketsSnapshot.size;

      const hasPoolPlay = poolCount > 0;
      const hasBrackets = bracketCount > 0;
      const isHybrid = hasPoolPlay && hasBrackets;

      return {
        hasPoolPlay,
        hasBrackets,
        isHybrid,
        poolCount,
        bracketCount,
      };
    } catch (error) {
      console.error('Error getting tournament format:', error);
      throw error instanceof Error ? error : new Error('Failed to get tournament format');
    }
  }

  /**
   * Validate tournament structure for a division
   * Requirements: 4.4, 10.4
   * 
   * Checks for:
   * - Configuration conflicts
   * - Team assignment issues
   * - Invalid bracket sizes
   * - Missing required data
   * - Duplicate team assignments
   * 
   * @param divisionId - The division ID
   * @returns Validation result with errors and warnings
   */
  async validateStructure(divisionId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get pools and brackets
      const poolsQuery = query(
        this.poolsCollection,
        where('divisionId', '==', divisionId)
      );
      const poolsSnapshot = await getDocs(poolsQuery);
      const pools = poolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Pool));

      const bracketsQuery = query(
        this.bracketsCollection,
        where('divisionId', '==', divisionId)
      );
      const bracketsSnapshot = await getDocs(bracketsQuery);
      const brackets = bracketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Bracket));

      // Validate pools
      if (pools.length > 0) {
        await this.validatePools(pools, errors, warnings);
      }

      // Validate brackets
      if (brackets.length > 0) {
        await this.validateBrackets(brackets, errors, warnings);
      }

      // Validate hybrid configuration
      if (pools.length > 0 && brackets.length > 0) {
        await this.validateHybridConfiguration(pools, brackets, errors, warnings);
      }

      // Check for orphaned games
      await this.validateGames(divisionId, pools, brackets, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error validating structure:', error);
      errors.push('Failed to validate tournament structure');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Validate pool configurations
   */
  private async validatePools(
    pools: Pool[],
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check for duplicate pool names
    const poolNames = pools.map(p => p.name);
    const duplicateNames = poolNames.filter(
      (name, index) => poolNames.indexOf(name) !== index
    );
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate pool names found: ${duplicateNames.join(', ')}`);
    }

    // Validate each pool
    for (const pool of pools) {
      // Check minimum teams
      if (pool.teams.length < 2) {
        errors.push(`Pool "${pool.name}" must have at least 2 teams`);
      }

      // Check maximum teams
      if (pool.teams.length > 16) {
        errors.push(`Pool "${pool.name}" cannot have more than 16 teams`);
      }

      // Check for duplicate teams within pool
      const uniqueTeams = new Set(pool.teams);
      if (uniqueTeams.size !== pool.teams.length) {
        errors.push(`Pool "${pool.name}" has duplicate team assignments`);
      }

      // Check advancement count
      if (pool.advancementCount !== undefined) {
        if (pool.advancementCount > pool.teams.length) {
          errors.push(
            `Pool "${pool.name}" advancement count (${pool.advancementCount}) exceeds team count (${pool.teams.length})`
          );
        }
        if (pool.advancementCount < 0) {
          errors.push(`Pool "${pool.name}" advancement count cannot be negative`);
        }
      }
    }

    // Check for teams in multiple pools
    const allTeams: string[] = [];
    pools.forEach(pool => allTeams.push(...pool.teams));
    const teamCounts = new Map<string, number>();
    allTeams.forEach(team => {
      teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
    });
    
    const duplicateTeams = Array.from(teamCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([team, _]) => team);
    
    if (duplicateTeams.length > 0) {
      errors.push(`Teams assigned to multiple pools: ${duplicateTeams.join(', ')}`);
    }
  }

  /**
   * Validate bracket configurations
   */
  private async validateBrackets(
    brackets: Bracket[],
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check for duplicate bracket names
    const bracketNames = brackets.map(b => b.name);
    const duplicateNames = bracketNames.filter(
      (name, index) => bracketNames.indexOf(name) !== index
    );
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate bracket names found: ${duplicateNames.join(', ')}`);
    }

    // Validate each bracket
    for (const bracket of brackets) {
      // Validate bracket size
      if (![4, 8, 16, 32].includes(bracket.size)) {
        errors.push(`Bracket "${bracket.name}" has invalid size: ${bracket.size}`);
      }

      // Check if seeds are properly configured
      if (bracket.seeds.length !== bracket.size) {
        errors.push(
          `Bracket "${bracket.name}" seed count (${bracket.seeds.length}) does not match bracket size (${bracket.size})`
        );
      }

      // For manual seeding, check if all seeds have teams
      if (bracket.seedingSource === 'manual') {
        const unseededPositions = bracket.seeds
          .filter(seed => !seed.teamName)
          .map(seed => seed.position);
        
        if (unseededPositions.length > 0) {
          warnings.push(
            `Bracket "${bracket.name}" has unseeded positions: ${unseededPositions.join(', ')}`
          );
        }
      }

      // Check for duplicate team assignments in bracket
      const seededTeams = bracket.seeds
        .filter(seed => seed.teamName)
        .map(seed => seed.teamName!);
      
      const uniqueSeededTeams = new Set(seededTeams);
      if (uniqueSeededTeams.size !== seededTeams.length) {
        errors.push(`Bracket "${bracket.name}" has duplicate team assignments`);
      }
    }
  }

  /**
   * Validate hybrid pool-to-bracket configuration
   */
  private async validateHybridConfiguration(
    pools: Pool[],
    brackets: Bracket[],
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Calculate total advancing teams from pools
    let totalAdvancingTeams = 0;
    pools.forEach(pool => {
      if (pool.advancementCount) {
        totalAdvancingTeams += pool.advancementCount;
      }
    });

    // Calculate total bracket capacity
    const totalBracketCapacity = brackets.reduce((sum, bracket) => sum + bracket.size, 0);

    // Check if advancement counts match bracket capacity
    const poolSeededBrackets = brackets.filter(
      b => b.seedingSource === 'pools' || b.seedingSource === 'mixed'
    );
    
    if (poolSeededBrackets.length > 0) {
      const poolSeededCapacity = poolSeededBrackets.reduce(
        (sum, bracket) => sum + bracket.size,
        0
      );

      if (totalAdvancingTeams > poolSeededCapacity) {
        warnings.push(
          `More teams advancing from pools (${totalAdvancingTeams}) than bracket capacity (${poolSeededCapacity})`
        );
      }

      if (totalAdvancingTeams < poolSeededCapacity) {
        warnings.push(
          `Fewer teams advancing from pools (${totalAdvancingTeams}) than bracket capacity (${poolSeededCapacity})`
        );
      }

      // Check if pools have advancement counts set
      const poolsWithoutAdvancement = pools.filter(p => !p.advancementCount);
      if (poolsWithoutAdvancement.length > 0) {
        warnings.push(
          `Pools without advancement count: ${poolsWithoutAdvancement.map(p => p.name).join(', ')}`
        );
      }
    }
  }

  /**
   * Validate games and check for orphaned games
   */
  private async validateGames(
    divisionId: string,
    pools: Pool[],
    brackets: Bracket[],
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Get all games for division
    const gamesQuery = query(
      this.gamesCollection,
      where('divisionId', '==', divisionId)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    const games = gamesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Game));

    const poolIds = new Set(pools.map(p => p.id));
    const bracketIds = new Set(brackets.map(b => b.id));

    // Check for games with invalid pool/bracket references
    games.forEach(game => {
      if (game.poolId && !poolIds.has(game.poolId)) {
        errors.push(`Game ${game.id} references non-existent pool: ${game.poolId}`);
      }

      if (game.bracketId && !bracketIds.has(game.bracketId)) {
        errors.push(`Game ${game.id} references non-existent bracket: ${game.bracketId}`);
      }

      // Check for games with both pool and bracket IDs
      if (game.poolId && game.bracketId) {
        errors.push(`Game ${game.id} has both poolId and bracketId set`);
      }
    });

    // Check for orphaned games (no pool or bracket assignment)
    const orphanedGames = games.filter(game => !game.poolId && !game.bracketId);
    if (orphanedGames.length > 0 && (pools.length > 0 || brackets.length > 0)) {
      warnings.push(
        `${orphanedGames.length} games are not assigned to any pool or bracket`
      );
    }
  }
}

// Export singleton instance
export const tournamentStructureService = new TournamentStructureService();
