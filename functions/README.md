# CourtSide Cloud Functions

This directory contains Firebase Cloud Functions for the CourtSide mobile app.

## Functions

### Scheduled Functions

1. **checkUpcomingGames** - Runs every 15 minutes
   - Checks for games starting in the next 15-30 minutes
   - Sends push notifications to users following those games
   - Automatically cleans up invalid FCM tokens

2. **cleanupOldFollowedGames** - Runs daily
   - Removes completed games older than 30 days from user following lists
   - Keeps user profiles clean and reduces database size

### Firestore Triggers

1. **onGameCompleted** - Triggered when a game document is updated
   - Detects when game status changes to 'completed'
   - Sends notifications to users following the game or either team
   - Includes final score in notification

### HTTP Functions

1. **sendTestNotification** - Callable function
   - Allows authenticated users to send themselves a test notification
   - Useful for testing notification setup

## Setup

1. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Build TypeScript:
   ```bash
   npm run build
   ```

3. Deploy functions:
   ```bash
   npm run deploy
   ```

## Development

- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Watch**: `npm run build:watch`
- **Test locally**: `npm run serve`

## Environment Variables

Functions automatically use Firebase project configuration. No additional environment variables are required.

## Notification Channels

- **game-updates**: Notifications for game start times
- **team-updates**: Notifications for game results

## Error Handling

All functions include error handling and logging. Invalid FCM tokens are automatically removed from user profiles.
