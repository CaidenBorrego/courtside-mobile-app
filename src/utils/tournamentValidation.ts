import { Pool, Bracket, Game, GameStatus } from '../types';

/**
 * Validation error with severity level
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Pool validation utilities
 */
export class PoolValidator {
  /**
   * Validate pool configuration before saving
   * Requirements: 10.4
   */
  static validatePoolConfig(
    name: string,
    teams: string[],
    advancementCount?: number,
    existingPools?: Pool[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate pool name
    if (!name || name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Pool name is required',
        severity: 'error',
        code: 'POOL_NAME_REQUIRED',
      });
    }

    if (name && name.length > 50) {
      errors.push({
        field: 'name',
        message: 'Pool name must be 50 characters or less',
        severity: 'error',
        code: 'POOL_NAME_TOO_LONG',
      });
    }

    // Check for duplicate pool names
    if (existingPools && name) {
      const duplicateName = existingPools.some(
        pool => pool.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicateName) {
        errors.push({
          field: 'name',
          message: `Pool name "${name}" is already in use`,
          severity: 'error',
          code: 'POOL_NAME_DUPLICATE',
        });
      }
    }

    // Validate teams
    if (!teams || teams.length === 0) {
      errors.push({
        field: 'teams',
        message: 'Pool must have at least one team',
        severity: 'error',
        code: 'POOL_NO_TEAMS',
      });
    }

    if (teams && teams.length < 2) {
      errors.push({
        field: 'teams',
        message: 'Pool must have at least 2 teams',
        severity: 'error',
        code: 'POOL_MIN_TEAMS',
      });
    }

    if (teams && teams.length > 16) {
      errors.push({
        field: 'teams',
        message: 'Pool cannot have more than 16 teams',
        severity: 'error',
        code: 'POOL_MAX_TEAMS',
      });
    }

    // Check for duplicate teams within pool
    if (teams && teams.length > 0) {
      const uniqueTeams = new Set(teams.map(t => t.toLowerCase()));
      if (uniqueTeams.size !== teams.length) {
        errors.push({
          field: 'teams',
          message: 'Pool cannot have duplicate team names',
          severity: 'error',
          code: 'POOL_DUPLICATE_TEAMS',
        });
      }

      // Check for empty team names
      const emptyTeams = teams.filter(t => !t || t.trim().length === 0);
      if (emptyTeams.length > 0) {
        errors.push({
          field: 'teams',
          message: 'All team names must be non-empty',
          severity: 'error',
          code: 'POOL_EMPTY_TEAM_NAME',
        });
      }
    }

    // Validate advancement count
    if (advancementCount !== undefined) {
      if (advancementCount < 0) {
        errors.push({
          field: 'advancementCount',
          message: 'Advancement count cannot be negative',
          severity: 'error',
          code: 'POOL_NEGATIVE_ADVANCEMENT',
        });
      }

      if (teams && advancementCount > teams.length) {
        errors.push({
          field: 'advancementCount',
          message: `Advancement count (${advancementCount}) cannot exceed team count (${teams.length})`,
          severity: 'error',
          code: 'POOL_ADVANCEMENT_EXCEEDS_TEAMS',
        });
      }

      if (advancementCount === 0) {
        errors.push({
          field: 'advancementCount',
          message: 'Advancement count of 0 means no teams will advance',
          severity: 'warning',
          code: 'POOL_NO_ADVANCEMENT',
        });
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate pool update operation
   */
  static validatePoolUpdate(
    poolId: string,
    updates: Partial<Pool>,
    existingGames: Game[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if pool has completed games
    const hasCompletedGames = existingGames.some(
      game => game.status === GameStatus.COMPLETED
    );

    if (hasCompletedGames && updates.teams) {
      errors.push({
        field: 'teams',
        message: 'Cannot update pool teams: some games have already been completed',
        severity: 'error',
        code: 'POOL_UPDATE_COMPLETED_GAMES',
      });
    }

    // Validate team updates
    if (updates.teams) {
      const teamValidation = this.validatePoolConfig(
        updates.name || 'Pool',
        updates.teams,
        updates.advancementCount
      );
      errors.push(...teamValidation.errors);
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Check for team conflicts across multiple pools
   */
  static validateTeamConflicts(pools: Pool[]): ValidationResult {
    const errors: ValidationError[] = [];
    const teamToPoolsMap = new Map<string, string[]>();

    // Build map of teams to pools
    pools.forEach(pool => {
      pool.teams.forEach(team => {
        const normalizedTeam = team.toLowerCase();
        if (!teamToPoolsMap.has(normalizedTeam)) {
          teamToPoolsMap.set(normalizedTeam, []);
        }
        teamToPoolsMap.get(normalizedTeam)!.push(pool.name);
      });
    });

    // Find teams in multiple pools
    teamToPoolsMap.forEach((poolNames, team) => {
      if (poolNames.length > 1) {
        errors.push({
          field: 'teams',
          message: `Team "${team}" is assigned to multiple pools: ${poolNames.join(', ')}`,
          severity: 'error',
          code: 'TEAM_MULTIPLE_POOLS',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Bracket validation utilities
 */
export class BracketValidator {
  /**
   * Validate bracket configuration before saving
   * Requirements: 10.4
   */
  static validateBracketConfig(
    name: string,
    size: number,
    seedingSource: 'manual' | 'pools' | 'mixed',
    seeds?: any[],
    existingBrackets?: Bracket[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate bracket name
    if (!name || name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Bracket name is required',
        severity: 'error',
        code: 'BRACKET_NAME_REQUIRED',
      });
    }

    if (name && name.length > 50) {
      errors.push({
        field: 'name',
        message: 'Bracket name must be 50 characters or less',
        severity: 'error',
        code: 'BRACKET_NAME_TOO_LONG',
      });
    }

    // Check for duplicate bracket names
    if (existingBrackets && name) {
      const duplicateName = existingBrackets.some(
        bracket => bracket.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicateName) {
        errors.push({
          field: 'name',
          message: `Bracket name "${name}" is already in use`,
          severity: 'error',
          code: 'BRACKET_NAME_DUPLICATE',
        });
      }
    }

    // Validate bracket size
    const validSizes = [4, 8, 16, 32];
    if (!validSizes.includes(size)) {
      errors.push({
        field: 'size',
        message: `Bracket size must be 4, 8, 16, or 32 (got ${size})`,
        severity: 'error',
        code: 'BRACKET_INVALID_SIZE',
      });
    }

    // Validate seeding source
    const validSources = ['manual', 'pools', 'mixed'];
    if (!validSources.includes(seedingSource)) {
      errors.push({
        field: 'seedingSource',
        message: `Invalid seeding source: ${seedingSource}`,
        severity: 'error',
        code: 'BRACKET_INVALID_SEEDING_SOURCE',
      });
    }

    // Validate seeds if provided
    if (seeds) {
      if (seeds.length !== size) {
        errors.push({
          field: 'seeds',
          message: `Seed count (${seeds.length}) must match bracket size (${size})`,
          severity: 'error',
          code: 'BRACKET_SEED_COUNT_MISMATCH',
        });
      }

      // Check for duplicate team assignments
      const seededTeams = seeds
        .filter(seed => seed.teamName)
        .map(seed => seed.teamName.toLowerCase());
      
      const uniqueTeams = new Set(seededTeams);
      if (uniqueTeams.size !== seededTeams.length) {
        errors.push({
          field: 'seeds',
          message: 'Cannot assign the same team to multiple seed positions',
          severity: 'error',
          code: 'BRACKET_DUPLICATE_TEAMS',
        });
      }

      // Validate seed positions are sequential
      const positions = seeds.map(s => s.position).sort((a, b) => a - b);
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] !== i + 1) {
          errors.push({
            field: 'seeds',
            message: 'Seed positions must be sequential from 1 to bracket size',
            severity: 'error',
            code: 'BRACKET_INVALID_SEED_POSITIONS',
          });
          break;
        }
      }

      // Warn about unseeded positions for manual seeding
      if (seedingSource === 'manual') {
        const unseededCount = seeds.filter(seed => !seed.teamName).length;
        if (unseededCount > 0) {
          errors.push({
            field: 'seeds',
            message: `${unseededCount} seed position(s) are not assigned`,
            severity: 'warning',
            code: 'BRACKET_UNSEEDED_POSITIONS',
          });
        }
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate bracket deletion
   */
  static validateBracketDeletion(
    bracket: Bracket,
    games: Game[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if any games have been completed
    const completedGames = games.filter(
      game => game.status === GameStatus.COMPLETED
    );

    if (completedGames.length > 0) {
      errors.push({
        field: 'bracket',
        message: `Cannot delete bracket: ${completedGames.length} game(s) have been completed`,
        severity: 'error',
        code: 'BRACKET_DELETE_COMPLETED_GAMES',
      });
    }

    // Warn about scheduled games
    const scheduledGames = games.filter(
      game => game.status === GameStatus.SCHEDULED || game.status === GameStatus.IN_PROGRESS
    );

    if (scheduledGames.length > 0) {
      errors.push({
        field: 'bracket',
        message: `Deleting bracket will remove ${scheduledGames.length} scheduled game(s)`,
        severity: 'warning',
        code: 'BRACKET_DELETE_SCHEDULED_GAMES',
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate game dependency chain
   */
  static validateGameDependencies(games: Game[]): ValidationResult {
    const errors: ValidationError[] = [];
    const gameIds = new Set(games.map(g => g.id));

    games.forEach(game => {
      // Check dependsOnGames references
      if (game.dependsOnGames) {
        game.dependsOnGames.forEach(depId => {
          if (!gameIds.has(depId)) {
            errors.push({
              field: 'dependsOnGames',
              message: `Game ${game.id} depends on non-existent game ${depId}`,
              severity: 'error',
              code: 'BRACKET_INVALID_DEPENDENCY',
            });
          }
        });
      }

      // Check feedsIntoGame reference
      if (game.feedsIntoGame && !gameIds.has(game.feedsIntoGame)) {
        errors.push({
          field: 'feedsIntoGame',
          message: `Game ${game.id} feeds into non-existent game ${game.feedsIntoGame}`,
          severity: 'error',
          code: 'BRACKET_INVALID_FEED',
        });
      }
    });

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (gameId: string): boolean => {
      if (recursionStack.has(gameId)) {
        return true;
      }
      if (visited.has(gameId)) {
        return false;
      }

      visited.add(gameId);
      recursionStack.add(gameId);

      const game = games.find(g => g.id === gameId);
      if (game?.feedsIntoGame) {
        if (hasCycle(game.feedsIntoGame)) {
          return true;
        }
      }

      recursionStack.delete(gameId);
      return false;
    };

    games.forEach(game => {
      if (hasCycle(game.id)) {
        errors.push({
          field: 'dependencies',
          message: `Circular dependency detected in bracket structure involving game ${game.id}`,
          severity: 'error',
          code: 'BRACKET_CIRCULAR_DEPENDENCY',
        });
      }
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }
}

/**
 * Game validation utilities
 */
export class GameValidator {
  /**
   * Validate game deletion with dependencies
   * Requirements: 4.4
   */
  static validateGameDeletion(
    game: Game,
    allGames: Game[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if other games depend on this game
    const dependentGames = allGames.filter(g =>
      g.dependsOnGames?.includes(game.id)
    );

    if (dependentGames.length > 0) {
      errors.push({
        field: 'game',
        message: `Cannot delete game: ${dependentGames.length} other game(s) depend on this game's result`,
        severity: 'error',
        code: 'GAME_HAS_DEPENDENCIES',
      });

      // List the dependent games
      dependentGames.forEach(depGame => {
        errors.push({
          field: 'game',
          message: `Game "${depGame.gameLabel || depGame.id}" depends on this game`,
          severity: 'warning',
          code: 'GAME_DEPENDENT_GAME',
        });
      });
    }

    // Warn if game is completed
    if (game.status === GameStatus.COMPLETED) {
      errors.push({
        field: 'game',
        message: 'Deleting a completed game will affect standings and statistics',
        severity: 'warning',
        code: 'GAME_DELETE_COMPLETED',
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate game edit with advancement implications
   * Requirements: 4.4
   */
  static validateGameEdit(
    game: Game,
    updates: Partial<Game>,
    allGames: Game[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if game is completed and has advanced a winner
    if (game.status === GameStatus.COMPLETED && game.feedsIntoGame) {
      const nextGame = allGames.find(g => g.id === game.feedsIntoGame);
      
      if (nextGame && (nextGame.teamA || nextGame.teamB)) {
        // Check if we're changing the score (which could change the winner)
        if (updates.scoreA !== undefined || updates.scoreB !== undefined) {
          errors.push({
            field: 'score',
            message: 'Changing the score may affect which team advanced to the next round',
            severity: 'warning',
            code: 'GAME_EDIT_AFFECTS_ADVANCEMENT',
          });
        }

        // Check if we're changing teams
        if (updates.teamA || updates.teamB) {
          errors.push({
            field: 'teams',
            message: 'Cannot change teams: winner has already advanced to next round',
            severity: 'error',
            code: 'GAME_EDIT_TEAMS_ADVANCED',
          });
        }
      }
    }

    // Validate structure field changes
    if (updates.poolId !== undefined && game.poolId && updates.poolId !== game.poolId) {
      errors.push({
        field: 'poolId',
        message: 'Cannot change pool assignment after game is created',
        severity: 'error',
        code: 'GAME_EDIT_POOL_CHANGE',
      });
    }

    if (updates.bracketId !== undefined && game.bracketId && updates.bracketId !== game.bracketId) {
      errors.push({
        field: 'bracketId',
        message: 'Cannot change bracket assignment after game is created',
        severity: 'error',
        code: 'GAME_EDIT_BRACKET_CHANGE',
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }
}

/**
 * Hybrid tournament validation
 */
export class HybridTournamentValidator {
  /**
   * Validate pool-to-bracket advancement configuration
   * Requirements: 10.4
   */
  static validateAdvancementConfiguration(
    pools: Pool[],
    brackets: Bracket[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Calculate total advancing teams
    let totalAdvancingTeams = 0;
    const poolsWithoutAdvancement: string[] = [];

    pools.forEach(pool => {
      if (pool.advancementCount) {
        totalAdvancingTeams += pool.advancementCount;
      } else {
        poolsWithoutAdvancement.push(pool.name);
      }
    });

    // Find brackets that seed from pools
    const poolSeededBrackets = brackets.filter(
      b => b.seedingSource === 'pools' || b.seedingSource === 'mixed'
    );

    if (poolSeededBrackets.length === 0) {
      errors.push({
        field: 'brackets',
        message: 'No brackets configured to seed from pools',
        severity: 'warning',
        code: 'HYBRID_NO_POOL_SEEDED_BRACKETS',
      });
      return {
        isValid: true,
        errors,
      };
    }

    // Calculate bracket capacity
    const bracketCapacity = poolSeededBrackets.reduce(
      (sum, bracket) => sum + bracket.size,
      0
    );

    // Check if advancement counts match bracket capacity
    if (totalAdvancingTeams > bracketCapacity) {
      errors.push({
        field: 'advancement',
        message: `More teams advancing from pools (${totalAdvancingTeams}) than bracket capacity (${bracketCapacity})`,
        severity: 'error',
        code: 'HYBRID_EXCESS_ADVANCING_TEAMS',
      });
    }

    if (totalAdvancingTeams < bracketCapacity) {
      errors.push({
        field: 'advancement',
        message: `Fewer teams advancing from pools (${totalAdvancingTeams}) than bracket capacity (${bracketCapacity}). ${bracketCapacity - totalAdvancingTeams} seed(s) will be empty.`,
        severity: 'warning',
        code: 'HYBRID_INSUFFICIENT_ADVANCING_TEAMS',
      });
    }

    // Warn about pools without advancement counts
    if (poolsWithoutAdvancement.length > 0) {
      errors.push({
        field: 'advancement',
        message: `Pools without advancement count: ${poolsWithoutAdvancement.join(', ')}`,
        severity: 'warning',
        code: 'HYBRID_POOLS_NO_ADVANCEMENT',
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate that pools are complete before advancement
   */
  static validatePoolsComplete(
    pools: Pool[],
    gamesByPool: Map<string, Game[]>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    pools.forEach(pool => {
      const games = gamesByPool.get(pool.id) || [];
      const incompleteGames = games.filter(
        game => game.status !== GameStatus.COMPLETED && game.status !== GameStatus.CANCELLED
      );

      if (incompleteGames.length > 0) {
        errors.push({
          field: 'pool',
          message: `Pool "${pool.name}" has ${incompleteGames.length} incomplete game(s)`,
          severity: 'error',
          code: 'HYBRID_POOL_INCOMPLETE',
        });
      }
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }
}
