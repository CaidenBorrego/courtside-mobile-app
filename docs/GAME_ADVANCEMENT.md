# Game Advancement System

This document explains how to use the game advancement system for tournament structures including single-elimination, double-elimination, and consolation brackets.

## Overview

The `GameAdvancementService` provides functionality to automatically advance winners and losers from completed games to their next games in the tournament structure.

## Key Features

- ✅ **Winner Advancement**: Automatically advance winners to the next round
- ✅ **Loser Advancement**: Support for consolation brackets and double-elimination
- ✅ **Validation**: Ensures games don't have more than 2 games feeding into them
- ✅ **Automatic Advancement**: Can be triggered automatically when a game is completed
- ✅ **Backward Compatible**: Supports legacy `feedsIntoGame` field

## Game Structure Fields

### New Fields

```typescript
interface Game {
  // ... other fields
  
  // Advancement fields
  winnerFeedsIntoGame?: string;  // Game ID where winner advances
  loserFeedsIntoGame?: string;   // Game ID where loser advances
  dependsOnGames?: string[];     // Array of game IDs that feed into this game
  
  // Legacy field (still supported)
  feedsIntoGame?: string;         // DEPRECATED: Use winnerFeedsIntoGame
}
```

### Field Descriptions

- **winnerFeedsIntoGame**: The ID of the game that the winner of this game advances to
- **loserFeedsIntoGame**: The ID of the game that the loser of this game advances to (for consolation/double-elimination)
- **dependsOnGames**: Array of up to 2 game IDs that must complete before this game can start
- **feedsIntoGame**: Legacy field, equivalent to `winnerFeedsIntoGame`

## Usage Examples

### Example 1: Admin - Set Up Game Dependencies (Fine-Grained Control)

```typescript
import { gameAdvancementService } from '../services/tournament';

// Create a consolation finals that takes losers from both semifinals
await gameAdvancementService.setupGameDependencies('consolation-finals', [
  { gameId: 'semi1', takesWinner: false },  // Takes loser from semi1
  { gameId: 'semi2', takesWinner: false }   // Takes loser from semi2
]);

// Create championship finals that takes winners from both semifinals
await gameAdvancementService.setupGameDependencies('champ-finals', [
  { gameId: 'semi1', takesWinner: true },   // Takes winner from semi1
  { gameId: 'semi2', takesWinner: true }    // Takes winner from semi2
]);

// Create a mixed game (winner from one, loser from another)
await gameAdvancementService.setupGameDependencies('mixed-game', [
  { gameId: 'game1', takesWinner: true },   // Takes winner
  { gameId: 'game2', takesWinner: false }   // Takes loser
]);
```

### Example 2: Admin - Remove Game Dependencies

```typescript
import { gameAdvancementService } from '../services/tournament';

// Remove all dependencies from a game (useful for restructuring)
await gameAdvancementService.removeGameDependencies(gameId);
```

### Example 3: Single-Elimination Bracket

```typescript
import { gameAdvancementService } from '../services/tournament';

// When a game is completed, automatically advance the winner
await gameAdvancementService.autoAdvanceTeams(gameId);
```

### Example 4: Manual Winner/Loser Advancement

```typescript
import { gameAdvancementService } from '../services/tournament';

// Manually specify winner and loser
const winnerTeam = 'Team Alpha';
const loserTeam = 'Team Beta';

await gameAdvancementService.advanceTeams(gameId, winnerTeam, loserTeam);
```

### Example 5: Get Winner and Loser from Game

```typescript
import { gameAdvancementService } from '../services/tournament';

// Get winner and loser from a completed game
const { winner, loser } = gameAdvancementService.getWinnerAndLoser(game);
console.log(`Winner: ${winner}, Loser: ${loser}`);
```

## Tournament Structure Examples

### Single-Elimination Bracket

```typescript
// Semifinals Game 1
{
  id: 'semi1',
  teamA: 'Team A',
  teamB: 'Team B',
  winnerFeedsIntoGame: 'finals',  // Winner goes to finals
  dependsOnGames: ['qf1', 'qf2']  // Depends on quarterfinals
}

// Finals
{
  id: 'finals',
  teamA: '',  // Will be filled by semi1 winner
  teamB: '',  // Will be filled by semi2 winner
  dependsOnGames: ['semi1', 'semi2']
}
```

### Double-Elimination Bracket

```typescript
// Winners Bracket Semifinals
{
  id: 'wb-semi1',
  teamA: 'Team A',
  teamB: 'Team B',
  winnerFeedsIntoGame: 'wb-finals',    // Winner to winners bracket finals
  loserFeedsIntoGame: 'lb-semi1',      // Loser to losers bracket
  dependsOnGames: ['wb-qf1', 'wb-qf2']
}

// Losers Bracket Semifinals
{
  id: 'lb-semi1',
  teamA: '',  // Filled by wb-semi1 loser
  teamB: '',  // Filled by wb-semi2 loser
  winnerFeedsIntoGame: 'lb-finals',
  dependsOnGames: ['wb-semi1', 'wb-semi2']
}
```

### Consolation Bracket

```typescript
// Championship Semifinals
{
  id: 'champ-semi1',
  teamA: 'Team A',
  teamB: 'Team B',
  winnerFeedsIntoGame: 'champ-finals',     // Winner to championship
  loserFeedsIntoGame: 'consolation-finals', // Loser to consolation
  dependsOnGames: ['champ-qf1', 'champ-qf2']
}

// Consolation Finals (3rd place game)
{
  id: 'consolation-finals',
  teamA: '',  // Filled by champ-semi1 loser
  teamB: '',  // Filled by champ-semi2 loser
  dependsOnGames: ['champ-semi1', 'champ-semi2']
}
```

## Validation Rules

### Maximum Dependencies

- ✅ A game can have **at most 2 games** feeding into it
- ❌ More than 2 dependencies will throw an error

```typescript
// VALID
{
  dependsOnGames: ['game1', 'game2']  // ✅ 2 dependencies
}

// INVALID
{
  dependsOnGames: ['game1', 'game2', 'game3']  // ❌ 3 dependencies - ERROR!
}
```

### Team Validation

- Winner and loser must be teams from the completed game
- Winner and loser cannot be the same team
- Game must be in COMPLETED status

### Dependency Validation

- Source game must be listed in target game's `dependsOnGames` array
- Position in `dependsOnGames` determines team slot (0 = teamA, 1 = teamB)

## Integration with Game Completion

### Option 1: Automatic Advancement

Call `autoAdvanceTeams` when marking a game as completed:

```typescript
// Update game status to completed
await firebaseService.updateGame(gameId, {
  status: GameStatus.COMPLETED,
  scoreA: 75,
  scoreB: 68
});

// Automatically advance teams
await gameAdvancementService.autoAdvanceTeams(gameId);
```

### Option 2: Manual Control

For more control, manually specify winner and loser:

```typescript
const game = await firebaseService.getGame(gameId);
const { winner, loser } = gameAdvancementService.getWinnerAndLoser(game);

await gameAdvancementService.advanceTeams(gameId, winner, loser);
```

## Error Handling

The service throws errors for invalid operations:

```typescript
try {
  await gameAdvancementService.advanceTeams(gameId, winner, loser);
} catch (error) {
  if (error.message.includes('Maximum allowed is 2')) {
    // Handle too many dependencies
  } else if (error.message.includes('must be completed')) {
    // Handle incomplete game
  } else {
    // Handle other errors
  }
}
```

## Common Error Messages

- `"Game must be completed before advancing teams"` - Game status is not COMPLETED
- `"Winner and loser must be teams from this game"` - Invalid team names provided
- `"Game X has Y dependencies. Maximum allowed is 2."` - Too many games feeding into target
- `"Game X is not a dependency of game Y"` - Invalid game structure
- `"Cannot determine winner from tied game"` - Scores are equal

## Admin Workflow for Creating Complex Tournaments

### Step 1: Create All Games

First, create all the games in your tournament structure:

```typescript
// Create semifinals
const semi1Id = await firebaseService.createGame({
  tournamentId,
  divisionId,
  teamA: 'Team A',
  teamB: 'Team B',
  // ... other fields
});

const semi2Id = await firebaseService.createGame({
  tournamentId,
  divisionId,
  teamA: 'Team C',
  teamB: 'Team D',
  // ... other fields
});
```

### Step 2: Create Dependent Games

Create games that will receive teams from other games:

```typescript
// Create championship finals (empty teams - will be filled by winners)
const champFinalsId = await firebaseService.createGame({
  tournamentId,
  divisionId,
  teamA: '',  // Will be filled by semi1 winner
  teamB: '',  // Will be filled by semi2 winner
  // ... other fields
});

// Create consolation finals (empty teams - will be filled by losers)
const consolationFinalsId = await firebaseService.createGame({
  tournamentId,
  divisionId,
  teamA: '',  // Will be filled by semi1 loser
  teamB: '',  // Will be filled by semi2 loser
  // ... other fields
});
```

### Step 3: Link Games with Dependencies

Use `setupGameDependencies` to link the games:

```typescript
// Set up championship finals to take winners
await gameAdvancementService.setupGameDependencies(champFinalsId, [
  { gameId: semi1Id, takesWinner: true },
  { gameId: semi2Id, takesWinner: true }
]);

// Set up consolation finals to take losers
await gameAdvancementService.setupGameDependencies(consolationFinalsId, [
  { gameId: semi1Id, takesWinner: false },
  { gameId: semi2Id, takesWinner: false }
]);
```

### Step 4: Games Complete and Advance Automatically

When semifinals complete, teams automatically advance:

```typescript
// When semi1 completes, winner goes to champ finals, loser to consolation
await gameAdvancementService.autoAdvanceTeams(semi1Id);

// When semi2 completes, winner goes to champ finals, loser to consolation
await gameAdvancementService.autoAdvanceTeams(semi2Id);
```

## Best Practices

1. **Set up dependencies first**: Ensure `dependsOnGames` is set correctly before games complete
2. **Use winnerFeedsIntoGame**: Prefer the new field over legacy `feedsIntoGame`
3. **Validate structure**: Use validation before tournament starts
4. **Handle ties**: Implement tiebreaker logic before calling advancement
5. **Test advancement**: Test the full tournament flow before going live
6. **Use setupGameDependencies**: For admin tools, use this method for fine-grained control
7. **Maximum 2 sources**: Remember each game can only have 2 games feeding into it

## Migration from Legacy System

If you're using the old `feedsIntoGame` field:

```typescript
// OLD (still works)
{
  feedsIntoGame: 'next-game-id'
}

// NEW (recommended)
{
  winnerFeedsIntoGame: 'next-game-id',
  loserFeedsIntoGame: 'consolation-game-id'  // Optional
}
```

The service supports both for backward compatibility.

## Future Enhancements

Potential future additions:
- Swiss system support
- Round-robin advancement
- Custom advancement rules
- Automatic bracket generation with advancement
- Advancement preview/simulation

## Support

For issues or questions about game advancement:
- Check error messages for specific validation failures
- Review tournament structure in Firebase Console
- Verify `dependsOnGames` arrays are correct
- Ensure game IDs match between fields

## Related Documentation

- [Pools and Brackets Admin Guide](./POOLS_AND_BRACKETS_ADMIN_GUIDE.md)
- [Bracket-Only Tournament Example](./examples/BRACKET_ONLY_TOURNAMENT_EXAMPLE.md)
- [Hybrid Tournament Example](./examples/HYBRID_TOURNAMENT_EXAMPLE.md)
