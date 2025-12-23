/**
 * Delete script for Hays HS Christmas Classic - ELITE 8 Bracket
 * This removes all tournament data to allow for a clean re-seed
 * Run with: npx ts-node scripts/delete-elite8-tournament.ts
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_DEV || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_DEV || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function deleteElite8Tournament() {
  console.log('🗑️  Deleting Hays HS Christmas Classic - ELITE 8 Bracket...\n');

  try {
    // Sign in as admin
    console.log('🔐 Signing in as admin...');
    try {
      await signInWithEmailAndPassword(auth, 'admin@courtside.test', 'Admin123!');
      console.log('✅ Signed in as admin\n');
    } catch (signInError: any) {
      console.log('⚠️  Could not sign in as admin:', signInError.message);
      console.log('   Continuing with unauthenticated access\n');
    }

    // Find the tournament
    console.log('📝 Finding tournament...');
    const tournamentsQuery = query(
      collection(db, 'tournaments'),
      where('name', '==', 'Hays HS Christmas Classic - ELITE 8 Bracket')
    );
    const tournamentsSnapshot = await getDocs(tournamentsQuery);
    
    if (tournamentsSnapshot.empty) {
      console.log('⚠️  Tournament not found. Nothing to delete.');
      process.exit(0);
    }

    const tournamentDoc = tournamentsSnapshot.docs[0];
    const tournamentId = tournamentDoc.id;
    console.log(`✅ Found tournament (ID: ${tournamentId})\n`);

    // Delete games
    console.log('📝 Deleting games...');
    const gamesQuery = query(
      collection(db, 'games'),
      where('tournamentId', '==', tournamentId)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    let gamesDeleted = 0;
    for (const gameDoc of gamesSnapshot.docs) {
      await deleteDoc(doc(db, 'games', gameDoc.id));
      gamesDeleted++;
    }
    console.log(`✅ Deleted ${gamesDeleted} games\n`);

    // Delete pools
    console.log('📝 Deleting pools...');
    const poolsQuery = query(
      collection(db, 'pools'),
      where('tournamentId', '==', tournamentId)
    );
    const poolsSnapshot = await getDocs(poolsQuery);
    let poolsDeleted = 0;
    for (const poolDoc of poolsSnapshot.docs) {
      await deleteDoc(doc(db, 'pools', poolDoc.id));
      poolsDeleted++;
    }
    console.log(`✅ Deleted ${poolsDeleted} pools\n`);

    // Delete brackets
    console.log('📝 Deleting brackets...');
    const bracketsQuery = query(
      collection(db, 'brackets'),
      where('tournamentId', '==', tournamentId)
    );
    const bracketsSnapshot = await getDocs(bracketsQuery);
    let bracketsDeleted = 0;
    for (const bracketDoc of bracketsSnapshot.docs) {
      await deleteDoc(doc(db, 'brackets', bracketDoc.id));
      bracketsDeleted++;
    }
    console.log(`✅ Deleted ${bracketsDeleted} brackets\n`);

    // Delete divisions
    console.log('📝 Deleting divisions...');
    const divisionsQuery = query(
      collection(db, 'divisions'),
      where('tournamentId', '==', tournamentId)
    );
    const divisionsSnapshot = await getDocs(divisionsQuery);
    let divisionsDeleted = 0;
    for (const divisionDoc of divisionsSnapshot.docs) {
      await deleteDoc(doc(db, 'divisions', divisionDoc.id));
      divisionsDeleted++;
    }
    console.log(`✅ Deleted ${divisionsDeleted} divisions\n`);

    // Delete tournament
    console.log('📝 Deleting tournament...');
    await deleteDoc(doc(db, 'tournaments', tournamentId));
    console.log('✅ Deleted tournament\n');

    console.log('✅ Tournament deleted successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${gamesDeleted} games deleted`);
    console.log(`   - ${poolsDeleted} pools deleted`);
    console.log(`   - ${bracketsDeleted} brackets deleted`);
    console.log(`   - ${divisionsDeleted} divisions deleted`);
    console.log('   - 1 tournament deleted\n');

  } catch (error) {
    console.error('❌ Error deleting tournament:', error);
    process.exit(1);
  }

  process.exit(0);
}

deleteElite8Tournament();
