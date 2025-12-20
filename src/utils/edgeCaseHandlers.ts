import { PoolStanding, Game, GameStatus, BracketSeed } from '../types';

/**
 * Edge case handlers for tournament operations
 * Requirements: 4.4, 6.2
 */

/**
 * Tiebreaker rules for pool standings
 */
export enum TiebreakerRule {
  POINT_DIFFERENTIAL = 'point_differential',
  POINTS_FOR = 'points_for',
  HEAD_TO_HEAD = 'head_to_head',
  RANDOM = 'random',
}

/**
 * Tied pool standings resolver
 * Requirements: 6.2
 */
export class TiedStandingsResolver {
  /**
   * Resolve ties in pool standings using multiple tiebreaker rules
   * 
   * Default tiebreaker order:
   * 1. Wins (already sorted)
   * 2. Point differential
   * 3. Points for
   * 4. Head-to-head record (if applicable)
   * 5. Random (stable sort by team name)
   */
  static resolveTies(
    standings: PoolStanding[],
    games: Game[],
    tiebreakerRules: TiebreakerRule[] = [
      TiebreakerRule.POINT_DIFFERENTIAL,
      TiebreakerRule.POINTS_FOR,
      TiebreakerRule.HEAD_TO_HEAD,
      TiebreakerRule.RANDOM,
    ]
  ): PoolStanding[] {
    // Group standings by wins
    const standingsByWins = new Map<number, PoolStanding[]>();
    standings.forEach(standing => {
      if (!standingsByWins.has(standing.wins)) {
        standingsByWins.set(standing.wins, []);
      }
      standingsByWins.get(standing.wins)!.push(standing);
    });

    // Resolve ties within each win group
    const resolvedStandings: PoolStanding[] = [];
    const winCounts = Array.from(standingsByWins.keys()).sort((a, b) => b - a);

    winCounts.forEach(wins => {
      const tiedTeams = standingsByWins.get(wins)!;
      
      if (tiedTeams.length === 1) {
        resolvedStandings.push(tiedTeams[0]);
      } else {
        // Apply tiebreaker rules
        const resolved = this.applyTiebreakers(tiedTeams, games, tiebreakerRules);
        resolvedStandings.push(...resolved);
      }
    });

    // Update ranks
    resolvedStandings.forEach((standing, index) => {
      standing.poolRank = index + 1;
    });

    return resolvedStandings;
  }

  /**
   * Apply tiebreaker rules to a group of tied teams
   */
  private static applyTiebreakers(
    tiedTeams: PoolStanding[],
    games: Game[],
    rules: TiebreakerRule[]
  ): PoolStanding[] {
    let sorted = [...tiedTeams];

    for (const rule of rules) {
      if (this.isFullyResolved(sorted)) {
        break;
      }

      switch (rule) {
        case TiebreakerRule.POINT_DIFFERENTIAL:
          sorted = this.sortByPointDifferential(sorted);
          break;
        case TiebreakerRule.POINTS_FOR:
          sorted = this.sortByPointsFor(sorted);
          break;
        case TiebreakerRule.HEAD_TO_HEAD:
          sorted = this.sortByHeadToHead(sorted, games);
          break;
        case TiebreakerRule.RANDOM:
          sorted = this.sortByTeamName(sorted);
          break;
      }
    }

    return sorted;
  }

  /**
   * Check if all teams are fully resolved (no ties)
   */
  private static isFullyResolved(standings: PoolStanding[]): boolean {
    for (let i = 0; i < standings.length - 1; i++) {
      if (this.areTeamsTied(standings[i], standings[i + 1])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if two teams are tied based on current criteria
   */
  private static areTeamsTied(team1: PoolStanding, team2: PoolStanding): boolean {
    return (
      team1.wins === team2.wins &&
      team1.pointDifferential === team2.pointDifferential &&
      team1.pointsFor === team2.pointsFor
    );
  }

  /**
   * Sort by point differential (descending)
   */
  private static sortByPointDifferential(standings: PoolStanding[]): PoolStanding[] {
    return [...standings].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.pointDifferential - a.pointDifferential;
    });
  }

  /**
   * Sort by points for (descending)
   */
  private static sortByPointsFor(standings: PoolStanding[]): PoolStanding[] {
    return [...standings].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.pointDifferential !== b.pointDifferential) {
        return b.pointDifferential - a.pointDifferential;
      }
      return b.pointsFor - a.pointsFor;
    });
  }

  /**
   * Sort by head-to-head record
   * Only applicable for 2-team ties
   */
  private static sortByHeadToHead(
    standings: PoolStanding[],
    games: Game[]
  ): PoolStanding[] {
    if (standings.length !== 2) {
      return standings; // Head-to-head only works for 2 teams
    }

    const team1 = standings[0].teamName;
    const team2 = standings[1].teamName;

    // Find head-to-head game
    const h2hGame = games.find(
      game =>
        game.status === GameStatus.COMPLETED &&
        ((game.teamA === team1 && game.teamB === team2) ||
          (game.teamA === team2 && game.teamB === team1))
    );

    if (!h2hGame) {
      return standings; // No head-to-head game found
    }

    // Determine winner
    let winner: string;
    if (h2hGame.teamA === team1) {
      winner = h2hGame.scoreA > h2hGame.scoreB ? team1 : team2;
    } else {
      winner = h2hGame.scoreB > h2hGame.scoreA ? team1 : team2;
    }

    // Sort with winner first
    return standings.sort((a, b) => {
      if (a.teamName === winner) return -1;
      if (b.teamName === winner) return 1;
      return 0;
    });
  }

  /**
   * Sort by team name (alphabetically) as final tiebreaker
   */
  private static sortByTeamName(standings: PoolStanding[]): PoolStanding[] {
    return [...standings].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.pointDifferential !== b.pointDifferential) {
        return b.pointDifferential - a.pointDifferential;
      }
      if (a.pointsFor !== b.pointsFor) {
        return b.pointsFor - a.pointsFor;
      }
      return a.teamName.localeCompare(b.teamName);
    });
  }

  /**
   * Get description of how ties were resolved
   */
  static getTiebreakerDescription(
    team1: PoolStanding,
    team2: PoolStanding,
    games: Game[]
  ): string {
    if (team1.wins !== team2.wins) {
      return `${team1.teamName} has more wins`;
    }

    if (team1.pointDifferential !== team2.pointDifferential) {
      return `${team1.teamName} has better point differential (${team1.pointDifferential} vs ${team2.pointDifferential})`;
    }

    if (team1.pointsFor !== team2.pointsFor) {
      return `${team1.teamName} scored more points (${team1.pointsFor} vs ${team2.pointsFor})`;
    }

    // Check head-to-head
    const h2hGame = games.find(
      game =>
        game.status === GameStatus.COMPLETED &&
        ((game.teamA === team1.teamName && game.teamB === team2.teamName) ||
          (game.teamA === team2.teamName && game.teamB === team1.teamName))
    );

    if (h2hGame) {
      return `${team1.teamName} won head-to-head matchup`;
    }

    return `Tied - resolved alphabetically`;
  }
}

/**
 * Incomplete bracket seeding handler
 * Requirements: 4.4
 */
export class IncompleteBracketHandler {
  /**
   * Fill incomplete bracket seeds with placeholder teams
   * Creates "BYE" entries for empty positions
   */
  static fillIncompleteSeeds(
    seeds: BracketSeed[],
    bracketSize: number
  ): BracketSeed[] {
    const filledSeeds: BracketSeed[] = [];

    for (let i = 1; i <= bracketSize; i++) {
      const existingSeed = seeds.find(s => s.position === i);
      
      if (existingSeed && existingSeed.teamName) {
        filledSeeds.push(existingSeed);
      } else {
        // Create BYE seed
        filledSeeds.push({
          position: i,
          teamName: undefined,
          sourcePoolId: undefined,
          sourcePoolRank: undefined,
        });
      }
    }

    return filledSeeds;
  }

  /**
   * Check if bracket has enough teams to start
   * Requires at least 2 teams
   */
  static canStartBracket(seeds: BracketSeed[]): boolean {
    const seededCount = seeds.filter(s => s.teamName).length;
    return seededCount >= 2;
  }

  /**
   * Get list of empty seed positions
   */
  static getEmptyPositions(seeds: BracketSeed[]): number[] {
    return seeds
      .filter(s => !s.teamName)
      .map(s => s.position)
      .sort((a, b) => a - b);
  }

  /**
   * Suggest optimal seeding for partial brackets
   * Places teams in positions that minimize byes in early rounds
   */
  static suggestOptimalSeeding(
    teamNames: string[],
    bracketSize: number
  ): BracketSeed[] {
    const seeds: BracketSeed[] = [];
    
    // Standard bracket positions that minimize early-round byes
    // For example, in an 8-team bracket with 5 teams:
    // Positions 1, 2, 3, 4, 5 are better than 1, 2, 3, 6, 7
    const optimalPositions = this.getOptimalPositions(teamNames.length, bracketSize);

    teamNames.forEach((teamName, index) => {
      seeds.push({
        position: optimalPositions[index],
        teamName,
        sourcePoolId: undefined,
        sourcePoolRank: undefined,
      });
    });

    // Fill remaining positions with empty seeds
    for (let i = 1; i <= bracketSize; i++) {
      if (!seeds.find(s => s.position === i)) {
        seeds.push({
          position: i,
          teamName: undefined,
          sourcePoolId: undefined,
          sourcePoolRank: undefined,
        });
      }
    }

    return seeds.sort((a, b) => a.position - b.position);
  }

  /**
   * Get optimal seed positions for a given number of teams
   */
  private static getOptimalPositions(teamCount: number, bracketSize: number): number[] {
    // For simplicity, use sequential positions
    // In a real implementation, this could be more sophisticated
    const positions: number[] = [];
    for (let i = 1; i <= teamCount && i <= bracketSize; i++) {
      positions.push(i);
    }
    return positions;
  }

  /**
   * Get warning message for incomplete bracket
   */
  static getIncompleteWarning(seeds: BracketSeed[], bracketSize: number): string {
    const emptyCount = seeds.filter(s => !s.teamName).length;
    const seededCount = bracketSize - emptyCount;

    if (emptyCount === 0) {
      return '';
    }

    if (seededCount < 2) {
      return `Bracket needs at least 2 teams to start. Currently has ${seededCount}.`;
    }

    return `${emptyCount} seed position(s) are empty. These will result in byes (automatic advancement).`;
  }
}

/**
 * Game deletion with dependencies handler
 * Requirements: 4.4
 */
export class GameDeletionHandler {
  /**
   * Get all games that would be affected by deleting a game
   */
  static getAffectedGames(gameId: string, allGames: Game[]): {
    directDependents: Game[];
    indirectDependents: Game[];
    totalAffected: number;
  } {
    const directDependents = allGames.filter(g =>
      g.dependsOnGames?.includes(gameId)
    );

    const indirectDependents: Game[] = [];
    const visited = new Set<string>();

    const findIndirectDependents = (currentGameId: string) => {
      if (visited.has(currentGameId)) return;
      visited.add(currentGameId);

      const dependents = allGames.filter(g =>
        g.dependsOnGames?.includes(currentGameId)
      );

      dependents.forEach(dependent => {
        if (!directDependents.find(d => d.id === dependent.id)) {
          indirectDependents.push(dependent);
        }
        findIndirectDependents(dependent.id);
      });
    };

    directDependents.forEach(dep => findIndirectDependents(dep.id));

    return {
      directDependents,
      indirectDependents,
      totalAffected: directDependents.length + indirectDependents.length,
    };
  }

  /**
   * Get cascade deletion plan
   * Returns list of games that must be deleted in order
   */
  static getCascadeDeletionPlan(gameId: string, allGames: Game[]): Game[] {
    const toDelete: Game[] = [];
    const visited = new Set<string>();

    const collectDependents = (currentGameId: string) => {
      if (visited.has(currentGameId)) return;
      visited.add(currentGameId);

      const dependents = allGames.filter(g =>
        g.dependsOnGames?.includes(currentGameId)
      );

      dependents.forEach(dependent => {
        collectDependents(dependent.id);
        if (!toDelete.find(g => g.id === dependent.id)) {
          toDelete.push(dependent);
        }
      });
    };

    collectDependents(gameId);

    // Add the original game at the end
    const originalGame = allGames.find(g => g.id === gameId);
    if (originalGame) {
      toDelete.push(originalGame);
    }

    return toDelete;
  }

  /**
   * Check if game can be safely deleted
   */
  static canSafelyDelete(game: Game, allGames: Game[]): {
    canDelete: boolean;
    reason?: string;
    affectedCount: number;
  } {
    const affected = this.getAffectedGames(game.id, allGames);

    if (affected.totalAffected === 0) {
      return {
        canDelete: true,
        affectedCount: 0,
      };
    }

    // Check if any affected games are completed
    const completedAffected = [
      ...affected.directDependents,
      ...affected.indirectDependents,
    ].filter(g => g.status === GameStatus.COMPLETED);

    if (completedAffected.length > 0) {
      return {
        canDelete: false,
        reason: `Cannot delete: ${completedAffected.length} dependent game(s) have been completed`,
        affectedCount: affected.totalAffected,
      };
    }

    return {
      canDelete: true,
      affectedCount: affected.totalAffected,
    };
  }

  /**
   * Get deletion warning message
   */
  static getDeletionWarning(game: Game, allGames: Game[]): string {
    const affected = this.getAffectedGames(game.id, allGames);

    if (affected.totalAffected === 0) {
      if (game.status === GameStatus.COMPLETED) {
        return 'This game has been completed. Deleting it will affect standings and statistics.';
      }
      return '';
    }

    let warning = `Deleting this game will affect ${affected.totalAffected} other game(s):\n\n`;

    if (affected.directDependents.length > 0) {
      warning += `Direct dependents (${affected.directDependents.length}):\n`;
      affected.directDependents.forEach(g => {
        warning += `• ${g.gameLabel || g.id}\n`;
      });
    }

    if (affected.indirectDependents.length > 0) {
      warning += `\nIndirect dependents (${affected.indirectDependents.length}):\n`;
      affected.indirectDependents.forEach(g => {
        warning += `• ${g.gameLabel || g.id}\n`;
      });
    }

    warning += '\nAll dependent games will need to be updated or deleted.';

    return warning;
  }

  /**
   * Reset dependent games after deletion
   * Clears team assignments and resets status
   */
  static resetDependentGames(gameId: string, allGames: Game[]): Partial<Game>[] {
    const affected = this.getAffectedGames(gameId, allGames);
    const updates: Partial<Game>[] = [];

    [...affected.directDependents, ...affected.indirectDependents].forEach(game => {
      // Determine which team slot to clear
      const dependsOnIndex = game.dependsOnGames?.indexOf(gameId) ?? -1;
      
      const update: Partial<Game> = {
        id: game.id,
      };

      if (dependsOnIndex === 0) {
        update.teamA = '';
      } else if (dependsOnIndex === 1) {
        update.teamB = '';
      }

      // Reset status if game hasn't started
      if (game.status === GameStatus.SCHEDULED) {
        update.status = GameStatus.SCHEDULED;
      }

      updates.push(update);
    });

    return updates;
  }
}
