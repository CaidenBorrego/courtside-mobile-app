# Orphaned Games Cleanup

## Problem
When games are deleted from the database, users who were following those games may have orphaned game IDs in their `followingGames` array. This causes "game not found" errors when the app tries to load those games.

## Solution
We've implemented automatic cleanup that removes orphaned game references from user profiles:

### 1. Automatic Cleanup (Implemented)
The app now automatically detects and removes orphaned game references in two places:

#### ProfileScreen
- When loading followed games, the app checks which games still exist
- If orphaned games are detected, they're automatically cleaned up in the background
- This happens silently without blocking the UI

#### Pull-to-Refresh
- When users pull to refresh their profile, orphaned games are cleaned up
- The profile is then refreshed to show the updated following list

### 2. UserProfileService Method
A new method `cleanupOrphanedGames()` has been added to `UserProfileService`:

```typescript
async cleanupOrphanedGames(uid: string): Promise<{ removed: number; remaining: number }>
```

This method:
- Checks each game in the user's `followingGames` array
- Removes game IDs that no longer exist in the database
- Returns the count of removed and remaining games

### 3. One-Time Cleanup Script
For existing users with orphaned references, run the cleanup script:

```bash
cd courtside-mobile-app
npx ts-node scripts/cleanup-orphaned-games.ts
```

This script:
- Processes all users in the database
- Checks each followed game to see if it still exists
- Removes orphaned game references
- Provides a summary of cleaned up data

## Prevention
The `deleteGame()` method in `FirebaseService` already removes the game from all users' `followingGames` arrays when a game is deleted. This prevents new orphaned references from being created.

## Testing
To verify the cleanup is working:

1. Check the console logs when loading the ProfileScreen
2. Look for messages like: "Cleaning up X orphaned game references"
3. Pull to refresh on the profile screen
4. Verify that the following games count updates correctly

## Future Improvements
- Add a manual "Clean Up" button in settings for users who want to trigger cleanup
- Add analytics to track how often orphaned references occur
- Consider adding a background job to periodically clean up orphaned references
