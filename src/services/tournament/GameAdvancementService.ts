/**
 * Service for managing game advancement in tournament structures
 * Handles winner and loser advancement with validation
 */

import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Game, GameStatus } from '../../types';

export class GameAdvancementService {
  private readonly gamesCollection = 'games';

  /**
   * Advance winner and/or loser from a completed game to their next games
   * Requirements: Support for single-elimination, double-elimination, and consolation brackets
   * 
   * @param gameId - The completed game ID
   * @param winnerTeam - The name of the winning team
   * @param loserTeam - The name of the losing team
   * @throws Error if validation fails or game structure is invalid
   */
  async advanceTeams(gameId: string, winnerTeam: string, loserTeam: string): Promise<void> {
    try {
      // Fetch the completed game
      const gameDoc = await getDoc(doc(db, this.gamesCollection, gameId));
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const game = { id: gameDoc.id, ...gameDoc.data() } as Game;

      // Validate game is completed
      if (game.status !== GameStatus.COMPLETED) {
        throw new Error('Game must be completed before advancing teams');
      }

      // Validate winner and loser are the teams in the game
      const teams = [game.teamA, game.teamB];
      if (!teams.includes(winnerTeam) || !teams.includes(loserTeam)) {
        throw new Error('Winner and loser must be teams from this game');
      }

      if (winnerTeam === loserTeam) {
        throw new Error('Winner and loser cannot be the same team');
      }

      // Advance winner if there's a next game
      const winnerGameId = game.winnerFeedsIntoGame || game.feedsIntoGame; // Support legacy field
      if (winnerGameId) {
        await this.advanceTeamToGame(winnerGameId, winnerTeam, gameId, 'winner');
      }

      // Advance loser if there's a consolation/loser bracket game
      if (game.loserFeedsIntoGame) {
        await this.advanceTeamToGame(game.loserFeedsIntoGame, loserTeam, gameId, 'loser');
      }

      console.log(`Advanced teams from game ${gameId}: Winner ${winnerTeam}, Loser ${loserTeam}`);
    } catch (error) {
      console.error('Error advancing teams:', error);
      throw error instanceof Error ? error : new Error('Failed to advance teams');
    }
  }

  /**
   * Advance a team to a specific game
   * 
   * @param targetGameId - The game to advance the team to
   * @param teamName - The team to advance
   * @param sourceGameId - The game the team is advancing from
   * @param advancementType - Whether this is a winner or loser advancement
   */
  private async advanceTeamToGame(
    targetGameId: string,
    teamName: string,
    sourceGameId: string,
    advancementType: 'winner' | 'loser'
  ): Promise<void> {
    // Fetch the target game
    const targetGameDoc = await getDoc(doc(db, this.gamesCollection, targetGameId));
    if (!targetGameDoc.exists()) {
      throw new Error(`Target game ${targetGameId} not found`);
    }

    const targetGame = { id: targetGameDoc.id, ...targetGameDoc.data() } as Game;

    // Validate the target game structure
    await this.validateGameFeeds(targetGame, sourceGameId);

    // Determine which position the team goes to
    const dependsOnGames = targetGame.dependsOnGames || [];
    const positionIndex = dependsOnGames.indexOf(sourceGameId);

    if (positionIndex === -1) {
      throw new Error(`Game ${sourceGameId} is not a dependency of game ${targetGameId}`);
    }

    // Update the target game with the advancing team
    const updates: Partial<Game> = {
      updatedAt: Timestamp.now(),
    };

    if (positionIndex === 0) {
      updates.teamA = teamName;
    } else if (positionIndex === 1) {
      updates.teamB = teamName;
    } else {
      throw new Error(`Invalid position index ${positionIndex} for game advancement`);
    }

    await updateDoc(doc(db, this.gamesCollection, targetGameId), updates);

    console.log(`Advanced ${advancementType} ${teamName} to game ${targetGameId} at position ${positionIndex === 0 ? 'A' : 'B'}`);
  }

  /**
   * Validate that a game doesn't have more than 2 games feeding into it
   * Requirements: Ensure tournament structure integrity
   * 
   * @param game - The game to validate
   * @param sourceGameId - The game that is feeding into this game
   * @throws Error if validation fails
   */
  private async validateGameFeeds(game: Game, sourceGameId: string): Promise<void> {
    const dependsOnGames = game.dependsOnGames || [];

    // Check that the game doesn't have more than 2 dependencies
    if (dependsOnGames.length > 2) {
      throw new Error(
        `Game ${game.id} has ${dependsOnGames.length} dependencies. Maximum allowed is 2.`
      );
    }

    // Check that the source game is in the dependencies
    if (!dependsOnGames.includes(sourceGameId)) {
      throw new Error(
        `Game ${sourceGameId} is not listed as a dependency of game ${game.id}`
      );
    }

    // Validate that both team slots aren't already filled
    if (game.teamA && game.teamB && game.teamA !== '' && game.teamB !== '') {
      console.warn(
        `Game ${game.id} already has both teams assigned. This may overwrite existing data.`
      );
    }
  }

  /**
   * Get the winner and loser from a completed game
   * 
   * @param game - The completed game
   * @returns Object with winner and loser team names
   * @throws Error if game is not completed or scores are tied
   */
  getWinnerAndLoser(game: Game): { winner: string; loser: string } {
    if (game.status !== GameStatus.COMPLETED) {
      throw new Error('Game must be completed to determine winner and loser');
    }

    if (game.scoreA === game.scoreB) {
      throw new Error('Cannot determine winner from tied game');
    }

    if (game.scoreA > game.scoreB) {
      return { winner: game.teamA, loser: game.teamB };
    } else {
      return { winner: game.teamB, loser: game.teamA };
    }
  }

  /**
   * Automatically advance teams when a game is completed
   * This can be called as a hook when updating a game's status to completed
   * 
   * @param gameId - The game that was just completed
   */
  async autoAdvanceTeams(gameId: string): Promise<void> {
    try {
      const gameDoc = await getDoc(doc(db, this.gamesCollection, gameId));
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const game = { id: gameDoc.id, ...gameDoc.data() } as Game;

      // Only auto-advance if the game has advancement configured
      const hasWinnerAdvancement = game.winnerFeedsIntoGame || game.feedsIntoGame;
      const hasLoserAdvancement = game.loserFeedsIntoGame;

      if (!hasWinnerAdvancement && !hasLoserAdvancement) {
        console.log(`Game ${gameId} has no advancement configured. Skipping auto-advance.`);
        return;
      }

      // Get winner and loser
      const { winner, loser } = this.getWinnerAndLoser(game);

      // Advance teams
      await this.advanceTeams(gameId, winner, loser);
    } catch (error) {
      console.error('Error in auto-advance:', error);
      // Don't throw - auto-advance failures shouldn't block game completion
    }
  }

  /**
   * Set up game dependencies for fine-grained tournament creation
   * This allows admins to specify which games feed into a new game and whether
   * they provide the winner or loser
   * 
   * @param targetGameId - The game being created/updated
   * @param sourceGames - Array of source game configurations
   * @returns Updated game data with dependencies set
   * 
   * @example
   * // Consolation finals: takes losers from both semifinals
   * await setupGameDependencies('consolation-finals', [
   *   { gameId: 'semi1', takesWinner: false },  // Takes loser
   *   { gameId: 'semi2', takesWinner: false }   // Takes loser
   * ]);
   * 
   * @example
   * // Championship finals: takes winners from both semifinals
   * await setupGameDependencies('champ-finals', [
   *   { gameId: 'semi1', takesWinner: true },   // Takes winner
   *   { gameId: 'semi2', takesWinner: true }    // Takes winner
   * ]);
   */
  async setupGameDependencies(
    targetGameId: string,
    sourceGames: Array<{ gameId: string; takesWinner: boolean }>
  ): Promise<void> {
    try {
      // Validate maximum 2 source games
      if (sourceGames.length > 2) {
        throw new Error(
          `Cannot set up more than 2 source games. Provided: ${sourceGames.length}`
        );
      }

      if (sourceGames.length === 0) {
        throw new Error('Must provide at least one source game');
      }

      // Fetch target game to validate it exists
      const targetGameDoc = await getDoc(doc(db, this.gamesCollection, targetGameId));
      if (!targetGameDoc.exists()) {
        throw new Error(`Target game ${targetGameId} not found`);
      }

      // Validate all source games exist
      for (const source of sourceGames) {
        const sourceGameDoc = await getDoc(doc(db, this.gamesCollection, source.gameId));
        if (!sourceGameDoc.exists()) {
          throw new Error(`Source game ${source.gameId} not found`);
        }
      }

      // Update target game with dependencies
      const dependsOnGames = sourceGames.map(s => s.gameId);
      await updateDoc(doc(db, this.gamesCollection, targetGameId), {
        dependsOnGames,
        updatedAt: Timestamp.now(),
      });

      // Update source games with their advancement targets
      for (const source of sourceGames) {
        const updates: Partial<Game> = {
          updatedAt: Timestamp.now(),
        };

        if (source.takesWinner) {
          updates.winnerFeedsIntoGame = targetGameId;
        } else {
          updates.loserFeedsIntoGame = targetGameId;
        }

        await updateDoc(doc(db, this.gamesCollection, source.gameId), updates);
      }

      console.log(
        `Set up dependencies for game ${targetGameId} from ${sourceGames.length} source games`
      );
    } catch (error) {
      console.error('Error setting up game dependencies:', error);
      throw error instanceof Error ? error : new Error('Failed to set up game dependencies');
    }
  }

  /**
   * Remove game dependencies and advancement links
   * Useful for restructuring tournaments or fixing mistakes
   * 
   * @param gameId - The game to remove dependencies from
   */
  async removeGameDependencies(gameId: string): Promise<void> {
    try {
      const gameDoc = await getDoc(doc(db, this.gamesCollection, gameId));
      if (!gameDoc.exists()) {
        throw new Error(`Game ${gameId} not found`);
      }

      const game = { id: gameDoc.id, ...gameDoc.data() } as Game;

      // Remove this game from source games' advancement fields
      if (game.dependsOnGames) {
        for (const sourceGameId of game.dependsOnGames) {
          const sourceGameDoc = await getDoc(doc(db, this.gamesCollection, sourceGameId));
          if (sourceGameDoc.exists()) {
            const sourceGame = { id: sourceGameDoc.id, ...sourceGameDoc.data() } as Game;
            const updates: Partial<Game> = {
              updatedAt: Timestamp.now(),
            };

            // Remove advancement links that point to this game
            if (sourceGame.winnerFeedsIntoGame === gameId) {
              updates.winnerFeedsIntoGame = undefined;
            }
            if (sourceGame.loserFeedsIntoGame === gameId) {
              updates.loserFeedsIntoGame = undefined;
            }
            if (sourceGame.feedsIntoGame === gameId) {
              updates.feedsIntoGame = undefined;
            }

            await updateDoc(doc(db, this.gamesCollection, sourceGameId), updates);
          }
        }
      }

      // Clear dependencies from target game
      await updateDoc(doc(db, this.gamesCollection, gameId), {
        dependsOnGames: [],
        teamA: '',
        teamB: '',
        updatedAt: Timestamp.now(),
      });

      console.log(`Removed dependencies from game ${gameId}`);
    } catch (error) {
      console.error('Error removing game dependencies:', error);
      throw error instanceof Error ? error : new Error('Failed to remove game dependencies');
    }
  }
}

// Export singleton instance
export const gameAdvancementService = new GameAdvancementService();
