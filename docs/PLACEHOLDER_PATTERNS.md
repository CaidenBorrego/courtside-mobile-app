# Placeholder Team Name Patterns

This document describes the patterns recognized as placeholder team names in the CourtSide app.

## Overview

Placeholder team names are used when teams haven't been determined yet, such as in bracket games where teams advance based on previous game results. The app prevents score entry for games with placeholder teams.

## Recognized Patterns

The `isPlaceholderTeam()` function in `src/utils/gameLabels.ts` recognizes the following patterns:

### 1. Explicit Placeholders
- `TBD`
- `To Be Determined`
- Empty string (`""`)
- Dash (`"-"`)

### 2. Winner/Loser References
- `Winner of Game 1`
- `Loser of Game 2`
- `Winner Game 1` (without "of")
- `Loser Game 2` (without "of")

### 3. Pool Position References
- `1st Pool A`
- `2nd Pool B`
- `3rd Pool C`
- Any pattern matching: `{ordinal} Pool {name}`

### 4. Seed References
- `Seed 1`
- `Seed 2`
- Any pattern starting with "seed"

### 5. Short Codes (L/W + Number)
- `L1`, `L2`, `L3`, `L4` (Loser 1, Loser 2, etc.)
- `W1`, `W2`, `W3`, `W4` (Winner 1, Winner 2, etc.)
- Case insensitive: `l1`, `w1` also work

## Usage in Tournament Structures

### Bracket Games
```typescript
{
  teamA: "Winner of Round 1 Game 1",
  teamB: "Winner of Round 1 Game 2",
  // Scores cannot be entered until teams are determined
}
```

### Pool-Seeded Brackets
```typescript
{
  teamA: "1st Pool A",
  teamB: "2nd Pool B",
  // Teams determined from pool standings
}
```

### Consolation/Losers Brackets
```typescript
{
  teamA: "Loser Round 1 Game 1",
  teamB: "Loser Round 1 Game 2",
  // Losers from main bracket feed into consolation
}
```

## Implementation Details

### Detection Function
Located in: `src/utils/gameLabels.ts`

```typescript
export const isPlaceholderTeam = (teamName: string): boolean => {
  if (!teamName) return true;
  
  const lowerName = teamName.toLowerCase().trim();
  
  return (
    lowerName === 'tbd' ||
    lowerName === 'to be determined' ||
    lowerName.startsWith('winner') ||
    lowerName.startsWith('loser') ||
    lowerName.startsWith('seed') ||
    lowerName.match(/^\d+(st|nd|rd|th)\s+pool/i) !== null ||
    lowerName.match(/^[lw]\d+$/i) !== null ||
    lowerName === '' ||
    lowerName === '-'
  );
};
```

### Validation
The `GameUpdateService` uses this function to:
1. Prevent score entry for games with placeholder teams
2. Prevent status changes (except to CANCELLED) for placeholder games
3. Show warnings in the UI when editing placeholder games

### UI Behavior
- Edit Game screen shows a warning banner for placeholder games
- Score inputs are disabled when placeholders are detected
- Status buttons (except CANCELLED) are disabled for placeholder games

## Testing

Tests are located in: `src/utils/__tests__/gameLabels.test.ts`

Run tests with:
```bash
npm test -- gameLabels.test.ts
```

## Examples from Seed Data

### Hays HS Christmas Classic - ELITE 8 Bracket
This tournament demonstrates placeholder usage:

**Round 1 Games** (Real teams):
- Veterans Memorial vs Ellison
- Antonian vs HCSA
- Harker Heights vs Weiss
- Liberty Christian vs Round Rock

**Quarterfinals** (Placeholders):
- Winner Game 1 vs Winner Game 2
- Winner Game 3 vs Winner Game 4

**Losers Pool** (Placeholders):
- Loser Round 1 Game 1 vs Loser Round 1 Game 2
- Loser Round 1 Game 3 vs Loser Round 1 Game 4

## Best Practices

1. **Use descriptive placeholders**: `"Winner of Semifinals Game 1"` is better than `"W1"`
2. **Include game labels**: Reference the game label when possible for clarity
3. **Consistent formatting**: Use the same pattern throughout a tournament
4. **Automatic replacement**: The system automatically replaces placeholders when source games complete
