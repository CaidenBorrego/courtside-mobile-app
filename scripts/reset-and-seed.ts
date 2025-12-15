/**
 * Reset and seed script - Clears all data and creates one test tournament
 * Run with: npx ts-node scripts/reset-and-seed.ts
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  Timestamp, 
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Firebase config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_DEV || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_DEV || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function clearCollection(collectionName: string) {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const deletePromises = querySnapshot.docs.map(document => 
    deleteDoc(doc(db, collectionName, document.id))
  );
  await Promise.all(deletePromises);
  console.log(`🗑️  Cleared ${querySnapshot.size} documents from ${collectionName}`);
}

async function resetAndSeed() {
  console.log('🔄 Resetting database and seeding minimal test data...\n');

  try {
    // Clear all collections (except users)
    console.log('📝 Clearing existing data...');
    await clearCollection('tournaments');
    await clearCollection('divisions');
    await clearCollection('locations');
    await clearCollection('games');

    console.log('\n✅ Database cleared!\n');

    // Create ONE tournament
    console.log('📝 Creating test tournament...');
    const tournament = {
      name: 'Test Basketball Tournament 2024',
      startDate: Timestamp.fromDate(new Date('2024-12-15')),
      endDate: Timestamp.fromDate(new Date('2024-12-17')),
      address: '1111 S Figueroa St',
      city: 'Los Angeles',
      state: 'CA',
      status: 'active',
      createdBy: 'admin',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const tournamentRef = await addDoc(collection(db, 'tournaments'), tournament);
    console.log(`✅ Created tournament: ${tournament.name}`);

    // Create 2 divisions
    console.log('\n📝 Creating divisions...');
    const divisions = [
      {
        tournamentId: tournamentRef.id,
        name: 'Boys 14U',
        ageGroup: '14U',
        gender: 'male',
        skillLevel: 'Competitive',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentRef.id,
        name: 'Girls 16U',
        ageGroup: '16U',
        gender: 'female',
        skillLevel: 'Elite',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const divisionRefs = await Promise.all(
      divisions.map(div => addDoc(collection(db, 'divisions'), div))
    );
    console.log(`✅ Created ${divisions.length} divisions`);

    // Create 2 locations
    console.log('\n📝 Creating locations...');
    const locations = [
      {
        name: 'Main Court',
        address: '1111 S Figueroa St',
        city: 'Los Angeles',
        state: 'CA',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Practice Court',
        address: '1111 S Figueroa St',
        city: 'Los Angeles',
        state: 'CA',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const locationRefs = await Promise.all(
      locations.map(loc => addDoc(collection(db, 'locations'), loc))
    );
    console.log(`✅ Created ${locations.length} locations`);

    // Create 6 teams
    const teams = [
      'Lakers Youth',
      'Warriors Academy',
      'Celtics Elite',
      'Bulls Rising',
      'Sparks United',
      'Storm Force',
    ];

    // Create games with all statuses
    console.log('\n📝 Creating games...');
    const games = [
      // SCHEDULED game
      {
        tournamentId: tournamentRef.id,
        divisionId: divisionRefs[0].id,
        teamA: teams[0],
        teamB: teams[1],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-12-16T14:00:00')),
        locationId: locationRefs[0].id,
        court: '1',
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // IN PROGRESS game
      {
        tournamentId: tournamentRef.id,
        divisionId: divisionRefs[0].id,
        teamA: teams[2],
        teamB: teams[3],
        scoreA: 42,
        scoreB: 38,
        startTime: Timestamp.fromDate(new Date('2024-12-15T10:00:00')),
        locationId: locationRefs[0].id,
        court: 'A',
        status: 'in progress',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // COMPLETED game
      {
        tournamentId: tournamentRef.id,
        divisionId: divisionRefs[1].id,
        teamA: teams[4],
        teamB: teams[5],
        scoreA: 65,
        scoreB: 58,
        startTime: Timestamp.fromDate(new Date('2024-12-15T09:00:00')),
        locationId: locationRefs[1].id,
        court: '2',
        status: 'completed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Another SCHEDULED game
      {
        tournamentId: tournamentRef.id,
        divisionId: divisionRefs[1].id,
        teamA: teams[0],
        teamB: teams[4],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-12-16T16:00:00')),
        locationId: locationRefs[1].id,
        court: 'B',
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    await Promise.all(games.map(game => addDoc(collection(db, 'games'), game)));
    console.log(`✅ Created ${games.length} games`);

    console.log('\n✨ Reset and seed complete!\n');
    console.log('📊 Summary:');
    console.log(`   - 1 tournament`);
    console.log(`   - ${divisions.length} divisions`);
    console.log(`   - ${locations.length} locations`);
    console.log(`   - ${teams.length} teams`);
    console.log(`   - ${games.length} games (1 in progress, 2 scheduled, 1 completed)`);
    console.log('\n🔐 Test User Credentials:');
    console.log('   Admin: admin@courtside.test / Admin123!');
    console.log('   Scorekeeper: scorekeeper@courtside.test / Score123!');
    console.log('   User: user@courtside.test / User123!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

resetAndSeed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
