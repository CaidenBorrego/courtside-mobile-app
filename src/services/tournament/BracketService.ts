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
  Bracket,
  Game,
  BracketSeed,
  CreateBracketData,
  UpdateBracketData,
  GameStatus,
  PoolStanding,
} from '../../types';
import { poolService } from './PoolService';

/**
 * Service for managing bracket tournament functionality including:
 * - Bracket creation and management
 * - Single-elimination game generation
 * - Winner advancement logic
 * - Seeding from pool results
 */
export class BracketService {
  private readonly bracketsCollection = collection(db, 'brackets');
  private readonly gamesCollection = collection(db, 'games');

  /**
   * Create a new bracket and optionally generate bracket games
   * Requirements: 2.2, 2.3, 9.2
   * 
   * @param divisionId - The division this bracket belongs to
   * @param tournamentId - The tournament this bracket belongs to
   * @param name - Name of the bracket (e.g., "Gold Bracket", "Championship")
   * @param size - Bracket size (4, 8, 16, or 32 teams)
   * @param seedingSource - How teams are seeded ('manual', 'pools', or 'mixed')
   * @returns The created bracket with its ID
   */
  async createBracket(
    divisionId: string,
    tournamentId: string,
    name: string,
    size: 4 | 8 | 16 | 32,
    seedingSource: 'manual' | 'pools' | 'mixed' = 'manual'
  ): Promise<Bracket> {
    try {
      // Validate bracket size
      if (![4, 8, 16, 32].includes(size)) {
        throw new Error('Bracket size must be 4, 8, 16, or 32');
      }

      // Initialize empty seeds
      const seeds: BracketSeed[] = [];
      for (let i = 1; i <= size; i++) {
        seeds.push({
          position: i,
          teamName: undefined,
          sourcePoolId: undefined,
          sourcePoolRank: undefined,
        });
      }

      // Create bracket data
      const bracketData: CreateBracketData = {
        divisionId,
        tournamentId,
        name,
        size,
        seedingSource,
        seeds,
        createdAt: Timestamp.now(),
      };

      // Create bracket document
      const docRef = await addDoc(this.bracketsCollection, bracketData);

      const bracket: Bracket = {
        id: docRef.id,
        ...bracketData,
        updatedAt: Timestamp.now(),
      };

      return bracket;
    } catch (error) {
      console.error('Error creating bracket:', error);
      throw error instanceof Error ? error : new Error('Failed to create bracket');
    }
  }

  /**
   * Generate all bracket games with proper structure and dependencies
   * Requirements: 2.2, 2.3, 9.2
   * 
   * Creates a single-elimination bracket structure where:
   * - Each round has half the games of the previous round
   * - Winners advance to the next round
   * - Game dependencies are properly set up
   * 
   * @param bracketId - The bracket to generate games for
   * @returns Array of created game IDs
   */
  async generateBracketGames(bracketId: string): Promise<string[]> {
    try {
      // Fetch bracket data
      const bracketDoc = await getDoc(doc(this.bracketsCollection, bracketId));
      if (!bracketDoc.exists()) {
        throw new Error('Bracket not found');
      }

      const bracket = { id: bracketDoc.id, ...bracketDoc.data() } as Bracket;

      // Calculate number of rounds
      const numRounds = Math.log2(bracket.size);
      if (!Number.isInteger(numRounds)) {
        throw new Error('Invalid bracket size');
      }

      // Generate games for each round
      const batch = writeBatch(db);
      const gameIds: string[] = [];
      const gamesByRound: Map<number, string[]> = new Map();

      // Start from the first round (most games) and work towards finals
      for (let round = 1; round <= numRounds; round++) {
        const gamesInRound = bracket.size / Math.pow(2, round);
        const roundGames: string[] = [];

        for (let position = 0; position < gamesInRound; position++) {
          const gameRef = doc(this.gamesCollection);
          gameIds.push(gameRef.id);
          roundGames.push(gameRef.id);

          // Determine teams for first round based on seeds
          let teamA: string | undefined;
          let teamB: string | undefined;
          let dependsOnGames: string[] | undefined;

          if (round === 1) {
            // First round: assign teams from seeds using standard bracket pairing
            const seedA = position * 2 + 1;
            const seedB = position * 2 + 2;
            teamA = bracket.seeds[seedA - 1]?.teamName || '';
            teamB = bracket.seeds[seedB - 1]?.teamName || '';
          } else {
            // Later rounds: teams come from previous round winners
            const prevRoundGames = gamesByRound.get(round - 1) || [];
            const game1Index = position * 2;
            const game2Index = position * 2 + 1;
            
            if (game1Index < prevRoundGames.length && game2Index < prevRoundGames.length) {
              dependsOnGames = [
                prevRoundGames[game1Index],
                prevRoundGames[game2Index],
              ];
            }
            
            teamA = '';
            teamB = '';
          }

          // Determine round name
          const roundName = this.getRoundName(round, numRounds);

          // Determine which game this feeds into
          let feedsIntoGame: string | undefined;
          if (round < numRounds) {
            // Will be set after we create the next round's games
            feedsIntoGame = undefined;
          }

          batch.set(gameRef, {
            tournamentId: bracket.tournamentId,
            divisionId: bracket.divisionId,
            teamA: teamA || '',
            teamB: teamB || '',
            scoreA: 0,
            scoreB: 0,
            startTime: Timestamp.now(), // Default to now, admin will schedule later
            locationId: '', // To be assigned by admin
            court: '',
            status: GameStatus.SCHEDULED,
            bracketId: bracket.id,
            bracketRound: roundName,
            bracketPosition: position + 1,
            dependsOnGames: dependsOnGames || [],
            feedsIntoGame: feedsIntoGame,
            gameLabel: `${bracket.name} ${roundName} Game ${position + 1}`,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }

        gamesByRound.set(round, roundGames);
      }

      // Now update feedsIntoGame for all games except finals
      for (let round = 1; round < numRounds; round++) {
        const currentRoundGames = gamesByRound.get(round) || [];
        const nextRoundGames = gamesByRound.get(round + 1) || [];

        currentRoundGames.forEach((gameId, index) => {
          const nextGameIndex = Math.floor(index / 2);
          if (nextGameIndex < nextRoundGames.length) {
            const gameRef = doc(this.gamesCollection, gameId);
            batch.update(gameRef, {
              feedsIntoGame: nextRoundGames[nextGameIndex],
            });
          }
        });
      }

      await batch.commit();

      return gameIds;
    } catch (error) {
      console.error('Error generating bracket games:', error);
      throw error instanceof Error ? error : new Error('Failed to generate bracket games');
    }
  }

  /**
   * Get human-readable round name based on round number and total rounds
   * Requirements: 2.3, 8.4, 9.3
   * 
   * @param round - Current round number (1-based)
   * @param totalRounds - Total number of rounds in bracket
   * @returns Round name (e.g., "Finals", "Semifinals", "Quarterfinals", "Round 1")
   */
  private getRoundName(round: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - round;
    
    switch (roundsFromEnd) {
      case 0:
        return 'Finals';
      case 1:
        return 'Semifinals';
      case 2:
        return 'Quarterfinals';
      default:
        return `Round ${round}`;
    }
  }

  /**
   * Advance the winner of a bracket game to the next round
   * Requirements: 2.4, 3.5
   * 
   * When a bracket game is completed, this method:
   * 1. Determines the winner
   * 2. Finds the next game in the bracket
   * 3. Updates the next game with the winning team
   * 
   * @param gameId - The completed game ID
   * @param winnerTeam - The name of the winning team
   */
  async advanceWinner(gameId: string, winnerTeam: string): Promise<void> {
    try {
      // Fetch the completed game
      const gameDoc = await getDoc(doc(this.gamesCollection, gameId));
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const game = { id: gameDoc.id, ...gameDoc.data() } as Game;

      // Validate this is a bracket game
      if (!game.bracketId) {
        throw new Error('Game is not part of a bracket');
      }

      // Validate game is completed
      if (game.status !== GameStatus.COMPLETED) {
        throw new Error('Game must be completed before advancing winner');
      }

      // Validate winner is one of the teams
      if (game.teamA !== winnerTeam && game.teamB !== winnerTeam) {
        throw new Error('Winner must be one of the teams in the game');
      }

      // Check if there's a next game to advance to
      if (!game.feedsIntoGame) {
        // This is the finals - no advancement needed
        console.log('Game is finals - no advancement needed');
        return;
      }

      // Fetch the next game
      const nextGameDoc = await getDoc(doc(this.gamesCollection, game.feedsIntoGame));
      if (!nextGameDoc.exists()) {
        throw new Error('Next game not found');
      }

      const nextGame = { id: nextGameDoc.id, ...nextGameDoc.data() } as Game;

      // Determine which position in the next game this winner goes to
      // The winner goes to teamA if this is the first dependency, teamB if second
      const dependsOnGames = nextGame.dependsOnGames || [];
      const positionIndex = dependsOnGames.indexOf(gameId);

      if (positionIndex === -1) {
        throw new Error('Game dependency mismatch');
      }

      // Update the next game with the winner
      const updates: Partial<Game> = {
        updatedAt: Timestamp.now(),
      };

      if (positionIndex === 0) {
        updates.teamA = winnerTeam;
      } else if (positionIndex === 1) {
        updates.teamB = winnerTeam;
      }

      await updateDoc(doc(this.gamesCollection, game.feedsIntoGame), updates);

      console.log(`Advanced ${winnerTeam} to next game: ${game.feedsIntoGame}`);
    } catch (error) {
      console.error('Error advancing winner:', error);
      throw error instanceof Error ? error : new Error('Failed to advance winner');
    }
  }

  /**
   * Seed a bracket from pool play results
   * Requirements: 3.4, 3.5
   * 
   * This method:
   * 1. Calculates final standings for specified pools
   * 2. Maps top teams from pools to bracket seeds
   * 3. Updates bracket seed configuration
   * 4. Updates first-round bracket games with seeded teams
   * 
   * Standard seeding order for multiple pools:
   * - Pool winners get top seeds (1, 2, 3, ...)
   * - Pool runners-up get next seeds
   * - And so on
   * 
   * @param bracketId - The bracket to seed
   * @param poolIds - Array of pool IDs to seed from
   */
  async seedBracketFromPools(bracketId: string, poolIds: string[]): Promise<void> {
    try {
      // Fetch bracket
      const bracketDoc = await getDoc(doc(this.bracketsCollection, bracketId));
      if (!bracketDoc.exists()) {
        throw new Error('Bracket not found');
      }

      const bracket = { id: bracketDoc.id, ...bracketDoc.data() } as Bracket;

      // Fetch standings for all pools
      const allStandings: PoolStanding[] = [];
      
      for (const poolId of poolIds) {
        const standings = await poolService.calculateStandings(poolId);
        allStandings.push(...standings);
      }

      // Group standings by rank
      const standingsByRank = new Map<number, PoolStanding[]>();
      allStandings.forEach(standing => {
        const rank = standing.poolRank;
        if (!standingsByRank.has(rank)) {
          standingsByRank.set(rank, []);
        }
        standingsByRank.get(rank)!.push(standing);
      });

      // Build seeding order: all rank 1s, then all rank 2s, etc.
      const seedingOrder: PoolStanding[] = [];
      const maxRank = Math.max(...allStandings.map(s => s.poolRank));
      
      for (let rank = 1; rank <= maxRank; rank++) {
        const teamsAtRank = standingsByRank.get(rank) || [];
        // Sort teams at same rank by point differential
        teamsAtRank.sort((a, b) => b.pointDifferential - a.pointDifferential);
        seedingOrder.push(...teamsAtRank);
      }

      // Validate we have enough teams
      if (seedingOrder.length > bracket.size) {
        throw new Error(`Too many teams (${seedingOrder.length}) for bracket size (${bracket.size})`);
      }

      // Update bracket seeds
      const updatedSeeds: BracketSeed[] = bracket.seeds.map((seed, index) => {
        if (index < seedingOrder.length) {
          const standing = seedingOrder[index];
          return {
            position: seed.position,
            teamName: standing.teamName,
            sourcePoolId: standing.poolId,
            sourcePoolRank: standing.poolRank,
          };
        }
        return seed;
      });

      // Update bracket document
      await updateDoc(doc(this.bracketsCollection, bracketId), {
        seeds: updatedSeeds,
        updatedAt: Timestamp.now(),
      });

      // Update first-round bracket games with seeded teams
      await this.updateBracketGamesWithSeeds(bracketId, updatedSeeds);

      console.log(`Successfully seeded bracket ${bracketId} from ${poolIds.length} pools`);
    } catch (error) {
      console.error('Error seeding bracket from pools:', error);
      throw error instanceof Error ? error : new Error('Failed to seed bracket from pools');
    }
  }

  /**
   * Update first-round bracket games with seeded teams
   * 
   * @param bracketId - The bracket ID
   * @param seeds - Array of bracket seeds with team assignments
   */
  private async updateBracketGamesWithSeeds(
    bracketId: string,
    seeds: BracketSeed[]
  ): Promise<void> {
    try {
      // Fetch all first-round games for this bracket
      const q = query(
        this.gamesCollection,
        where('bracketId', '==', bracketId),
        where('bracketRound', '==', 'Round 1')
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Try other possible first round names
        const altQuery = query(
          this.gamesCollection,
          where('bracketId', '==', bracketId)
        );
        const altSnapshot = await getDocs(altQuery);
        
        // Find games with no dependsOnGames (first round)
        const firstRoundGames = altSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Game))
          .filter(game => !game.dependsOnGames || game.dependsOnGames.length === 0)
          .sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));

        if (firstRoundGames.length === 0) {
          throw new Error('No first-round games found for bracket');
        }

        // Update games with seeded teams
        const batch = writeBatch(db);

        firstRoundGames.forEach((game, index) => {
          const seedA = index * 2;
          const seedB = index * 2 + 1;

          const teamA = seeds[seedA]?.teamName || '';
          const teamB = seeds[seedB]?.teamName || '';

          const gameRef = doc(this.gamesCollection, game.id);
          batch.update(gameRef, {
            teamA,
            teamB,
            updatedAt: Timestamp.now(),
          });
        });

        await batch.commit();
        return;
      }

      // Sort games by bracket position
      const games = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Game))
        .sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));

      // Update games with seeded teams using standard bracket pairing
      const batch = writeBatch(db);

      games.forEach((game, index) => {
        // Standard bracket pairing: seed 1 vs seed N, seed 2 vs seed N-1, etc.
        const seedA = index * 2;
        const seedB = index * 2 + 1;

        const teamA = seeds[seedA]?.teamName || '';
        const teamB = seeds[seedB]?.teamName || '';

        const gameRef = doc(this.gamesCollection, game.id);
        batch.update(gameRef, {
          teamA,
          teamB,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating bracket games with seeds:', error);
      throw error instanceof Error ? error : new Error('Failed to update bracket games');
    }
  }

  /**
   * Get a bracket by ID
   * 
   * @param bracketId - The bracket ID
   * @returns The bracket data
   */
  async getBracket(bracketId: string): Promise<Bracket> {
    try {
      const bracketDoc = await getDoc(doc(this.bracketsCollection, bracketId));
      if (!bracketDoc.exists()) {
        throw new Error('Bracket not found');
      }

      return { id: bracketDoc.id, ...bracketDoc.data() } as Bracket;
    } catch (error) {
      console.error('Error fetching bracket:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch bracket');
    }
  }

  /**
   * Get all brackets for a division
   * 
   * @param divisionId - The division ID
   * @returns Array of brackets
   */
  async getBracketsByDivision(divisionId: string): Promise<Bracket[]> {
    try {
      const q = query(
        this.bracketsCollection,
        where('divisionId', '==', divisionId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Bracket));
    } catch (error) {
      console.error('Error fetching brackets by division:', error);
      throw new Error('Failed to fetch brackets');
    }
  }

  /**
   * Get all games for a specific bracket
   * 
   * @param bracketId - The bracket ID
   * @returns Array of games in the bracket
   */
  async getGamesByBracket(bracketId: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('bracketId', '==', bracketId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Game));
    } catch (error) {
      console.error('Error fetching games by bracket:', error);
      throw new Error('Failed to fetch bracket games');
    }
  }

  /**
   * Get games for a specific bracket round
   * 
   * @param bracketId - The bracket ID
   * @param round - The round name (e.g., "Finals", "Semifinals")
   * @returns Array of games in the specified round
   */
  async getGamesByBracketRound(bracketId: string, round: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('bracketId', '==', bracketId),
        where('bracketRound', '==', round)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Game));
    } catch (error) {
      console.error('Error fetching games by bracket round:', error);
      throw new Error('Failed to fetch bracket round games');
    }
  }

  /**
   * Update bracket metadata (name, seeding source)
   * 
   * @param bracketId - The bracket ID
   * @param updates - Fields to update
   */
  async updateBracket(bracketId: string, updates: UpdateBracketData): Promise<void> {
    try {
      const bracketRef = doc(this.bracketsCollection, bracketId);
      await updateDoc(bracketRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating bracket:', error);
      throw error instanceof Error ? error : new Error('Failed to update bracket');
    }
  }

  /**
   * Delete a bracket and all associated games
   * 
   * @param bracketId - The bracket ID to delete
   */
  async deleteBracket(bracketId: string): Promise<void> {
    try {
      // Get all games for this bracket
      const games = await this.getGamesByBracket(bracketId);

      // Check if any games have been completed
      const hasCompletedGames = games.some(
        game => game.status === GameStatus.COMPLETED
      );

      if (hasCompletedGames) {
        throw new Error('Cannot delete bracket: some games have already been completed');
      }

      // Delete bracket and all its games in a batch
      const batch = writeBatch(db);

      // Delete all games
      games.forEach(game => {
        const gameRef = doc(this.gamesCollection, game.id);
        batch.delete(gameRef);
      });

      // Delete bracket
      const bracketRef = doc(this.bracketsCollection, bracketId);
      batch.delete(bracketRef);

      await batch.commit();
    } catch (error) {
      console.error('Error deleting bracket:', error);
      throw error instanceof Error ? error : new Error('Failed to delete bracket');
    }
  }

  /**
   * Get the current state of a bracket including all games organized by round
   * 
   * @param bracketId - The bracket ID
   * @returns Bracket state with games organized by round
   */
  async getBracketState(bracketId: string): Promise<{
    bracket: Bracket;
    gamesByRound: Map<string, Game[]>;
  }> {
    try {
      const bracket = await this.getBracket(bracketId);
      const games = await this.getGamesByBracket(bracketId);

      // Organize games by round
      const gamesByRound = new Map<string, Game[]>();
      
      games.forEach(game => {
        const round = game.bracketRound || 'Unknown';
        if (!gamesByRound.has(round)) {
          gamesByRound.set(round, []);
        }
        gamesByRound.get(round)!.push(game);
      });

      // Sort games within each round by position
      gamesByRound.forEach(roundGames => {
        roundGames.sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));
      });

      return {
        bracket,
        gamesByRound,
      };
    } catch (error) {
      console.error('Error getting bracket state:', error);
      throw error instanceof Error ? error : new Error('Failed to get bracket state');
    }
  }
}

// Export singleton instance
export const bracketService = new BracketService();
