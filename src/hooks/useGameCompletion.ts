import { useEffect, useRef } from 'react';
import { Game, GameStatus } from '../types';
import { bracketService } from '../services/tournament/BracketService';
import { tournamentStructureService } from '../services/tournament/TournamentStructureService';
import { firebaseService } from '../services/firebase';
import { userProfileService } from '../services/user';
import NotificationService from '../services/notifications/NotificationService';
import { teamStatsService } from '../services/tournament/TeamStatsService';
import { poolService } from '../services/tournament/PoolService';

/**
 * Hook to handle automatic bracket advancement and pool completion detection
 * Requirements: 2.4, 3.3, 3.5, 7.5, 6.1
 * 
 * This hook monitors game status changes and:
 * 1. Automatically advances winners in bracket games when completed
 * 2. Checks for pool completion and triggers advancement to brackets
 * 3. Sends notifications to followers of advancing teams
 * 4. Invalidates cached standings when games complete (Requirement 6.1)
 */
export const useGameCompletion = (game: Game | null) => {
  const processedGamesRef = useRef<Set<string>>(new Set());
  const checkedDivisionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!game) return;

    // Only process completed games
    if (game.status !== GameStatus.COMPLETED) {
      return;
    }

    // Prevent processing the same game multiple times
    if (processedGamesRef.current.has(game.id)) {
      return;
    }

    // Mark this game as processed
    processedGamesRef.current.add(game.id);

    // Invalidate cached standings when game completes (Requirement 6.1)
    invalidateGameCaches(game);

    // Handle bracket game advancement
    if (game.bracketId) {
      handleBracketGameCompletion(game, processedGamesRef);
    }

    // Handle pool game completion - check if all pools are complete
    if (game.poolId) {
      handlePoolGameCompletion(game, checkedDivisionsRef);
    }
  }, [game?.id, game?.status, game?.scoreA, game?.scoreB]);
};

/**
 * Invalidate cached standings when a game completes
 * Requirements: 6.1
 */
async function invalidateGameCaches(game: Game): Promise<void> {
  try {
    // Invalidate division standings
    await teamStatsService.invalidateDivisionCache(game.divisionId);

    // Invalidate pool standings if this is a pool game
    if (game.poolId) {
      await poolService.invalidatePoolCache(game.poolId);
    }

    // Invalidate team stats for both teams
    await teamStatsService.invalidateTeamCache(game.teamA, game.divisionId);
    await teamStatsService.invalidateTeamCache(game.teamB, game.divisionId);

    console.log(`Invalidated caches for game ${game.id}`);
  } catch (error) {
    console.error('Error invalidating game caches:', error);
    // Don't throw - cache invalidation failure shouldn't break game completion
  }
}

/**
 * Handle completion of a bracket game
 * Requirements: 2.4, 3.5, 7.5
 */
async function handleBracketGameCompletion(
  game: Game,
  processedGamesRef: React.MutableRefObject<Set<string>>
): Promise<void> {
  try {
    // Determine the winner
    const winner = game.scoreA > game.scoreB ? game.teamA : game.teamB;

    // Check if winner is valid (not empty)
    if (!winner || winner.trim() === '') {
      console.warn('Game completed but no valid winner found:', game.id);
      return;
    }

    // Advance the winner to the next round
    await bracketService.advanceWinner(game.id, winner);
    console.log(`Successfully advanced ${winner} from game ${game.id}`);

    // Send notifications to followers of the winning team
    await sendAdvancementNotifications(winner, game);
  } catch (error) {
    console.error('Error advancing winner:', error);
    // Remove from processed set on error so it can be retried
    processedGamesRef.current.delete(game.id);
  }
}

/**
 * Handle completion of a pool game - check if all pools are complete
 * Requirements: 3.3, 3.4, 3.5
 */
async function handlePoolGameCompletion(
  game: Game,
  checkedDivisionsRef: React.MutableRefObject<Set<string>>
): Promise<void> {
  try {
    const divisionId = game.divisionId;

    // Debounce: only check once per division within a short time window
    if (checkedDivisionsRef.current.has(divisionId)) {
      return;
    }

    // Mark division as checked
    checkedDivisionsRef.current.add(divisionId);

    // Clear the check flag after a delay to allow future checks
    setTimeout(() => {
      checkedDivisionsRef.current.delete(divisionId);
    }, 5000); // 5 second debounce

    console.log(`Checking pool completion for division ${divisionId}`);

    // Check if all pools in this division are complete
    const poolsComplete = await tournamentStructureService.arePoolsComplete(divisionId);

    if (poolsComplete) {
      console.log(`All pools complete for division ${divisionId}`);
      
      // Trigger automatic seeding
      await triggerAutomaticSeeding(divisionId);
    } else {
      console.log(`Pools not yet complete for division ${divisionId}`);
    }
  } catch (error) {
    console.error('Error checking pool completion:', error);
  }
}

/**
 * Trigger automatic seeding from pools to brackets
 * Requirements: 3.4, 3.5
 */
async function triggerAutomaticSeeding(divisionId: string): Promise<void> {
  try {
    console.log(`Triggering automatic seeding for division ${divisionId}`);

    // Get tournament format to check if there are brackets to seed
    const format = await tournamentStructureService.getTournamentFormat(divisionId);

    if (!format.hasBrackets) {
      console.log('No brackets configured for this division - skipping seeding');
      return;
    }

    if (!format.hasPoolPlay) {
      console.log('No pools configured for this division - skipping seeding');
      return;
    }

    // Advance pools to brackets
    await tournamentStructureService.advancePoolsToBrackets(divisionId);

    console.log(`Successfully seeded ${format.bracketCount} bracket(s) from ${format.poolCount} pool(s)`);

    // NOTIFICATIONS TEMPORARILY DISABLED
    // Send notification to admins about seeding completion
    // const notificationService = NotificationService.getInstance();
    // await notificationService.sendPoolCompletionNotification(
    //   'Division',
    //   format.poolCount,
    //   format.bracketCount
    // );

    console.log('Pool completion notification disabled');
  } catch (error) {
    console.error('Error triggering automatic seeding:', error);
    // Don't throw - we don't want to break the game completion flow
  }
};

/**
 * Send notifications to followers when a team advances
 * Requirements: 7.5
 */
async function sendAdvancementNotifications(teamName: string, game: Game): Promise<void> {
  try {
    // Get the bracket to determine round names
    if (!game.bracketId || !game.bracketRound) {
      return;
    }

    const bracket = await firebaseService.getBracket(game.bracketId);
    
    // Determine the next round name
    const nextRound = getNextRoundName(game.bracketRound);
    
    if (!nextRound) {
      // This was the finals - team won the bracket
      console.log(`${teamName} won the ${bracket.name}!`);
      return;
    }

    // NOTIFICATIONS TEMPORARILY DISABLED
    // Send local notification for advancement
    // const notificationService = NotificationService.getInstance();
    // await notificationService.sendTeamAdvancementNotification(
    //   teamName,
    //   game.bracketRound,
    //   nextRound,
    //   bracket.name
    // );

    console.log(`Advancement notification disabled for ${teamName}`);
  } catch (error) {
    console.error('Error sending advancement notifications:', error);
  }
}

/**
 * Determine the next round name based on current round
 */
function getNextRoundName(currentRound: string): string | null {
  const roundOrder = ['Round 1', 'Round 2', 'Round 3', 'Quarterfinals', 'Semifinals', 'Finals'];
  
  const currentIndex = roundOrder.indexOf(currentRound);
  
  if (currentIndex === -1) {
    // Try to find by partial match
    if (currentRound.includes('Round')) {
      const roundNum = parseInt(currentRound.replace('Round ', ''));
      if (!isNaN(roundNum)) {
        return `Round ${roundNum + 1}`;
      }
    }
    return null;
  }
  
  if (currentIndex === roundOrder.length - 1) {
    // Already at finals
    return null;
  }
  
  return roundOrder[currentIndex + 1];
}
