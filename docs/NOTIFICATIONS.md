# Push Notifications System

This document describes the push notifications implementation for the CourtSide mobile app.

## Overview

The notification system uses Expo Notifications for local notifications and Firebase Cloud Messaging (FCM) for push notifications. It supports both iOS and Android platforms.

## Architecture

### Components

1. **NotificationService** (`src/services/notifications/NotificationService.ts`)
   - Singleton service for managing all notification operations
   - Handles permission requests, token registration, and notification scheduling
   - Manages notification channels for Android

2. **useNotifications Hook** (`src/hooks/useNotifications.ts`)
   - React hook for integrating notifications into components
   - Auto-registers users for notifications on login
   - Provides convenient methods for scheduling and managing notifications

3. **Cloud Functions** (`functions/src/index.ts`)
   - `checkUpcomingGames`: Scheduled function (runs every 15 minutes) to notify users of games starting soon
   - `onGameCompleted`: Firestore trigger to notify users when followed games end
   - `sendTestNotification`: HTTP callable function for testing notifications
   - `cleanupOldFollowedGames`: Daily cleanup of old completed games from user profiles

## Setup

### 1. App Configuration

The app is configured in `app.json` with the Expo Notifications plugin:

```json
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/images/icon.png",
        "color": "#ffffff",
        "sounds": [],
        "mode": "production"
      }
    ]
  ]
}
```

### 2. Android Configuration

Android requires:
- `google-services.json` file in the project root
- Notification permissions in `app.json`
- Notification channels configured in NotificationService

### 3. iOS Configuration

iOS requires:
- `GoogleService-Info.plist` file in the project root
- Push notification capability enabled in Apple Developer Console
- APNs certificate configured in Firebase Console

### 4. Firebase Cloud Functions

Deploy functions to Firebase:

```bash
cd functions
npm install
npm run build
npm run deploy
```

## Usage

### In Components

```typescript
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  const {
    expoPushToken,
    isRegistered,
    permissionStatus,
    scheduleGameNotification,
    clearBadge,
  } = useNotifications();

  // Schedule a notification for a game
  const handleFollowGame = async (game) => {
    await scheduleGameNotification(
      game.id,
      game.teamA,
      game.teamB,
      game.startTime,
      15 // minutes before
    );
  };

  return (
    <View>
      <Text>Token: {expoPushToken}</Text>
      <Text>Status: {permissionStatus}</Text>
    </View>
  );
}
```

### Direct Service Usage

```typescript
import NotificationService from '../services/notifications/NotificationService';

const notificationService = NotificationService.getInstance();

// Request permissions
const hasPermission = await notificationService.requestPermissions();

// Register for push notifications
const token = await notificationService.registerForPushNotifications();

// Schedule a local notification
const notificationId = await notificationService.scheduleLocalNotification(
  'Title',
  'Body',
  new Date('2024-12-31T12:00:00Z')
);

// Cancel a notification
await notificationService.cancelNotification(notificationId);
```

## Notification Types

### 1. Game Starting Soon

Sent 15 minutes before a followed game starts.

**Trigger**: Cloud Function `checkUpcomingGames` (runs every 15 minutes)

**Data**:
```json
{
  "type": "game-start",
  "gameId": "game-123",
  "teamA": "Team A",
  "teamB": "Team B",
  "tournamentId": "tournament-456"
}
```

### 2. Game Finished

Sent when a followed game or team's game is completed.

**Trigger**: Firestore trigger `onGameCompleted` (on game status change to 'completed')

**Data**:
```json
{
  "type": "game-end",
  "gameId": "game-123",
  "teamA": "Team A",
  "teamB": "Team B",
  "scoreA": "85",
  "scoreB": "72",
  "tournamentId": "tournament-456"
}
```

## Notification Channels (Android)

1. **default**: Default notification channel
2. **game-updates**: For game start notifications (HIGH priority)
3. **team-updates**: For game result notifications (HIGH priority)

## Permission Handling

### iOS
- Permissions requested on first app launch or when user attempts to follow a game/team
- User can enable/disable in iOS Settings > CourtSide > Notifications

### Android
- POST_NOTIFICATIONS permission required (Android 13+)
- Permissions requested automatically on app launch
- User can manage in Android Settings > Apps > CourtSide > Notifications

## Testing

### Unit Tests

Run notification service tests:
```bash
npm test -- src/services/notifications/__tests__/NotificationService.test.ts
```

Run hook tests:
```bash
npm test -- src/hooks/__tests__/useNotifications.test.ts
```

### Manual Testing

1. **Test Notification Permission**:
   - Open app on physical device
   - Check if permission dialog appears
   - Verify token is saved to user profile

2. **Test Local Notifications**:
   - Follow a game with upcoming start time
   - Wait for notification 15 minutes before game
   - Verify notification appears

3. **Test Push Notifications**:
   - Use Firebase Console to send test notification
   - Or call `sendTestNotification` Cloud Function
   - Verify notification is received

4. **Test Cloud Functions**:
   ```bash
   cd functions
   npm run serve
   ```
   Then trigger functions manually in emulator

## Troubleshooting

### No Notifications Received

1. **Check Permissions**:
   - Verify notification permissions are granted
   - Check device notification settings

2. **Check FCM Token**:
   - Verify token is saved in user profile
   - Check if token is valid (not expired)

3. **Check Cloud Functions**:
   - View function logs in Firebase Console
   - Verify functions are deployed and running

4. **Check Firestore Data**:
   - Verify user has `followingGames` or `followingTeams` populated
   - Verify `notificationsEnabled` is true
   - Verify game `startTime` is in the future

### Invalid Token Errors

Cloud Functions automatically remove invalid tokens from user profiles. If a user's token becomes invalid:
1. User will need to re-register for notifications
2. This happens automatically on next app launch

### Notifications Not Scheduling

1. **Check Device**:
   - Notifications only work on physical devices, not simulators
   - Verify device has internet connection

2. **Check Time**:
   - Notifications cannot be scheduled for past times
   - Verify game start time is in the future

3. **Check Logs**:
   - Check console for error messages
   - Verify NotificationService methods are being called

## Best Practices

1. **Always Check Permissions**: Before scheduling notifications, verify permissions are granted
2. **Handle Token Expiration**: Tokens can expire; re-register periodically
3. **Clean Up Listeners**: Remove notification listeners when components unmount
4. **Test on Physical Devices**: Notifications don't work in simulators
5. **Monitor Cloud Function Costs**: Scheduled functions run frequently; monitor usage
6. **Respect User Preferences**: Always check `notificationsEnabled` before sending

## Future Enhancements

- [ ] Rich notifications with images
- [ ] Notification action buttons (e.g., "View Game", "Dismiss")
- [ ] Notification grouping by tournament
- [ ] Custom notification sounds
- [ ] In-app notification center
- [ ] Notification preferences per team/tournament
- [ ] Silent notifications for background data sync
