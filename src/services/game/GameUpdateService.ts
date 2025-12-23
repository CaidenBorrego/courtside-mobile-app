import { Game, UpdateGameData } from '../../types';
import { FirebaseService } from '../firebase/FirebaseService';
import { isPlaceholderTeam } from '../../utils/gameLabels';
import { Timestamp } from 'firebase/firestore';
import { teamStatsService } from '../tournament/TeamStatsService';

/**
 * Validation result for game updates
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of a game update operation
 */
export interface UpdateResult {
  success: boolean;
  updatedGame: Game;
  affectedGames: Game[];
  warnings: string[];
  errors: string[];
}

/**
 * Error types for game update operations
 */
enum GameUpdateError {
  PLACEHOLDER_TEAMS = 'Cannot update scores for games with undetermined teams',
  INVALID_SCORES = 'Scores must be non-negative integers',
  DEPENDENCIES_NOT_MET = 'Cannot start game until dependent games are completed',
  TIE_GAME = 'Tie game detected - please verify scores',
  GAME_NOT_FOUND = 'Game not found',
  PERMISSION_DENIED = 'You do not have permission to update this game',
  NETWORK_ERROR = 'Network error occurred. Please check your connection and try again',
  VALIDATION_FAILED = 'Game update validation failed',
  CASCADE_FAILED = 'Failed to update dependent games',
  ADVANCEMENT_FAILED = 'Failed to advance teams to next game',
  UNKNOWN_ERROR = 'An unexpected error occurred',
}

/**
 * Configuration for retry logic
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Service for managing game updates with validation and cascade logic
 * 
 * This service acts as a business logic layer between the UI and data layer,
 * ensuring game updates maintain tournament integrity through validation,
 * automatic team advancement, and cascade updates.
 */
export class GameUpdateService {
  private firebaseService: FirebaseService;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  /**
   * Creates a new GameUpdateService instance
   * @param firebaseService - The Firebase service for data operations
   */
  constructor(firebaseService: FirebaseService) {
    this.firebaseService = firebaseService;
  }

  /**
   * Executes an operation with exponential backoff retry logic
   * 
   * @param operation - The async operation to execute
   * @param operationName - Name of the operation for logging
   * @returns Result of the operation
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable (network errors)
        const isNetworkError = this.isNetworkError(error);
        
        if (!isNetworkError || attempt === this.retryConfig.maxRetries) {
          // Don't retry non-network errors or if we've exhausted retries
          console.error(`${operationName} failed after ${attempt + 1} attempts:`, error);
          throw lastError;
        }

        // Log retry attempt
        console.warn(
          `${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}). ` +
          `Retrying in ${delay}ms...`,
          error
        );

        // Wait before retrying
        await this.sleep(delay);

        // Increase delay for next retry (exponential backoff)
        delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error(`${operationName} failed`);
  }

  /**
   * Checks if an error is a network error that should be retried
   * 
   * @param error - The error to check
   * @returns True if the error is retryable
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('unavailable') ||
        message.includes('fetch')
      );
    }
    return false;
  }

  /**
   * Sleep utility for retry delays
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logs an error with context information
   * 
   * @param operation - The operation that failed
   * @param error - The error that occurred
   * @param context - Additional context information
   */
  private logError(operation: string, error: unknown, context?: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[GameUpdateService] ${operation} failed:`, {
      error: errorMessage,
      stack: errorStack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Gets a user-friendly error message from an error object
   * 
   * @param error - The error object
   * @param defaultMessage - Default message if error cannot be parsed
   * @returns User-friendly error message
   */
  private getErrorMessage(error: unknown, defaultMessage: string = GameUpdateError.UNKNOWN_ERROR): string {
    if (error instanceof Error) {
      // Check for specific Firebase error codes
      if ('code' in error) {
        const code = (error as { code: string }).code;
        
        if (code === 'permission-denied') {
          return GameUpdateError.PERMISSION_DENIED;
        }
        if (code === 'not-found') {
          return GameUpdateError.GAME_NOT_FOUND;
        }
        if (code === 'unavailable' || code === 'deadline-exceeded') {
          return GameUpdateError.NETWORK_ERROR;
        }
      }
      
      // Check for network errors
      if (this.isNetworkError(error)) {
        return GameUpdateError.NETWORK_ERROR;
      }
      
      return error.message;
    }
    
    return defaultMessage;
  }

  /**
   * Updates a game with validation and cascade logic
   * 
   * This is the main entry point for game updates. It:
   * 1. Validates the update
   * 2. Updates the game in Firestore
   * 3. Handles team advancement if the game is completed
   * 4. Cascades changes to downstream games if needed
   * 
   * @param gameId - The game to update
   * @param updates - The update data
   * @returns Result with success status, affected games, and messages
   */
  async updateGame(
    gameId: string,
    updates: UpdateGameData
  ): Promise<UpdateResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let affectedGames: Game[] = [];
    let updatedGame: Game | null = null;

    try {
      // Get the current game state with retry logic
      const oldGame = await this.executeWithRetry(
        () => this.firebaseService.getGame(gameId),
        'Get game for update'
      );

      // Validate the update
      const validationResult = await this.validateGameUpdate(oldGame, updates);
      
      if (!validationResult.valid) {
        this.logError('Game update validation failed', null, {
          gameId,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        });
        
        return {
          success: false,
          updatedGame: oldGame,
          affectedGames: [],
          warnings: validationResult.warnings,
          errors: validationResult.errors,
        };
      }

      // Add validation warnings
      warnings.push(...validationResult.warnings);

      // Update the game with retry logic
      await this.executeWithRetry(
        () => this.firebaseService.updateGame(gameId, updates),
        'Update game'
      );
      
      updatedGame = await this.executeWithRetry(
        () => this.firebaseService.getGame(gameId),
        'Get updated game'
      );

      // Invalidate team stats cache for both teams
      try {
        await teamStatsService.invalidateTeamCache(updatedGame.teamA, updatedGame.divisionId);
        await teamStatsService.invalidateTeamCache(updatedGame.teamB, updatedGame.divisionId);
        await teamStatsService.invalidateDivisionCache(updatedGame.divisionId);
        
        // If game is in a pool, invalidate pool cache too
        if (updatedGame.poolId) {
          await teamStatsService.invalidatePoolCache(updatedGame.poolId);
        }
      } catch (error) {
        // Log but don't fail the update if cache invalidation fails
        this.logError('Cache invalidation failed', error, {
          gameId,
          divisionId: updatedGame.divisionId,
          poolId: updatedGame.poolId,
        });
      }

      // Handle team advancement if game is now completed
      if (updatedGame.status === 'completed' && oldGame.status !== 'completed') {
        try {
          const advancedGames = await this.advanceTeams(updatedGame);
          affectedGames.push(...advancedGames);
        } catch (error) {
          this.logError('Team advancement failed', error, {
            gameId,
            oldStatus: oldGame.status,
            newStatus: updatedGame.status,
          });
          
          const errorMessage = this.getErrorMessage(error, GameUpdateError.ADVANCEMENT_FAILED);
          warnings.push(`Game updated but some teams could not be advanced automatically: ${errorMessage}`);
        }
      }

      // Handle cascade updates if game was already completed and changed
      if (oldGame.status === 'completed' && updatedGame.status === 'completed') {
        try {
          const cascadedGames = await this.cascadeGameChanges(gameId, oldGame, updatedGame);
          affectedGames.push(...cascadedGames);
        } catch (error) {
          this.logError('Cascade update failed', error, {
            gameId,
            oldScores: { scoreA: oldGame.scoreA, scoreB: oldGame.scoreB },
            newScores: { scoreA: updatedGame.scoreA, scoreB: updatedGame.scoreB },
          });
          
          const errorMessage = this.getErrorMessage(error, GameUpdateError.CASCADE_FAILED);
          warnings.push(`Game updated but some dependent games could not be updated automatically: ${errorMessage}`);
        }
      }

      // Handle status change from completed to scheduled
      if (oldGame.status === 'completed' && updatedGame.status !== 'completed') {
        try {
          const cascadedGames = await this.cascadeGameChanges(gameId, oldGame, updatedGame);
          affectedGames.push(...cascadedGames);
        } catch (error) {
          this.logError('Cascade reset failed', error, {
            gameId,
            oldStatus: oldGame.status,
            newStatus: updatedGame.status,
          });
          
          const errorMessage = this.getErrorMessage(error, GameUpdateError.CASCADE_FAILED);
          warnings.push(`Game updated but some dependent games could not be reset automatically: ${errorMessage}`);
        }
      }

      return {
        success: true,
        updatedGame,
        affectedGames,
        warnings,
        errors: [],
      };
    } catch (error) {
      this.logError('Game update failed', error, {
        gameId,
        updates,
      });
      
      const errorMessage = this.getErrorMessage(error, 'Failed to update game');
      
      // Try to get the current game state for the error response
      let currentGame: Game | null = null;
      try {
        currentGame = await this.firebaseService.getGame(gameId);
      } catch (getError) {
        this.logError('Failed to get game after update error', getError, { gameId });
      }
      
      return {
        success: false,
        updatedGame: currentGame || updatedGame || ({} as Game),
        affectedGames: [],
        warnings: [],
        errors: [errorMessage],
      };
    }
  }

  /**
   * Checks if a game has placeholder teams
   * 
   * A placeholder team is one that hasn't been determined yet, such as:
   * - "TBD"
   * - "Winner of Game 1"
   * - "Loser of Game 2"
   * - "1st Pool A"
   * 
   * @param game - The game to check
   * @returns True if either team is a placeholder
   */
  hasPlaceholderTeams(game: Game): boolean {
    return isPlaceholderTeam(game.teamA) || isPlaceholderTeam(game.teamB);
  }

  /**
   * Validates if a game update is allowed
   * 
   * Performs validation checks including:
   * - Score validation (non-negative integers)
   * - Placeholder team checks
   * - Tie game detection
   * - Dependency validation (upstream games must be completed)
   * 
   * @param game - The current game state
   * @param updates - The proposed updates
   * @returns Validation result with errors and warnings
   */
  async validateGameUpdate(
    game: Game,
    updates: Partial<UpdateGameData>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if game has placeholder teams
      const hasPlaceholders = this.hasPlaceholderTeams(game);

      // If updating scores, validate them
      if (updates.scoreA !== undefined || updates.scoreB !== undefined) {
        const scoreA = updates.scoreA !== undefined ? updates.scoreA : game.scoreA;
        const scoreB = updates.scoreB !== undefined ? updates.scoreB : game.scoreB;

        // Validate scores are non-negative integers
        if (scoreA < 0 || scoreB < 0) {
          errors.push(GameUpdateError.INVALID_SCORES);
        }

        if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
          errors.push(GameUpdateError.INVALID_SCORES);
        }

        // Check if trying to update scores for placeholder game
        if (hasPlaceholders && (scoreA > 0 || scoreB > 0)) {
          errors.push(GameUpdateError.PLACEHOLDER_TEAMS);
        }

        // Detect tie games
        if (scoreA > 0 && scoreB > 0 && scoreA === scoreB) {
          warnings.push(GameUpdateError.TIE_GAME);
        }
      }

      // If updating status to something other than CANCELLED, check for placeholders
      if (updates.status && updates.status !== 'cancelled') {
        if (hasPlaceholders && updates.status !== 'scheduled') {
          errors.push(GameUpdateError.PLACEHOLDER_TEAMS);
        }
      }

      // Validate dependencies if status is changing to IN_PROGRESS
      if (updates.status === 'in_progress') {
        try {
          const dependencyError = await this.validateDependencies(game);
          if (dependencyError) {
            errors.push(dependencyError);
          }
        } catch (error) {
          this.logError('Dependency validation failed', error, {
            gameId: game.id,
            dependsOnGames: game.dependsOnGames,
          });
          errors.push('Failed to validate game dependencies');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logError('Validation failed', error, {
        gameId: game.id,
        updates,
      });
      
      return {
        valid: false,
        errors: [GameUpdateError.VALIDATION_FAILED],
        warnings: [],
      };
    }
  }

  /**
   * Validates that all upstream games (dependencies) are completed
   * 
   * Checks if all games in the dependsOnGames array have status COMPLETED.
   * This ensures that a game cannot start until its dependencies are met.
   * 
   * @param game - The game to validate
   * @returns Error message if validation fails, null if valid
   */
  async validateDependencies(game: Game): Promise<string | null> {
    // If no dependencies, validation passes
    if (!game.dependsOnGames || game.dependsOnGames.length === 0) {
      return null;
    }

    try {
      // Load all upstream games with retry logic
      const upstreamGames = await Promise.all(
        game.dependsOnGames.map(gameId => 
          this.executeWithRetry(
            () => this.firebaseService.getGame(gameId),
            `Get upstream game ${gameId}`
          )
        )
      );

      // Check if all are completed
      const incompleteGames = upstreamGames.filter(g => g.status !== 'completed');

      if (incompleteGames.length > 0) {
        return GameUpdateError.DEPENDENCIES_NOT_MET;
      }

      return null;
    } catch (error) {
      this.logError('Dependency validation failed', error, {
        gameId: game.id,
        dependsOnGames: game.dependsOnGames,
      });
      
      const errorMessage = this.getErrorMessage(error, 'Failed to validate game dependencies');
      return errorMessage;
    }
  }

  /**
   * Gets all games that depend on this game's result
   * 
   * Queries for games where this game feeds into them, either as a winner
   * or loser advancement path.
   * 
   * @param gameId - The game to check
   * @returns Array of downstream games
   */
  async getDownstreamGames(gameId: string): Promise<Game[]> {
    try {
      return await this.executeWithRetry(
        () => this.firebaseService.getGamesFedBy(gameId),
        `Get downstream games for ${gameId}`
      );
    } catch (error) {
      this.logError('Failed to get downstream games', error, { gameId });
      throw error;
    }
  }

  /**
   * Advances teams to downstream games when a game completes
   * 
   * When a game is completed, this method:
   * 1. Determines the winner and loser based on scores
   * 2. Updates the winnerFeedsIntoGame with the winning team
   * 3. Updates the loserFeedsIntoGame with the losing team (if applicable)
   * 4. Determines the correct team slot (teamA or teamB) based on bracketPosition or dependsOnGames order
   * 5. Preserves existing teams in the other slot if already populated
   * 
   * @param game - The completed game
   * @returns Array of updated downstream games
   */
  async advanceTeams(game: Game): Promise<Game[]> {
    try {
      // Validate game is completed
      if (game.status !== 'completed') {
        throw new Error('Cannot advance teams from a game that is not completed');
      }

      // Determine winner and loser
      const winningTeam = game.scoreA > game.scoreB ? game.teamA : game.teamB;
      const losingTeam = game.scoreA > game.scoreB ? game.teamB : game.teamA;

      const updates: { gameId: string; data: UpdateGameData }[] = [];

      // Handle winner advancement
      if (game.winnerFeedsIntoGame) {
        try {
          const downstreamGame = await this.executeWithRetry(
            () => this.firebaseService.getGame(game.winnerFeedsIntoGame!),
            `Get winner downstream game ${game.winnerFeedsIntoGame}`
          );
          
          const teamSlot = this.determineTeamSlot(downstreamGame, game.id);
          
          const updateData: UpdateGameData = {
            updatedAt: Timestamp.now(),
          };

          if (teamSlot === 'teamA') {
            updateData.teamA = winningTeam;
            // Preserve teamAImageUrl if it exists in the original game
            if (game.scoreA > game.scoreB && game.teamAImageUrl) {
              updateData.teamAImageUrl = game.teamAImageUrl;
            } else if (game.scoreA <= game.scoreB && game.teamBImageUrl) {
              updateData.teamAImageUrl = game.teamBImageUrl;
            }
          } else {
            updateData.teamB = winningTeam;
            // Preserve teamBImageUrl if it exists in the original game
            if (game.scoreA > game.scoreB && game.teamAImageUrl) {
              updateData.teamBImageUrl = game.teamAImageUrl;
            } else if (game.scoreA <= game.scoreB && game.teamBImageUrl) {
              updateData.teamBImageUrl = game.teamBImageUrl;
            }
          }

          updates.push({
            gameId: game.winnerFeedsIntoGame,
            data: updateData,
          });
        } catch (error) {
          this.logError('Failed to prepare winner advancement', error, {
            gameId: game.id,
            winnerFeedsIntoGame: game.winnerFeedsIntoGame,
          });
          throw error;
        }
      }

      // Handle loser advancement (for double elimination or consolation brackets)
      if (game.loserFeedsIntoGame) {
        try {
          const downstreamGame = await this.executeWithRetry(
            () => this.firebaseService.getGame(game.loserFeedsIntoGame!),
            `Get loser downstream game ${game.loserFeedsIntoGame}`
          );
          
          const teamSlot = this.determineTeamSlot(downstreamGame, game.id);
          
          const updateData: UpdateGameData = {
            updatedAt: Timestamp.now(),
          };

          if (teamSlot === 'teamA') {
            updateData.teamA = losingTeam;
            // Preserve teamAImageUrl if it exists in the original game
            if (game.scoreA <= game.scoreB && game.teamAImageUrl) {
              updateData.teamAImageUrl = game.teamAImageUrl;
            } else if (game.scoreA > game.scoreB && game.teamBImageUrl) {
              updateData.teamAImageUrl = game.teamBImageUrl;
            }
          } else {
            updateData.teamB = losingTeam;
            // Preserve teamBImageUrl if it exists in the original game
            if (game.scoreA <= game.scoreB && game.teamAImageUrl) {
              updateData.teamBImageUrl = game.teamAImageUrl;
            } else if (game.scoreA > game.scoreB && game.teamBImageUrl) {
              updateData.teamBImageUrl = game.teamBImageUrl;
            }
          }

          updates.push({
            gameId: game.loserFeedsIntoGame,
            data: updateData,
          });
        } catch (error) {
          this.logError('Failed to prepare loser advancement', error, {
            gameId: game.id,
            loserFeedsIntoGame: game.loserFeedsIntoGame,
          });
          throw error;
        }
      }

      // Batch update all downstream games with retry logic
      if (updates.length > 0) {
        await this.executeWithRetry(
          () => this.firebaseService.batchUpdateGames(updates),
          'Batch update downstream games'
        );
      }

      // Return the updated games
      const updatedGames: Game[] = [];
      for (const update of updates) {
        try {
          const updatedGame = await this.executeWithRetry(
            () => this.firebaseService.getGame(update.gameId),
            `Get updated game ${update.gameId}`
          );
          updatedGames.push(updatedGame);
        } catch (error) {
          this.logError('Failed to retrieve updated game', error, {
            gameId: update.gameId,
          });
          // Continue with other games even if one fails to retrieve
        }
      }

      return updatedGames;
    } catch (error) {
      this.logError('Team advancement failed', error, {
        gameId: game.id,
        status: game.status,
        winnerFeedsIntoGame: game.winnerFeedsIntoGame,
        loserFeedsIntoGame: game.loserFeedsIntoGame,
      });
      throw error;
    }
  }

  /**
   * Handles cascade updates when a completed game changes
   * 
   * This method detects changes to completed games and propagates those changes
   * to downstream games. It handles:
   * 1. Winner changes - updates the downstream game with the new winner
   * 2. Loser changes - updates the downstream game with the new loser
   * 3. Status changes from COMPLETED to SCHEDULED - replaces teams with placeholders
   * 
   * @param gameId - The game that changed
   * @param oldGame - Previous game state
   * @param newGame - New game state
   * @returns Array of affected downstream games
   */
  async cascadeGameChanges(
    gameId: string,
    oldGame: Game,
    newGame: Game
  ): Promise<Game[]> {
    try {
      const updates: { gameId: string; data: UpdateGameData }[] = [];

      // Detect if status changed from COMPLETED to SCHEDULED
      const wasCompleted = oldGame.status === 'completed';
      const isNowScheduled = newGame.status === 'scheduled';

      if (wasCompleted && isNowScheduled) {
        // Replace teams in downstream games with placeholders
        await this.replaceTeamsWithPlaceholders(oldGame, updates);
      } else if (newGame.status === 'completed') {
        // Check if winner changed
        const oldWinner = oldGame.scoreA > oldGame.scoreB ? oldGame.teamA : oldGame.teamB;
        const newWinner = newGame.scoreA > newGame.scoreB ? newGame.teamA : newGame.teamB;
        const oldLoser = oldGame.scoreA > oldGame.scoreB ? oldGame.teamB : oldGame.teamA;
        const newLoser = newGame.scoreA > newGame.scoreB ? newGame.teamB : newGame.teamA;

        // Handle winner change
        if (oldWinner !== newWinner && newGame.winnerFeedsIntoGame) {
          try {
            await this.updateDownstreamTeam(
              newGame.winnerFeedsIntoGame,
              gameId,
              oldWinner,
              newWinner,
              newGame,
              true,
              updates
            );
          } catch (error) {
            this.logError('Failed to update winner in downstream game', error, {
              gameId,
              downstreamGameId: newGame.winnerFeedsIntoGame,
              oldWinner,
              newWinner,
            });
            throw error;
          }
        }

        // Handle loser change
        if (oldLoser !== newLoser && newGame.loserFeedsIntoGame) {
          try {
            await this.updateDownstreamTeam(
              newGame.loserFeedsIntoGame,
              gameId,
              oldLoser,
              newLoser,
              newGame,
              false,
              updates
            );
          } catch (error) {
            this.logError('Failed to update loser in downstream game', error, {
              gameId,
              downstreamGameId: newGame.loserFeedsIntoGame,
              oldLoser,
              newLoser,
            });
            throw error;
          }
        }
      }

      // Batch update all downstream games with retry logic
      if (updates.length > 0) {
        await this.executeWithRetry(
          () => this.firebaseService.batchUpdateGames(updates),
          'Batch cascade updates'
        );
      }

      // Return the updated games
      const updatedGames: Game[] = [];
      for (const update of updates) {
        try {
          const updatedGame = await this.executeWithRetry(
            () => this.firebaseService.getGame(update.gameId),
            `Get cascaded game ${update.gameId}`
          );
          updatedGames.push(updatedGame);
        } catch (error) {
          this.logError('Failed to retrieve cascaded game', error, {
            gameId: update.gameId,
          });
          // Continue with other games even if one fails to retrieve
        }
      }

      return updatedGames;
    } catch (error) {
      this.logError('Cascade changes failed', error, {
        gameId,
        oldStatus: oldGame.status,
        newStatus: newGame.status,
        oldScores: { scoreA: oldGame.scoreA, scoreB: oldGame.scoreB },
        newScores: { scoreA: newGame.scoreA, scoreB: newGame.scoreB },
      });
      throw error;
    }
  }

  /**
   * Replaces teams in downstream games with placeholder text
   * 
   * When a game status changes from COMPLETED to SCHEDULED, this method
   * replaces the team names in downstream games with appropriate placeholder
   * text like "Winner of [gameLabel]" or "Loser of [gameLabel]".
   * 
   * Also removes the downstream games from users' following lists since
   * the teams they were following are no longer in those games.
   * 
   * @param game - The game being reset
   * @param updates - Array to accumulate update operations
   */
  private async replaceTeamsWithPlaceholders(
    game: Game,
    updates: { gameId: string; data: UpdateGameData }[]
  ): Promise<void> {
    try {
      // Generate placeholder text based on game label
      const gameLabel = game.gameLabel || `Game ${game.id.substring(0, 8)}`;
      const downstreamGameIds: string[] = [];

      // Handle winner feeds into game
      if (game.winnerFeedsIntoGame) {
        try {
          const downstreamGame = await this.executeWithRetry(
            () => this.firebaseService.getGame(game.winnerFeedsIntoGame!),
            `Get winner downstream game for placeholder ${game.winnerFeedsIntoGame}`
          );
          
          downstreamGameIds.push(game.winnerFeedsIntoGame);
          
          const teamSlot = this.determineTeamSlot(downstreamGame, game.id);
          const placeholderText = `Winner of ${gameLabel}`;

          const updateData: UpdateGameData = {
            updatedAt: Timestamp.now(),
          };

          if (teamSlot === 'teamA') {
            updateData.teamA = placeholderText;
            updateData.teamAImageUrl = undefined;
          } else {
            updateData.teamB = placeholderText;
            updateData.teamBImageUrl = undefined;
          }

          updates.push({
            gameId: game.winnerFeedsIntoGame,
            data: updateData,
          });
        } catch (error) {
          this.logError('Failed to prepare winner placeholder', error, {
            gameId: game.id,
            winnerFeedsIntoGame: game.winnerFeedsIntoGame,
          });
          throw error;
        }
      }

      // Handle loser feeds into game
      if (game.loserFeedsIntoGame) {
        try {
          const downstreamGame = await this.executeWithRetry(
            () => this.firebaseService.getGame(game.loserFeedsIntoGame!),
            `Get loser downstream game for placeholder ${game.loserFeedsIntoGame}`
          );
          
          downstreamGameIds.push(game.loserFeedsIntoGame);
          
          const teamSlot = this.determineTeamSlot(downstreamGame, game.id);
          const placeholderText = `Loser of ${gameLabel}`;

          const updateData: UpdateGameData = {
            updatedAt: Timestamp.now(),
          };

          if (teamSlot === 'teamA') {
            updateData.teamA = placeholderText;
            updateData.teamAImageUrl = undefined;
          } else {
            updateData.teamB = placeholderText;
            updateData.teamBImageUrl = undefined;
          }

          updates.push({
            gameId: game.loserFeedsIntoGame,
            data: updateData,
          });
        } catch (error) {
          this.logError('Failed to prepare loser placeholder', error, {
            gameId: game.id,
            loserFeedsIntoGame: game.loserFeedsIntoGame,
          });
          throw error;
        }
      }

      // Remove downstream games from all users' following lists
      // since the teams they were following are no longer in those games
      if (downstreamGameIds.length > 0) {
        try {
          await this.unfollowGamesForAllUsers(downstreamGameIds);
        } catch (error) {
          // Log but don't fail the operation if unfollowing fails
          this.logError('Failed to unfollow users from downstream games', error, {
            gameId: game.id,
            downstreamGameIds,
          });
        }
      }
    } catch (error) {
      this.logError('Failed to replace teams with placeholders', error, {
        gameId: game.id,
      });
      throw error;
    }
  }

  /**
   * Removes games from all users' following lists
   * 
   * This is used when games are reset to placeholders and users should
   * no longer be following them based on the previous team names.
   * 
   * @param gameIds - Array of game IDs to unfollow
   */
  private async unfollowGamesForAllUsers(gameIds: string[]): Promise<void> {
    try {
      for (const gameId of gameIds) {
        await this.firebaseService.unfollowGameForAllUsers(gameId);
      }
    } catch (error) {
      this.logError('Failed to unfollow games for all users', error, {
        gameIds,
      });
      throw error;
    }
  }

  /**
   * Updates a downstream game with a new team name
   * 
   * Replaces the old team name with the new team name in the appropriate
   * team slot of the downstream game.
   * 
   * @param downstreamGameId - The game to update
   * @param sourceGameId - The game providing the team
   * @param oldTeamName - The team name to replace
   * @param newTeamName - The new team name
   * @param sourceGame - The source game (for image URLs)
   * @param isWinner - Whether this is the winner (true) or loser (false)
   * @param updates - Array to accumulate update operations
   */
  private async updateDownstreamTeam(
    downstreamGameId: string,
    sourceGameId: string,
    oldTeamName: string,
    newTeamName: string,
    sourceGame: Game,
    isWinner: boolean,
    updates: { gameId: string; data: UpdateGameData }[]
  ): Promise<void> {
    try {
      const downstreamGame = await this.executeWithRetry(
        () => this.firebaseService.getGame(downstreamGameId),
        `Get downstream game ${downstreamGameId}`
      );
      
      const teamSlot = this.determineTeamSlot(downstreamGame, sourceGameId);

      const updateData: UpdateGameData = {
        updatedAt: Timestamp.now(),
      };

      // Determine which team image to use
      let imageUrl: string | undefined;
      if (isWinner) {
        imageUrl = sourceGame.scoreA > sourceGame.scoreB 
          ? sourceGame.teamAImageUrl 
          : sourceGame.teamBImageUrl;
      } else {
        imageUrl = sourceGame.scoreA > sourceGame.scoreB 
          ? sourceGame.teamBImageUrl 
          : sourceGame.teamAImageUrl;
      }

      if (teamSlot === 'teamA') {
        updateData.teamA = newTeamName;
        if (imageUrl) {
          updateData.teamAImageUrl = imageUrl;
        } else {
          updateData.teamAImageUrl = undefined;
        }
      } else {
        updateData.teamB = newTeamName;
        if (imageUrl) {
          updateData.teamBImageUrl = imageUrl;
        } else {
          updateData.teamBImageUrl = undefined;
        }
      }

      updates.push({
        gameId: downstreamGameId,
        data: updateData,
      });
    } catch (error) {
      this.logError('Failed to update downstream team', error, {
        downstreamGameId,
        sourceGameId,
        oldTeamName,
        newTeamName,
        isWinner,
      });
      throw error;
    }
  }

  /**
   * Determines which team slot (teamA or teamB) should receive the advancing team
   * 
   * Uses the following logic:
   * 1. If bracketPosition is defined, use it to determine the slot
   * 2. Otherwise, use the order in dependsOnGames array
   * 3. First game in dependsOnGames feeds into teamA, second feeds into teamB
   * 
   * @param downstreamGame - The game receiving the team
   * @param sourceGameId - The game providing the team
   * @returns 'teamA' or 'teamB'
   */
  private determineTeamSlot(
    downstreamGame: Game,
    sourceGameId: string
  ): 'teamA' | 'teamB' {
    // If bracketPosition is defined, use it
    // Even positions (0, 2, 4...) go to teamA, odd positions (1, 3, 5...) go to teamB
    if (downstreamGame.bracketPosition !== undefined) {
      return downstreamGame.bracketPosition % 2 === 0 ? 'teamA' : 'teamB';
    }

    // Otherwise, use dependsOnGames array order
    if (downstreamGame.dependsOnGames && downstreamGame.dependsOnGames.length > 0) {
      const index = downstreamGame.dependsOnGames.indexOf(sourceGameId);
      if (index === 0) {
        return 'teamA';
      } else if (index === 1) {
        return 'teamB';
      }
    }

    // Default to teamA if we can't determine
    return 'teamA';
  }
}

// Export singleton instance
export const gameUpdateService = new GameUpdateService(
  require('../firebase').firebaseService
);
