import { Game } from '../types';

/**
 * Generates a human-readable label for a game based on its structure context
 * @param game - The game object
 * @param poolName - Optional pool name if not stored in game
 * @param bracketName - Optional bracket name if not stored in game
 * @returns A formatted label string or undefined if no structure context
 */
export const generateGameLabel = (
  game: Game,
  poolName?: string,
  bracketName?: string
): string | undefined => {
  // If game already has a label, return it
  if (game.gameLabel) {
    return game.gameLabel;
  }

  // Pool game label
  if (game.poolId) {
    const pool = poolName || 'Pool';
    const gameNum = game.poolGameNumber || '';
    return gameNum ? `${pool} Game ${gameNum}` : pool;
  }

  // Bracket game label
  if (game.bracketId && game.bracketRound) {
    const bracket = bracketName || 'Bracket';
    const round = formatBracketRound(game.bracketRound);
    return `${bracket} ${round}`;
  }

  // No structure context
  return undefined;
};

/**
 * Formats bracket round names into human-readable labels
 * @param round - The bracket round identifier
 * @returns A formatted round name
 */
export const formatBracketRound = (round: string): string => {
  // Handle common bracket round names
  const roundMap: Record<string, string> = {
    'finals': 'Finals',
    'final': 'Finals',
    'semifinals': 'Semifinals',
    'semifinal': 'Semifinals',
    'quarterfinals': 'Quarterfinals',
    'quarterfinal': 'Quarterfinals',
    'round-of-16': 'Round of 16',
    'round-of-32': 'Round of 32',
    'championship': 'Championship',
  };

  const lowerRound = round.toLowerCase();
  
  // Check if it's a known round name
  if (roundMap[lowerRound]) {
    return roundMap[lowerRound];
  }

  // Handle "Round 1", "Round 2", etc.
  if (lowerRound.startsWith('round')) {
    return round.charAt(0).toUpperCase() + round.slice(1);
  }

  // Default: capitalize first letter
  return round.charAt(0).toUpperCase() + round.slice(1);
};

/**
 * Checks if a team name is a placeholder (TBD, Winner of, etc.)
 * @param teamName - The team name to check
 * @returns True if the team name is a placeholder
 */
export const isPlaceholderTeam = (teamName: string): boolean => {
  if (!teamName) return true;
  
  const lowerName = teamName.toLowerCase().trim();
  
  return (
    lowerName === 'tbd' ||
    lowerName === 'to be determined' ||
    lowerName.startsWith('winner of') ||
    lowerName.startsWith('loser of') ||
    lowerName.startsWith('seed') ||
    lowerName === '' ||
    lowerName === '-'
  );
};

/**
 * Formats a team name for display, handling placeholders
 * @param teamName - The team name to format
 * @returns Formatted team name or "TBD" for placeholders
 */
export const formatTeamName = (teamName: string): string => {
  if (isPlaceholderTeam(teamName)) {
    return 'TBD';
  }
  return teamName;
};
