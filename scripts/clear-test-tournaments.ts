/**
 * Script to clear all test tournaments from Firestore, keeping only the Hays tournament
 * This preserves the production tournament while removing test data
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function clearTestTournaments() {
  try {
    console.log('🔍 Fetching all tournaments...');
    
    // Get all tournaments
    const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
    
    if (tournamentsSnapshot.empty) {
      console.log('No tournaments found in database.');
      return;
    }

    console.log(`Found ${tournamentsSnapshot.size} tournament(s)\n`);

    // Find the Hays tournament (case-insensitive search)
    let haysTournamentId: string | null = null;
    const tournamentsToDelete: { id: string; name: string }[] = [];

    tournamentsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tournamentName = data.name?.toLowerCase() || '';
      
      if (tournamentName.includes('hays')) {
        haysTournamentId = docSnap.id;
        console.log(`✅ Keeping: ${data.name} (ID: ${docSnap.id})`);
      } else {
        tournamentsToDelete.push({ id: docSnap.id, name: data.name });
        console.log(`❌ Will delete: ${data.name} (ID: ${docSnap.id})`);
      }
    });

    if (!haysTournamentId) {
      console.log('\n⚠️  Warning: No Hays tournament found! No tournaments will be deleted.');
      return;
    }

    if (tournamentsToDelete.length === 0) {
      console.log('\n✅ No test tournaments to delete. Only Hays tournament exists.');
      return;
    }

    console.log(`\n🗑️  Deleting ${tournamentsToDelete.length} test tournament(s)...\n`);

    // Delete each test tournament and its related data
    for (const tournament of tournamentsToDelete) {
      console.log(`Deleting tournament: ${tournament.name} (${tournament.id})`);
      
      // Delete divisions
      const divisionsQuery = query(
        collection(db, 'divisions'),
        where('tournamentId', '==', tournament.id)
      );
      const divisionsSnapshot = await getDocs(divisionsQuery);
      
      console.log(`  - Deleting ${divisionsSnapshot.size} division(s)`);
      const divisionIds: string[] = [];
      for (const docSnap of divisionsSnapshot.docs) {
        divisionIds.push(docSnap.id);
        await deleteDoc(doc(db, 'divisions', docSnap.id));
      }

      // Delete games
      const gamesQuery = query(
        collection(db, 'games'),
        where('tournamentId', '==', tournament.id)
      );
      const gamesSnapshot = await getDocs(gamesQuery);
      
      console.log(`  - Deleting ${gamesSnapshot.size} game(s)`);
      for (const docSnap of gamesSnapshot.docs) {
        await deleteDoc(doc(db, 'games', docSnap.id));
      }

      // Delete pools, brackets, and standings for each division
      for (const divisionId of divisionIds) {
        // Delete pools
        const poolsQuery = query(
          collection(db, 'pools'),
          where('divisionId', '==', divisionId)
        );
        const poolsSnapshot = await getDocs(poolsQuery);
        
        if (poolsSnapshot.size > 0) {
          console.log(`  - Deleting ${poolsSnapshot.size} pool(s) for division ${divisionId}`);
          for (const docSnap of poolsSnapshot.docs) {
            await deleteDoc(doc(db, 'pools', docSnap.id));
          }
        }

        // Delete brackets
        const bracketsQuery = query(
          collection(db, 'brackets'),
          where('divisionId', '==', divisionId)
        );
        const bracketsSnapshot = await getDocs(bracketsQuery);
        
        if (bracketsSnapshot.size > 0) {
          console.log(`  - Deleting ${bracketsSnapshot.size} bracket(s) for division ${divisionId}`);
          for (const docSnap of bracketsSnapshot.docs) {
            await deleteDoc(doc(db, 'brackets', docSnap.id));
          }
        }

        // Delete standings
        const standingsQuery = query(
          collection(db, 'standings'),
          where('divisionId', '==', divisionId)
        );
        const standingsSnapshot = await getDocs(standingsQuery);
        
        if (standingsSnapshot.size > 0) {
          console.log(`  - Deleting ${standingsSnapshot.size} standing(s) for division ${divisionId}`);
          for (const docSnap of standingsSnapshot.docs) {
            await deleteDoc(doc(db, 'standings', docSnap.id));
          }
        }
      }

      // Finally, delete the tournament itself
      await deleteDoc(doc(db, 'tournaments', tournament.id));
      console.log(`  ✅ Tournament ${tournament.name} deleted\n`);
    }

    console.log('✅ Successfully cleared all test tournaments!');
    console.log(`✅ Hays tournament (ID: ${haysTournamentId}) has been preserved.`);
    
  } catch (error) {
    console.error('❌ Error clearing test tournaments:', error);
    throw error;
  }
}

// Run the script
clearTestTournaments()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
