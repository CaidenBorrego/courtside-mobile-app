#!/usr/bin/env ts-node

/**
 * Cleanup Script: Keep Only Hangry Joe's Tournament
 * 
 * This script removes all orphaned data and keeps only the Hangry Joe's tournament
 * and all its related data (divisions, games, pools, brackets, locations).
 * 
 * What it does:
 * 1. Finds the Hangry Joe's tournament
 * 2. Identifies all related data (divisions, games, pools, brackets, locations)
 * 3. Deletes all tournaments except Hangry Joe's
 * 4. Deletes all divisions not belonging to Hangry Joe's
 * 5. Deletes all games not belonging to Hangry Joe's divisions
 * 6. Deletes all pools not belonging to Hangry Joe's divisions
 * 7. Deletes all brackets not belonging to Hangry Joe's divisions
 * 8. Deletes all locations not used by Hangry Joe's games
 * 9. Cleans up user following lists (removes references to deleted games)
 * 
 * Usage:
 *   npm run cleanup-hangry-joes
 * 
 * IMPORTANT: This operation cannot be undone. Make sure you have a backup!
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_DEV,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_DEV,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface CleanupStats {
  tournamentsDeleted: number;
  divisionsDeleted: number;
  gamesDeleted: number;
  poolsDeleted: number;
  bracketsDeleted: number;
  locationsDeleted: number;
  usersUpdated: number;
}

/**
 * Prompt user for confirmation
 */
async function confirmCleanup(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  WARNING: This will delete ALL data except Hangry Joe\'s tournament!\n' +
      'This operation CANNOT be undone.\n\n' +
      'Type "DELETE ALL" to confirm: ',
      (answer) => {
        rl.close();
        resolve(answer === 'DELETE ALL');
      }
    );
  });
}

/**
 * Find the Hangry Joe's tournament
 */
async function findHangryJoesTournament(): Promise<string | null> {
  console.log('\n🔍 Searching for Hangry Joe\'s tournament...');
  
  const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
  
  for (const docSnap of tournamentsSnapshot.docs) {
    const data = docSnap.data();
    if (data.name && data.name.toLowerCase().includes('hangry joe')) {
      console.log(`✅ Found: ${data.name} (ID: ${docSnap.id})`);
      return docSnap.id;
    }
  }
  
  return null;
}

/**
 * Get all division IDs for a tournament
 */
async function getTournamentDivisionIds(tournamentId: string): Promise<string[]> {
  const divisionsSnapshot = await getDocs(
    query(collection(db, 'divisions'), where('tournamentId', '==', tournamentId))
  );
  
  return divisionsSnapshot.docs.map(doc => doc.id);
}

/**
 * Get all location IDs used by tournament games
 */
async function getTournamentLocationIds(divisionIds: string[]): Promise<string[]> {
  const locationIds = new Set<string>();
  
  for (const divisionId of divisionIds) {
    const gamesSnapshot = await getDocs(
      query(collection(db, 'games'), where('divisionId', '==', divisionId))
    );
    
    gamesSnapshot.docs.forEach(doc => {
      const locationId = doc.data().locationId;
      if (locationId) {
        locationIds.add(locationId);
      }
    });
  }
  
  return Array.from(locationIds);
}

/**
 * Get all game IDs for tournament divisions
 */
async function getTournamentGameIds(divisionIds: string[]): Promise<string[]> {
  const gameIds: string[] = [];
  
  for (const divisionId of divisionIds) {
    const gamesSnapshot = await getDocs(
      query(collection(db, 'games'), where('divisionId', '==', divisionId))
    );
    
    gameIds.push(...gamesSnapshot.docs.map(doc => doc.id));
  }
  
  return gameIds;
}

/**
 * Delete documents in batches
 */
async function batchDelete(collectionName: string, docIds: string[]): Promise<number> {
  if (docIds.length === 0) return 0;
  
  const batchSize = 500; // Firestore batch limit
  let deleted = 0;
  
  for (let i = 0; i < docIds.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchIds = docIds.slice(i, i + batchSize);
    
    batchIds.forEach(id => {
      batch.delete(doc(db, collectionName, id));
    });
    
    await batch.commit();
    deleted += batchIds.length;
    
    if (docIds.length > batchSize) {
      console.log(`   Deleted ${deleted}/${docIds.length} ${collectionName}...`);
    }
  }
  
  return deleted;
}

/**
 * Main cleanup function
 */
async function cleanup(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    tournamentsDeleted: 0,
    divisionsDeleted: 0,
    gamesDeleted: 0,
    poolsDeleted: 0,
    bracketsDeleted: 0,
    locationsDeleted: 0,
    usersUpdated: 0,
  };

  // Step 1: Find Hangry Joe's tournament
  const hangryJoesId = await findHangryJoesTournament();
  
  if (!hangryJoesId) {
    throw new Error('❌ Hangry Joe\'s tournament not found!');
  }

  // Step 2: Get all related data IDs
  console.log('\n📋 Identifying related data...');
  const divisionIds = await getTournamentDivisionIds(hangryJoesId);
  console.log(`   Found ${divisionIds.length} divisions`);
  
  const locationIds = await getTournamentLocationIds(divisionIds);
  console.log(`   Found ${locationIds.length} locations`);
  
  const gameIds = await getTournamentGameIds(divisionIds);
  console.log(`   Found ${gameIds.length} games`);

  // Step 3: Delete tournaments (except Hangry Joe's)
  console.log('\n🗑️  Deleting other tournaments...');
  const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
  const tournamentsToDelete = tournamentsSnapshot.docs
    .filter(doc => doc.id !== hangryJoesId)
    .map(doc => doc.id);
  
  stats.tournamentsDeleted = await batchDelete('tournaments', tournamentsToDelete);
  console.log(`   ✅ Deleted ${stats.tournamentsDeleted} tournaments`);

  // Step 4: Delete divisions (not in Hangry Joe's)
  console.log('\n🗑️  Deleting orphaned divisions...');
  const divisionsSnapshot = await getDocs(collection(db, 'divisions'));
  const divisionsToDelete = divisionsSnapshot.docs
    .filter(doc => !divisionIds.includes(doc.id))
    .map(doc => doc.id);
  
  stats.divisionsDeleted = await batchDelete('divisions', divisionsToDelete);
  console.log(`   ✅ Deleted ${stats.divisionsDeleted} divisions`);

  // Step 5: Delete games (not in Hangry Joe's divisions)
  console.log('\n🗑️  Deleting orphaned games...');
  const gamesSnapshot = await getDocs(collection(db, 'games'));
  const gamesToDelete = gamesSnapshot.docs
    .filter(doc => !gameIds.includes(doc.id))
    .map(doc => doc.id);
  
  stats.gamesDeleted = await batchDelete('games', gamesToDelete);
  console.log(`   ✅ Deleted ${stats.gamesDeleted} games`);

  // Step 6: Delete pools (not in Hangry Joe's divisions)
  console.log('\n🗑️  Deleting orphaned pools...');
  const poolsSnapshot = await getDocs(collection(db, 'pools'));
  const poolsToDelete = poolsSnapshot.docs
    .filter(doc => {
      const data = doc.data();
      return !divisionIds.includes(data.divisionId);
    })
    .map(doc => doc.id);
  
  stats.poolsDeleted = await batchDelete('pools', poolsToDelete);
  console.log(`   ✅ Deleted ${stats.poolsDeleted} pools`);

  // Step 7: Delete brackets (not in Hangry Joe's divisions)
  console.log('\n🗑️  Deleting orphaned brackets...');
  const bracketsSnapshot = await getDocs(collection(db, 'brackets'));
  const bracketsToDelete = bracketsSnapshot.docs
    .filter(doc => {
      const data = doc.data();
      return !divisionIds.includes(data.divisionId);
    })
    .map(doc => doc.id);
  
  stats.bracketsDeleted = await batchDelete('brackets', bracketsToDelete);
  console.log(`   ✅ Deleted ${stats.bracketsDeleted} brackets`);

  // Step 8: Delete locations (not used by Hangry Joe's)
  console.log('\n🗑️  Deleting orphaned locations...');
  const locationsSnapshot = await getDocs(collection(db, 'locations'));
  const locationsToDelete = locationsSnapshot.docs
    .filter(doc => !locationIds.includes(doc.id))
    .map(doc => doc.id);
  
  stats.locationsDeleted = await batchDelete('locations', locationsToDelete);
  console.log(`   ✅ Deleted ${stats.locationsDeleted} locations`);

  // Step 9: Clean up user following lists
  console.log('\n🧹 Cleaning up user following lists...');
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const followingGames = userData.followingGames || [];
    
    // Filter out deleted games
    const validGames = followingGames.filter((gameId: string) => 
      gameIds.includes(gameId)
    );
    
    // Update if there are orphaned references
    if (validGames.length !== followingGames.length) {
      await updateDoc(doc(db, 'users', userDoc.id), {
        followingGames: validGames,
      });
      stats.usersUpdated++;
    }
  }
  
  console.log(`   ✅ Updated ${stats.usersUpdated} user profiles`);

  return stats;
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Cleanup Script: Keep Only Hangry Joe\'s Tournament        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Confirm with user
    const confirmed = await confirmCleanup();
    
    if (!confirmed) {
      console.log('\n❌ Cleanup cancelled by user.');
      process.exit(0);
    }

    console.log('\n🚀 Starting cleanup...');
    const startTime = Date.now();

    const stats = await cleanup();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Cleanup Complete!                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n📊 Summary:');
    console.log(`   • Tournaments deleted: ${stats.tournamentsDeleted}`);
    console.log(`   • Divisions deleted: ${stats.divisionsDeleted}`);
    console.log(`   • Games deleted: ${stats.gamesDeleted}`);
    console.log(`   • Pools deleted: ${stats.poolsDeleted}`);
    console.log(`   • Brackets deleted: ${stats.bracketsDeleted}`);
    console.log(`   • Locations deleted: ${stats.locationsDeleted}`);
    console.log(`   • User profiles updated: ${stats.usersUpdated}`);
    console.log(`\n⏱️  Completed in ${duration} seconds`);
    console.log('\n✅ Database now contains only Hangry Joe\'s tournament data.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the script
main();
