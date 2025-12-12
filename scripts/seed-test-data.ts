/**
 * Seed script to add test tournament data to Firestore
 * Run with: npx ts-node scripts/seed-test-data.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

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
const auth = getAuth(app);

async function createTestUsers() {
  console.log('👥 Creating test user accounts...');
  
  const testUsers = [
    {
      email: 'admin@courtside.test',
      password: 'Admin123!',
      displayName: 'Admin User',
      role: 'admin',
    },
    {
      email: 'scorekeeper@courtside.test',
      password: 'Score123!',
      displayName: 'Scorekeeper User',
      role: 'scorekeeper',
    },
    {
      email: 'user@courtside.test',
      password: 'User123!',
      displayName: 'Regular User',
      role: 'user',
    },
  ];

  const createdUsers: Array<{ uid: string; email: string; role: string }> = [];

  for (const userData of testUsers) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      await updateProfile(userCredential.user, {
        displayName: userData.displayName,
      });

      const userProfile = {
        id: userCredential.user.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        followingTeams: [],
        followingGames: [],
        notificationsEnabled: true,
        createdAt: Timestamp.now(),
        lastActive: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);

      createdUsers.push({
        uid: userCredential.user.uid,
        email: userData.email,
        role: userData.role,
      });

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️  User already exists: ${userData.email}`);
      } else {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }
  }

  return createdUsers;
}

async function seedTestData() {
  console.log('🌱 Starting to seed test data...\n');

  try {
    // Create test users first
    const users = await createTestUsers();
    const adminUid = users.find(u => u.role === 'admin')?.uid || 'admin';

    console.log('\n📝 Creating tournaments...');
    
    // Create test tournaments with more variety
    const tournaments = [
      {
        name: 'Summer Basketball Championship 2024',
        startDate: Timestamp.fromDate(new Date('2024-07-15')),
        endDate: Timestamp.fromDate(new Date('2024-07-20')),
        city: 'Los Angeles',
        state: 'CA',
        status: 'active',
        createdBy: adminUid,
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
        createdBy: adminUid,
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
        createdBy: adminUid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Spring Showcase Tournament',
        startDate: Timestamp.fromDate(new Date('2025-03-20')),
        endDate: Timestamp.fromDate(new Date('2025-03-24')),
        city: 'Sacramento',
        state: 'CA',
        status: 'upcoming',
        createdBy: adminUid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Elite Youth Basketball League Finals',
        startDate: Timestamp.fromDate(new Date('2024-06-01')),
        endDate: Timestamp.fromDate(new Date('2024-06-05')),
        city: 'Oakland',
        state: 'CA',
        status: 'completed',
        createdBy: adminUid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const tournamentIds: string[] = [];
    
    for (const tournament of tournaments) {
      const docRef = await addDoc(collection(db, 'tournaments'), tournament);
      tournamentIds.push(docRef.id);
      console.log(`✅ Created tournament: ${tournament.name} (ID: ${docRef.id})`);
    }

    // Create divisions for multiple tournaments
    console.log('\n📝 Creating divisions...');
    const divisions = [
      // Summer Championship divisions
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
      {
        tournamentId: tournamentIds[0],
        name: 'Girls 14U',
        ageGroup: '14U',
        gender: 'female',
        skillLevel: 'Recreational',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Fall Classic divisions
      {
        tournamentId: tournamentIds[1],
        name: 'Boys 12U',
        ageGroup: '12U',
        gender: 'male',
        skillLevel: 'Competitive',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[1],
        name: 'Girls 18U',
        ageGroup: '18U',
        gender: 'female',
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

    // Create locations with more variety
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
      {
        name: 'Lakeside Basketball Arena',
        address: '789 Lake Drive',
        city: 'Los Angeles',
        state: 'CA',
        coordinates: {
          latitude: 34.0736,
          longitude: -118.2400,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Pacific Coast Gymnasium',
        address: '321 Ocean Boulevard',
        city: 'San Diego',
        state: 'CA',
        coordinates: {
          latitude: 32.7157,
          longitude: -117.1611,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Golden Gate Sports Center',
        address: '555 Bay Street',
        city: 'San Francisco',
        state: 'CA',
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
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

    // Create games with realistic variety
    console.log('\n📝 Creating games...');
    const teamNames = [
      'Lakers Youth', 'Warriors Academy', 'Clippers Elite', 'Kings Basketball',
      'Phoenix Rising', 'Suns Academy', 'Mavericks Select', 'Rockets Elite',
      'Thunder Youth', 'Blazers Academy', 'Spurs Select', 'Nuggets Elite',
      'Heat Rising', 'Celtics Academy', 'Bulls Select', 'Nets Elite'
    ];

    const games = [
      // Summer Championship - Boys 14U (scheduled)
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[0],
        teamB: teamNames[1],
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
        teamA: teamNames[2],
        teamB: teamNames[3],
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
        divisionId: divisionIds[0],
        teamA: teamNames[6],
        teamB: teamNames[7],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-07-15T14:00:00')),
        locationId: locationIds[2],
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Summer Championship - Girls 16U (in progress and completed)
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[1],
        teamA: teamNames[4],
        teamB: teamNames[5],
        scoreA: 65,
        scoreB: 58,
        startTime: Timestamp.fromDate(new Date('2024-07-15T09:00:00')),
        locationId: locationIds[0],
        status: 'completed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[1],
        teamA: teamNames[12],
        teamB: teamNames[13],
        scoreA: 42,
        scoreB: 38,
        startTime: Timestamp.fromDate(new Date('2024-07-15T11:00:00')),
        locationId: locationIds[1],
        status: 'in_progress',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Summer Championship - Boys 18U
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[8],
        teamB: teamNames[9],
        scoreA: 78,
        scoreB: 72,
        startTime: Timestamp.fromDate(new Date('2024-07-15T08:00:00')),
        locationId: locationIds[2],
        status: 'completed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[10],
        teamB: teamNames[11],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-07-15T16:00:00')),
        locationId: locationIds[0],
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Summer Championship - Girls 14U
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[3],
        teamA: teamNames[14],
        teamB: teamNames[15],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-07-15T13:00:00')),
        locationId: locationIds[1],
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Fall Classic - Boys 12U
      {
        tournamentId: tournamentIds[1],
        divisionId: divisionIds[4],
        teamA: teamNames[0],
        teamB: teamNames[3],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-09-10T10:00:00')),
        locationId: locationIds[3],
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[1],
        divisionId: divisionIds[4],
        teamA: teamNames[6],
        teamB: teamNames[9],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-09-10T12:00:00')),
        locationId: locationIds[3],
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Fall Classic - Girls 18U
      {
        tournamentId: tournamentIds[1],
        divisionId: divisionIds[5],
        teamA: teamNames[12],
        teamB: teamNames[15],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-09-10T14:00:00')),
        locationId: locationIds[3],
        status: 'scheduled',
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
    console.log(`   - ${users.length} user accounts`);
    console.log(`   - ${tournaments.length} tournaments`);
    console.log(`   - ${divisions.length} divisions`);
    console.log(`   - ${locations.length} locations`);
    console.log(`   - ${games.length} games`);
    console.log('\n🔐 Test User Credentials:');
    console.log('   Admin: admin@courtside.test / Admin123!');
    console.log('   Scorekeeper: scorekeeper@courtside.test / Score123!');
    console.log('   User: user@courtside.test / User123!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seedTestData();
