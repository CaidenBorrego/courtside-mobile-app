import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Scheduled function that runs every 15 minutes to check for games starting soon
 * Sends notifications to users who are following games that start in the next 15-30 minutes
 */
export const checkUpcomingGames = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context: functions.EventContext) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const fifteenMinutesFromNow = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + 15 * 60 * 1000
      );
      const thirtyMinutesFromNow = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + 30 * 60 * 1000
      );

      // Query games starting in the next 15-30 minutes with status 'scheduled'
      const upcomingGamesSnapshot = await db
        .collection('games')
        .where('startTime', '>=', fifteenMinutesFromNow)
        .where('startTime', '<=', thirtyMinutesFromNow)
        .where('status', '==', 'scheduled')
        .get();

      if (upcomingGamesSnapshot.empty) {
        console.log('No upcoming games found');
        return null;
      }

      const notificationPromises: Promise<any>[] = [];

      for (const gameDoc of upcomingGamesSnapshot.docs) {
        const game = gameDoc.data();
        const gameId = gameDoc.id;

        // Find all users following this game
        const usersSnapshot = await db
          .collection('users')
          .where('followingGames', 'array-contains', gameId)
          .where('notificationsEnabled', '==', true)
          .get();

        if (usersSnapshot.empty) {
          continue;
        }

        // Calculate minutes until game starts
        const minutesUntilStart = Math.round(
          (game.startTime.toMillis() - now.toMillis()) / (60 * 1000)
        );

        // Send notification to each user
        for (const userDoc of usersSnapshot.docs) {
          const user = userDoc.data();
          
          if (!user.fcmToken) {
            continue;
          }

          const message = {
            token: user.fcmToken,
            notification: {
              title: 'Game Starting Soon',
              body: `${game.teamA} vs ${game.teamB} starts in ${minutesUntilStart} minutes`,
            },
            data: {
              type: 'game-start',
              gameId: gameId,
              teamA: game.teamA,
              teamB: game.teamB,
              tournamentId: game.tournamentId,
            },
            android: {
              priority: 'high' as const,
              notification: {
                channelId: 'game-updates',
                priority: 'high' as const,
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          };

          notificationPromises.push(
            admin.messaging().send(message).catch((error: any) => {
              console.error(`Error sending notification to user ${userDoc.id}:`, error);
              // If token is invalid, remove it from user profile
              if (error.code === 'messaging/invalid-registration-token' ||
                  error.code === 'messaging/registration-token-not-registered') {
                return db.collection('users').doc(userDoc.id).update({
                  fcmToken: admin.firestore.FieldValue.delete(),
                });
              }
            })
          );
        }
      }

      await Promise.all(notificationPromises);
      console.log(`Sent ${notificationPromises.length} notifications for upcoming games`);
      return null;
    } catch (error) {
      console.error('Error in checkUpcomingGames:', error);
      return null;
    }
  });

/**
 * Firestore trigger that runs when a game document is updated
 * Sends notifications when a game status changes to 'completed'
 */
export const onGameCompleted = functions.firestore
  .document('games/{gameId}')
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    try {
      const gameId = context.params.gameId;
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // Check if game status changed to 'completed'
      if (beforeData.status !== 'completed' && afterData.status === 'completed') {
        console.log(`Game ${gameId} completed: ${afterData.teamA} vs ${afterData.teamB}`);

        // Find users following this game
        const gameFollowersSnapshot = await db
          .collection('users')
          .where('followingGames', 'array-contains', gameId)
          .where('notificationsEnabled', '==', true)
          .get();

        // Find users following either team
        const teamAFollowersSnapshot = await db
          .collection('users')
          .where('followingTeams', 'array-contains', afterData.teamA)
          .where('notificationsEnabled', '==', true)
          .get();

        const teamBFollowersSnapshot = await db
          .collection('users')
          .where('followingTeams', 'array-contains', afterData.teamB)
          .where('notificationsEnabled', '==', true)
          .get();

        // Combine all users (using Set to avoid duplicates)
        const userIds = new Set<string>();
        gameFollowersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => userIds.add(doc.id));
        teamAFollowersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => userIds.add(doc.id));
        teamBFollowersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => userIds.add(doc.id));

        if (userIds.size === 0) {
          console.log('No users to notify');
          return null;
        }

        // Determine winner
        const scoreA = afterData.scoreA || 0;
        const scoreB = afterData.scoreB || 0;
        let resultText = `Final Score: ${afterData.teamA} ${scoreA} - ${scoreB} ${afterData.teamB}`;
        
        if (scoreA > scoreB) {
          resultText = `${afterData.teamA} wins! ${scoreA} - ${scoreB}`;
        } else if (scoreB > scoreA) {
          resultText = `${afterData.teamB} wins! ${scoreB} - ${scoreA}`;
        } else {
          resultText = `Game tied: ${scoreA} - ${scoreB}`;
        }

        // Send notifications
        const notificationPromises: Promise<any>[] = [];

        for (const userId of userIds) {
          const userDoc = await db.collection('users').doc(userId).get();
          const user = userDoc.data();

          if (!user || !user.fcmToken) {
            continue;
          }

          const message = {
            token: user.fcmToken,
            notification: {
              title: 'Game Finished',
              body: resultText,
            },
            data: {
              type: 'game-end',
              gameId: gameId,
              teamA: afterData.teamA,
              teamB: afterData.teamB,
              scoreA: String(scoreA),
              scoreB: String(scoreB),
              tournamentId: afterData.tournamentId,
            },
            android: {
              priority: 'high' as const,
              notification: {
                channelId: 'team-updates',
                priority: 'high' as const,
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          };

          notificationPromises.push(
            admin.messaging().send(message).catch((error: any) => {
              console.error(`Error sending notification to user ${userId}:`, error);
              // If token is invalid, remove it from user profile
              if (error.code === 'messaging/invalid-registration-token' ||
                  error.code === 'messaging/registration-token-not-registered') {
                return db.collection('users').doc(userId).update({
                  fcmToken: admin.firestore.FieldValue.delete(),
                });
              }
            })
          );
        }

        await Promise.all(notificationPromises);
        console.log(`Sent ${notificationPromises.length} notifications for completed game`);
      }

      return null;
    } catch (error) {
      console.error('Error in onGameCompleted:', error);
      return null;
    }
  });

/**
 * HTTP function to manually trigger a test notification
 * Useful for testing notification setup
 */
export const sendTestNotification = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to send test notification'
    );
  }

  const userId = context.auth.uid;

  try {
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();

    if (!user || !user.fcmToken) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'User does not have a valid FCM token'
      );
    }

    // Send test notification
    const message = {
      token: user.fcmToken,
      notification: {
        title: 'Test Notification',
        body: 'This is a test notification from CourtSide',
      },
      data: {
        type: 'test',
      },
    };

    await admin.messaging().send(message);
    
    return { success: true, message: 'Test notification sent successfully' };
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send test notification'
    );
  }
});

/**
 * Cleanup function to remove old completed games from following lists
 * Runs daily to keep user profiles clean
 */
export const cleanupOldFollowedGames = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context: functions.EventContext) => {
    try {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      );

      // Find completed games older than 30 days
      const oldGamesSnapshot = await db
        .collection('games')
        .where('status', '==', 'completed')
        .where('startTime', '<', thirtyDaysAgo)
        .get();

      if (oldGamesSnapshot.empty) {
        console.log('No old games to clean up');
        return null;
      }

      const oldGameIds = oldGamesSnapshot.docs.map(doc => doc.id);
      console.log(`Found ${oldGameIds.length} old games to remove from following lists`);

      // Find all users following any of these old games
      const usersSnapshot = await db.collection('users').get();
      
      const updatePromises: Promise<any>[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const followingGames = user.followingGames || [];
        
        // Check if user is following any old games
        const gamesToRemove = followingGames.filter((gameId: string) => 
          oldGameIds.includes(gameId)
        );

        if (gamesToRemove.length > 0) {
          const updatedFollowingGames = followingGames.filter((gameId: string) => 
            !oldGameIds.includes(gameId)
          );

          updatePromises.push(
            db.collection('users').doc(userDoc.id).update({
              followingGames: updatedFollowingGames,
            })
          );
        }
      }

      await Promise.all(updatePromises);
      console.log(`Updated ${updatePromises.length} user profiles`);
      
      return null;
    } catch (error) {
      console.error('Error in cleanupOldFollowedGames:', error);
      return null;
    }
  });
