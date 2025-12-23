/**
 * One-time cleanup script to remove orphaned game references from all user profiles
 * Run this script after deploying the fix to clean up existing orphaned references
 * 
 * Usage: npx ts-node scripts/cleanup-orphaned-games.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration - update with your project details
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupOrphanedGames() {
  console.log('Starting cleanup of orphaned game references...\n');

  try {
    // Get all users
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    console.log(`Found ${usersSnapshot.size} users to check\n`);

    let totalUsersProcessed = 0;
    let totalOrphanedGamesRemoved = 0;
    let usersWithOrphans = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const followingGames = userData.followingGames || [];
      
      if (followingGames.length === 0) {
        totalUsersProcessed++;
        continue;
      }

      console.log(`Checking user ${userDoc.id} (${followingGames.length} games)...`);

      // Check each game to see if it still exists
      const validGameIds: string[] = [];
      const orphanedGameIds: string[] = [];

      for (const gameId of followingGames) {
        try {
          const gameDoc = await getDocs(collection(db, 'games'));
          const gameExists = gameDoc.docs.some(doc => doc.id === gameId);
          
          if (gameExists) {
            validGameIds.push(gameId);
          } else {
            orphanedGameIds.push(gameId);
          }
        } catch (error) {
          // If we can't check, assume it's orphaned
          orphanedGameIds.push(gameId);
        }
      }

      // Update user profile if orphaned games were found
      if (orphanedGameIds.length > 0) {
        console.log(`  Found ${orphanedGameIds.length} orphaned games, cleaning up...`);
        
        const userRef = doc(db, 'users', userDoc.id);
        await updateDoc(userRef, {
          followingGames: validGameIds,
          updatedAt: Timestamp.now(),
        });

        usersWithOrphans++;
        totalOrphanedGamesRemoved += orphanedGameIds.length;
        console.log(`  ✓ Cleaned up user ${userDoc.id}`);
      } else {
        console.log(`  ✓ No orphaned games found`);
      }

      totalUsersProcessed++;
      console.log('');
    }

    console.log('='.repeat(50));
    console.log('Cleanup Summary:');
    console.log(`  Total users processed: ${totalUsersProcessed}`);
    console.log(`  Users with orphaned games: ${usersWithOrphans}`);
    console.log(`  Total orphaned games removed: ${totalOrphanedGamesRemoved}`);
    console.log('='.repeat(50));
    console.log('\n✓ Cleanup completed successfully!');

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedGames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
