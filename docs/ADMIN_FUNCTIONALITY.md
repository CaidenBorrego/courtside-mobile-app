# Admin Functionality Overview

## Summary

The admin functionality has been simplified to focus on game management. Admins and scorekeepers can now easily update game details without the complexity of tournament creation.

## Key Changes

### 1. Simplified Admin Panel
- **Removed**: Tournament creation/editing/deletion functionality
- **Removed**: Bulk import functionality
- **Kept**: Tournament listing and navigation to game management
- **Added**: Support for both Admin and Scorekeeper roles

### 2. New Edit Game Screen
A dedicated screen for editing game details with the following capabilities:

#### Editable Fields:
- **Scores**: Update scoreA and scoreB for both teams
- **Status**: Change game status (Scheduled, In Progress, Completed, Cancelled)
- **Court**: Assign or update court information
- **Start Time**: Modify game start time
- **Dependencies**: Configure which games must complete before this game (admin only)

#### Validation Rules:
- Scores must be non-negative integers
- **Maximum 2 dependencies**: A game can only depend on a maximum of 2 other games
- Circular dependencies are prevented (games that depend on this game cannot be selected)

#### Access Control:
- **Admins**: Full access to all fields including dependencies
- **Scorekeepers**: Can edit scores, status, court, and time (no dependency management)

### 3. Game Detail Screen Enhancement
- Added "Edit Game" button for admins and scorekeepers
- Button appears alongside the "Follow Game" button
- Only visible to users with admin or scorekeeper roles

## Data Model

### Game Dependencies
The `Game` interface tracks dependencies using the `dependsOnGames` field:

```typescript
interface Game {
  // ... other fields
  dependsOnGames?: string[];  // Array of game IDs that must complete first
  winnerFeedsIntoGame?: string;  // Where the winner advances to
  loserFeedsIntoGame?: string;   // Where the loser advances to (consolation)
}
```

**Key Points:**
- Games track what feeds INTO them (`dependsOnGames`)
- Games also track where they feed into (`winnerFeedsIntoGame`, `loserFeedsIntoGame`)
- Maximum of 2 games can feed into any single game (enforced in UI)
- This supports bracket structures where winners/losers from two games meet in the next round

## User Roles

### Admin
- Full access to all admin functionality
- Can edit game dependencies
- Can manage all tournaments

### Scorekeeper
- Can update game scores and status
- Can modify game time and court
- Cannot edit game dependencies

### User
- No admin access
- Can only view and follow games

## Navigation Flow

1. **Admin Panel** → Lists all tournaments
2. **Select Tournament** → Navigate to ManageTournament screen
3. **Select Game** → Navigate to GameDetail screen
4. **Click "Edit Game"** → Navigate to EditGame screen
5. **Make Changes** → Save and return to GameDetail

## Technical Implementation

### New Files
- `src/screens/admin/EditGameScreen.tsx` - Game editing interface

### Modified Files
- `src/screens/admin/AdminPanelScreen.tsx` - Simplified to remove tournament CRUD
- `src/screens/game/GameDetailScreen.tsx` - Added edit button for admins/scorekeepers
- `src/types/index.ts` - Added EditGame route to navigation types
- `src/screens/admin/index.ts` - Export EditGameScreen

### API Methods Used
- `firebaseService.getGame(id)` - Fetch game details
- `firebaseService.updateGame(id, updates)` - Save game changes
- `firebaseService.getGamesByDivision(divisionId)` - Load available games for dependencies

## Future Enhancements

Potential improvements for future iterations:

1. **Batch Score Updates**: Update multiple game scores at once
2. **Quick Status Toggle**: One-tap status changes from game list
3. **Score History**: Track score changes over time
4. **Notifications**: Alert followers when scores are updated
5. **Offline Support**: Queue updates when offline and sync when online
6. **Dependency Visualization**: Show bracket structure graphically

## Testing

All existing tests pass with the new functionality:
- AdminPanelScreen tests updated for simplified interface
- GameDetailScreen tests updated to mock useNavigation
- 337 tests passing

## Security Considerations

- Role-based access control enforced at UI level
- Firestore security rules should also enforce role permissions
- Dependency validation prevents circular references
- Maximum dependency limit prevents complex/invalid bracket structures
