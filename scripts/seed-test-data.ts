/**
 * Seed script to add test tournament data to Firestore
 * Run with: npx ts-node scripts/seed-test-data.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Firebase config - using environment variables
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

async function seedTestData() {
  console.log('🌱 Starting to seed test data...\n');

  try {
    // Create test tournaments
    const tournaments = [
      {
        name: 'Summer Basketball Championship 2024',
        startDate: Timestamp.fromDate(new Date('2024-07-15')),
        endDate: Timestamp.fromDate(new Date('2024-07-20')),
        city: 'Los Angeles',
        state: 'CA',
        status: 'active',
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Fall Hoops Classic',
        startDate: Timestamp.fromDate(new Date('2024-09-10')),
        endDate: Timestamp.fromDate(new Date('2024-09-15')),
        city: 'San Diego',
        state: 'CA',
        status: 'upcoming',
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Winter Invitational',
        startDate: Timestamp.fromDate(new Date('2024-12-01')),
        endDate: Timestamp.fromDate(new Date('2024-12-05')),
        city: 'San Francisco',
        state: 'CA',
        status: 'upcoming',
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    console.log('📝 Creating tournaments...');
    const tournamentIds: string[] = [];
    
    for (const tournament of tournaments) {
      const docRef = await addDoc(collection(db, 'tournaments'), tournament);
      tournamentIds.push(docRef.id);
      console.log(`✅ Created tournament: ${tournament.name} (ID: ${docRef.id})`);
    }

    // Create divisions for the first tournament
    console.log('\n📝 Creating divisions...');
    const divisions = [
      {
        tournamentId: tournamentIds[0],
        name: 'Boys 14U',
        ageGroup: '14U',
        gender: 'male',
        skillLevel: 'Competitive',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        name: 'Girls 16U',
        ageGroup: '16U',
        gender: 'female',
        skillLevel: 'Elite',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        name: 'Boys 18U',
        ageGroup: '18U',
        gender: 'male',
        skillLevel: 'Elite',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const divisionIds: string[] = [];
    
    for (const division of divisions) {
      const docRef = await addDoc(collection(db, 'divisions'), division);
      divisionIds.push(docRef.id);
      console.log(`✅ Created division: ${division.name} (ID: ${docRef.id})`);
    }

    // Create locations
    console.log('\n📝 Creating locations...');
    const locations = [
      {
        name: 'Downtown Sports Complex',
        address: '123 Main Street',
        city: 'Los Angeles',
        state: 'CA',
        coordinates: {
          latitude: 34.0522,
          longitude: -118.2437,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Westside Recreation Center',
        address: '456 West Avenue',
        city: 'Los Angeles',
        state: 'CA',
        coordinates: {
          latitude: 34.0195,
          longitude: -118.4912,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const locationIds: string[] = [];
    
    for (const location of locations) {
      const docRef = await addDoc(collection(db, 'locations'), location);
      locationIds.push(docRef.id);
      console.log(`✅ Created location: ${location.name} (ID: ${docRef.id})`);
    }

    // Create games for the first division
    console.log('\n📝 Creating games...');
    const games = [
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: 'Lakers Youth',
        teamB: 'Warriors Academy',
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-07-15T10:00:00')),
        locationId: locationIds[0],
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: 'Clippers Elite',
        teamB: 'Kings Basketball',
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-07-15T12:00:00')),
        locationId: locationIds[1],
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[1],
        teamA: 'Phoenix Rising',
        teamB: 'Suns Academy',
        scoreA: 65,
        scoreB: 58,
        startTime: Timestamp.fromDate(new Date('2024-07-15T09:00:00')),
        locationId: locationIds[0],
        status: 'completed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    for (const game of games) {
      const docRef = await addDoc(collection(db, 'games'), game);
      console.log(`✅ Created game: ${game.teamA} vs ${game.teamB} (ID: ${docRef.id})`);
    }

    console.log('\n✨ Test data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${tournaments.length} tournaments`);
    console.log(`   - ${divisions.length} divisions`);
    console.log(`   - ${locations.length} locations`);
    console.log(`   - ${games.length} games`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seedTestData();
