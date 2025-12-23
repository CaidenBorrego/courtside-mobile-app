/**
 * Seed script to add test tournament data to Firestore
 * Run with: npx ts-node scripts/seed-test-data.ts
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  Timestamp, 
  doc, 
  setDoc,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'firebase/auth';

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

// Helper function to find existing document by name
async function findDocumentByName(collectionName: string, name: string) {
  const q = query(collection(db, collectionName), where('name', '==', name));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
}

// Helper function to find existing bracket by name and division
async function findBracketByNameAndDivision(name: string, divisionId: string) {
  const q = query(
    collection(db, 'brackets'),
    where('name', '==', name),
    where('divisionId', '==', divisionId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
}

// Helper function to find existing pool by name and division
async function findPoolByNameAndDivision(name: string, divisionId: string) {
  const q = query(
    collection(db, 'pools'),
    where('name', '==', name),
    where('divisionId', '==', divisionId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
}

// Helper function to upsert (update or insert) a document
async function upsertDocument(collectionName: string, data: any, uniqueField: string = 'name') {
  let existing = null;
  
  // Special handling for brackets and pools - match by name AND divisionId
  if (collectionName === 'brackets' && data.divisionId) {
    existing = await findBracketByNameAndDivision(data.name, data.divisionId);
  } else if (collectionName === 'pools' && data.divisionId) {
    existing = await findPoolByNameAndDivision(data.name, data.divisionId);
  } else {
    existing = await findDocumentByName(collectionName, data[uniqueField]);
  }
  
  if (existing) {
    // Update existing document
    const docRef = doc(db, collectionName, existing.id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
    return { id: existing.id, isNew: false };
  } else {
    // Create new document
    const docRef = await addDoc(collection(db, collectionName), data);
    return { id: docRef.id, isNew: true };
  }
}

// Helper function to find existing game by teams, time, and optional bracket/pool
async function findGameByTeamsAndTime(teamA: string, teamB: string, startTime: Timestamp, bracketId?: string, poolId?: string) {
  const q = query(
    collection(db, 'games'),
    where('teamA', '==', teamA),
    where('teamB', '==', teamB)
  );
  const querySnapshot = await getDocs(q);
  
  // Check if any match the start time and bracket/pool
  for (const doc of querySnapshot.docs) {
    const gameData = doc.data();
    if (gameData.startTime.seconds === startTime.seconds) {
      // If bracketId is specified, must match
      if (bracketId && gameData.bracketId !== bracketId) {
        continue;
      }
      // If poolId is specified, must match
      if (poolId && gameData.poolId !== poolId) {
        continue;
      }
      return { id: doc.id, data: gameData };
    }
  }
  return null;
}

// Helper function to upsert a game
async function upsertGame(gameData: any) {
  const existing = await findGameByTeamsAndTime(
    gameData.teamA, 
    gameData.teamB, 
    gameData.startTime,
    gameData.bracketId,
    gameData.poolId
  );
  
  if (existing) {
    // Update existing game
    const docRef = doc(db, 'games', existing.id);
    await updateDoc(docRef, { ...gameData, updatedAt: Timestamp.now() });
    return { id: existing.id, isNew: false };
  } else {
    // Create new game
    const docRef = await addDoc(collection(db, 'games'), gameData);
    return { id: docRef.id, isNew: true };
  }
}

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

  const createdUsers: { uid: string; email: string; role: string }[] = [];

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
    
    // Sign in as admin for subsequent operations
    console.log('\n🔐 Signing in as admin...');
    try {
      await signInWithEmailAndPassword(auth, 'admin@courtside.test', 'Admin123!');
      console.log('✅ Signed in as admin');
    } catch (signInError: any) {
      console.log('⚠️  Could not sign in as admin:', signInError.message);
      console.log('   Continuing with unauthenticated access (requires open rules)');
    }

    console.log('\n📝 Creating tournaments...');
    
    // Create test tournaments with more variety
    const tournaments = [
      {
        name: 'Summer Basketball Championship 2024',
        startDate: Timestamp.fromDate(new Date('2024-07-15')),
        endDate: Timestamp.fromDate(new Date('2024-07-20')),
        address: '1111 S Figueroa St',
        city: 'Los Angeles',
        state: 'CA',
        status: 'active',
        createdBy: adminUid,
        imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Fall Hoops Classic',
        startDate: Timestamp.fromDate(new Date('2024-09-10')),
        endDate: Timestamp.fromDate(new Date('2024-09-15')),
        address: '2131 Pan American Plaza',
        city: 'San Diego',
        state: 'CA',
        status: 'upcoming',
        createdBy: adminUid,
        imageUrl: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=800&h=400&fit=crop',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Winter Invitational',
        startDate: Timestamp.fromDate(new Date('2024-12-01')),
        endDate: Timestamp.fromDate(new Date('2024-12-05')),
        address: '1199 Folsom St',
        city: 'San Francisco',
        state: 'CA',
        status: 'upcoming',
        createdBy: adminUid,
        imageUrl: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&h=400&fit=crop',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Spring Showcase Tournament',
        startDate: Timestamp.fromDate(new Date('2025-03-20')),
        endDate: Timestamp.fromDate(new Date('2025-03-24')),
        address: '1 Sports Parkway',
        city: 'Sacramento',
        state: 'CA',
        status: 'upcoming',
        createdBy: adminUid,
        imageUrl: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&h=400&fit=crop',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'Elite Youth Basketball League Finals',
        startDate: Timestamp.fromDate(new Date('2024-06-01')),
        endDate: Timestamp.fromDate(new Date('2024-06-05')),
        address: '7000 Coliseum Way',
        city: 'Oakland',
        state: 'CA',
        status: 'completed',
        createdBy: adminUid,
        imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=800&h=400&fit=crop',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const tournamentIds: string[] = [];
    
    for (const tournament of tournaments) {
      const result = await upsertDocument('tournaments', tournament);
      tournamentIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} tournament: ${tournament.name} (ID: ${result.id})`);
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
      const result = await upsertDocument('divisions', division);
      divisionIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} division: ${division.name} (ID: ${result.id})`);
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
      const result = await upsertDocument('locations', location);
      locationIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} location: ${location.name} (ID: ${result.id})`);
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
        court: '1',
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        court: 'A',
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
        court: '2',
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
        court: 'B',
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
        court: '3',
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
      const result = await upsertGame(game);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} game: ${game.teamA} vs ${game.teamB} (ID: ${result.id})`);
    }

    // Create pools for testing pool play
    console.log('\n📝 Creating pools...');
    const pools = [
      // Pool-only tournament (Summer Championship - Boys 14U)
      {
        divisionId: divisionIds[0],
        tournamentId: tournamentIds[0],
        name: 'Pool A',
        teams: [teamNames[0], teamNames[1], teamNames[2], teamNames[3]],
        advancementCount: 2,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        divisionId: divisionIds[0],
        tournamentId: tournamentIds[0],
        name: 'Pool B',
        teams: [teamNames[4], teamNames[5], teamNames[6], teamNames[7]],
        advancementCount: 2,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Hybrid tournament (Girls 16U)
      {
        divisionId: divisionIds[1],
        tournamentId: tournamentIds[0],
        name: 'Pool A',
        teams: [teamNames[8], teamNames[9], teamNames[10], teamNames[11]],
        advancementCount: 2,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        divisionId: divisionIds[1],
        tournamentId: tournamentIds[0],
        name: 'Pool B',
        teams: [teamNames[12], teamNames[13], teamNames[14], teamNames[15]],
        advancementCount: 2,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const poolIds: string[] = [];
    
    for (const pool of pools) {
      const result = await upsertDocument('pools', pool);
      poolIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} pool: ${pool.name} in division ${pool.divisionId} (ID: ${result.id})`);
    }

    // Create pool games
    console.log('\n📝 Creating pool games...');
    const poolGames = [
      // Pool A games (Boys 14U)
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[0],
        teamB: teamNames[1],
        scoreA: 68,
        scoreB: 62,
        startTime: Timestamp.fromDate(new Date('2024-07-15T09:00:00')),
        locationId: locationIds[0],
        court: '1',
        status: 'completed',
        poolId: poolIds[0],
        poolGameNumber: 1,
        gameLabel: 'Pool A Game 1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[2],
        teamB: teamNames[3],
        scoreA: 71,
        scoreB: 65,
        startTime: Timestamp.fromDate(new Date('2024-07-15T09:00:00')),
        locationId: locationIds[1],
        court: '2',
        status: 'completed',
        poolId: poolIds[0],
        poolGameNumber: 2,
        gameLabel: 'Pool A Game 2',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[0],
        teamB: teamNames[2],
        scoreA: 75,
        scoreB: 69,
        startTime: Timestamp.fromDate(new Date('2024-07-15T11:00:00')),
        locationId: locationIds[0],
        court: '1',
        status: 'completed',
        poolId: poolIds[0],
        poolGameNumber: 3,
        gameLabel: 'Pool A Game 3',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[1],
        teamB: teamNames[3],
        scoreA: 64,
        scoreB: 70,
        startTime: Timestamp.fromDate(new Date('2024-07-15T11:00:00')),
        locationId: locationIds[1],
        court: '2',
        status: 'completed',
        poolId: poolIds[0],
        poolGameNumber: 4,
        gameLabel: 'Pool A Game 4',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[0],
        teamB: teamNames[3],
        scoreA: 72,
        scoreB: 68,
        startTime: Timestamp.fromDate(new Date('2024-07-15T13:00:00')),
        locationId: locationIds[0],
        court: '1',
        status: 'completed',
        poolId: poolIds[0],
        poolGameNumber: 5,
        gameLabel: 'Pool A Game 5',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[1],
        teamB: teamNames[2],
        scoreA: 66,
        scoreB: 73,
        startTime: Timestamp.fromDate(new Date('2024-07-15T13:00:00')),
        locationId: locationIds[1],
        court: '2',
        status: 'completed',
        poolId: poolIds[0],
        poolGameNumber: 6,
        gameLabel: 'Pool A Game 6',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Pool B games (Boys 14U)
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[4],
        teamB: teamNames[5],
        scoreA: 70,
        scoreB: 65,
        startTime: Timestamp.fromDate(new Date('2024-07-15T10:00:00')),
        locationId: locationIds[2],
        court: '3',
        status: 'completed',
        poolId: poolIds[1],
        poolGameNumber: 1,
        gameLabel: 'Pool B Game 1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[6],
        teamB: teamNames[7],
        scoreA: 68,
        scoreB: 72,
        startTime: Timestamp.fromDate(new Date('2024-07-15T10:00:00')),
        locationId: locationIds[0],
        court: '3',
        status: 'completed',
        poolId: poolIds[1],
        poolGameNumber: 2,
        gameLabel: 'Pool B Game 2',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[4],
        teamB: teamNames[6],
        scoreA: 74,
        scoreB: 70,
        startTime: Timestamp.fromDate(new Date('2024-07-15T12:00:00')),
        locationId: locationIds[2],
        court: '3',
        status: 'completed',
        poolId: poolIds[1],
        poolGameNumber: 3,
        gameLabel: 'Pool B Game 3',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[5],
        teamB: teamNames[7],
        scoreA: 67,
        scoreB: 71,
        startTime: Timestamp.fromDate(new Date('2024-07-15T12:00:00')),
        locationId: locationIds[0],
        court: '3',
        status: 'completed',
        poolId: poolIds[1],
        poolGameNumber: 4,
        gameLabel: 'Pool B Game 4',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[4],
        teamB: teamNames[7],
        scoreA: 69,
        scoreB: 73,
        startTime: Timestamp.fromDate(new Date('2024-07-15T14:00:00')),
        locationId: locationIds[2],
        court: '3',
        status: 'completed',
        poolId: poolIds[1],
        poolGameNumber: 5,
        gameLabel: 'Pool B Game 5',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[0],
        teamA: teamNames[5],
        teamB: teamNames[6],
        scoreA: 64,
        scoreB: 75,
        startTime: Timestamp.fromDate(new Date('2024-07-15T14:00:00')),
        locationId: locationIds[0],
        court: '3',
        status: 'completed',
        poolId: poolIds[1],
        poolGameNumber: 6,
        gameLabel: 'Pool B Game 6',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    for (const game of poolGames) {
      const result = await upsertGame(game);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} pool game: ${game.gameLabel} (ID: ${result.id})`);
    }

    // Create brackets for testing bracket play
    console.log('\n📝 Creating brackets...');
    const brackets = [
      // Bracket-only tournament (Boys 18U)
      {
        divisionId: divisionIds[2],
        tournamentId: tournamentIds[0],
        name: 'Championship Bracket',
        size: 8,
        seedingSource: 'manual',
        seeds: [
          { position: 1, teamName: teamNames[0] },
          { position: 2, teamName: teamNames[1] },
          { position: 3, teamName: teamNames[2] },
          { position: 4, teamName: teamNames[3] },
          { position: 5, teamName: teamNames[4] },
          { position: 6, teamName: teamNames[5] },
          { position: 7, teamName: teamNames[6] },
          { position: 8, teamName: teamNames[7] },
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Hybrid tournament bracket (Girls 16U) - will be seeded from pools
      {
        divisionId: divisionIds[1],
        tournamentId: tournamentIds[0],
        name: 'Gold Bracket',
        size: 4,
        seedingSource: 'pools',
        seeds: [
          { position: 1, sourcePoolId: poolIds[2], sourcePoolRank: 1 },
          { position: 2, sourcePoolId: poolIds[3], sourcePoolRank: 1 },
          { position: 3, sourcePoolId: poolIds[2], sourcePoolRank: 2 },
          { position: 4, sourcePoolId: poolIds[3], sourcePoolRank: 2 },
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const bracketIds: string[] = [];
    
    for (const bracket of brackets) {
      const result = await upsertDocument('brackets', bracket);
      bracketIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} bracket: ${bracket.name} in division ${bracket.divisionId} (ID: ${result.id})`);
    }

    // Create bracket games
    console.log('\n📝 Creating bracket games...');
    const bracketGames = [
      // Championship Bracket - Quarterfinals
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[0],
        teamB: teamNames[7],
        scoreA: 78,
        scoreB: 65,
        startTime: Timestamp.fromDate(new Date('2024-07-16T09:00:00')),
        locationId: locationIds[0],
        court: '1',
        status: 'completed',
        bracketId: bracketIds[0],
        bracketRound: 'Quarterfinals',
        bracketPosition: 1,
        dependsOnGames: [],
        gameLabel: 'Championship Bracket Quarterfinals Game 1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[3],
        teamB: teamNames[4],
        scoreA: 72,
        scoreB: 69,
        startTime: Timestamp.fromDate(new Date('2024-07-16T09:00:00')),
        locationId: locationIds[1],
        court: '2',
        status: 'completed',
        bracketId: bracketIds[0],
        bracketRound: 'Quarterfinals',
        bracketPosition: 2,
        dependsOnGames: [],
        gameLabel: 'Championship Bracket Quarterfinals Game 2',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[2],
        teamB: teamNames[5],
        scoreA: 81,
        scoreB: 74,
        startTime: Timestamp.fromDate(new Date('2024-07-16T11:00:00')),
        locationId: locationIds[0],
        court: '1',
        status: 'completed',
        bracketId: bracketIds[0],
        bracketRound: 'Quarterfinals',
        bracketPosition: 3,
        dependsOnGames: [],
        gameLabel: 'Championship Bracket Quarterfinals Game 3',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[1],
        teamB: teamNames[6],
        scoreA: 76,
        scoreB: 70,
        startTime: Timestamp.fromDate(new Date('2024-07-16T11:00:00')),
        locationId: locationIds[1],
        court: '2',
        status: 'completed',
        bracketId: bracketIds[0],
        bracketRound: 'Quarterfinals',
        bracketPosition: 4,
        dependsOnGames: [],
        gameLabel: 'Championship Bracket Quarterfinals Game 4',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Championship Bracket - Semifinals
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[0],
        teamB: teamNames[3],
        scoreA: 84,
        scoreB: 79,
        startTime: Timestamp.fromDate(new Date('2024-07-16T14:00:00')),
        locationId: locationIds[0],
        court: '1',
        status: 'completed',
        bracketId: bracketIds[0],
        bracketRound: 'Semifinals',
        bracketPosition: 1,
        dependsOnGames: [],
        gameLabel: 'Championship Bracket Semifinals Game 1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[2],
        teamB: teamNames[1],
        scoreA: 77,
        scoreB: 82,
        startTime: Timestamp.fromDate(new Date('2024-07-16T14:00:00')),
        locationId: locationIds[1],
        court: '2',
        status: 'completed',
        bracketId: bracketIds[0],
        bracketRound: 'Semifinals',
        bracketPosition: 2,
        dependsOnGames: [],
        gameLabel: 'Championship Bracket Semifinals Game 2',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Championship Bracket - Finals
      {
        tournamentId: tournamentIds[0],
        divisionId: divisionIds[2],
        teamA: teamNames[0],
        teamB: teamNames[1],
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date('2024-07-16T18:00:00')),
        locationId: locationIds[0],
        court: '1',
        status: 'scheduled',
        bracketId: bracketIds[0],
        bracketRound: 'Finals',
        bracketPosition: 1,
        dependsOnGames: [],
        gameLabel: 'Championship Bracket Finals',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    for (const game of bracketGames) {
      const result = await upsertGame(game);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} bracket game: ${game.gameLabel} (ID: ${result.id})`);
    }

    // ========================================
    // HANGRY JOE'S HAYS HAWKS CHRISTMAS CLASSIC
    // ========================================
    console.log('\n🎄 Creating Hangry Joe\'s Hays Hawks Christmas Classic...');
    
    // Create tournament
    const christmasClassic = {
      name: 'Hangry Joe\'s Hays Hawks Christmas Classic',
      startDate: Timestamp.fromDate(new Date('2025-12-29')),
      endDate: Timestamp.fromDate(new Date('2025-12-30')),
      address: 'Hays High School',
      city: 'Hays',
      state: 'TX',
      status: 'upcoming',
      createdBy: adminUid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const christmasResult = await upsertDocument('tournaments', christmasClassic);
    const christmasTournamentId = christmasResult.id;
    console.log(`${christmasResult.isNew ? '✅ Created' : '🔄 Updated'} tournament: ${christmasClassic.name}`);
    
    // Create divisions (Red and Blue)
    console.log('\n📝 Creating divisions...');
    const redDivision = {
      tournamentId: christmasTournamentId,
      name: 'Red',
      ageGroup: 'Varsity',
      gender: 'mixed',
      skillLevel: 'Competitive',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const blueDivision = {
      tournamentId: christmasTournamentId,
      name: 'Blue',
      ageGroup: 'Varsity',
      gender: 'mixed',
      skillLevel: 'Competitive',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const redDivResult = await upsertDocument('divisions', redDivision);
    const redDivisionId = redDivResult.id;
    console.log(`${redDivResult.isNew ? '✅ Created' : '🔄 Updated'} division: Red`);
    
    const blueDivResult = await upsertDocument('divisions', blueDivision);
    const blueDivisionId = blueDivResult.id;
    console.log(`${blueDivResult.isNew ? '✅ Created' : '🔄 Updated'} division: Blue`);
    
    // Create locations
    console.log('\n📝 Creating locations...');
    const christmasLocations = [
      { name: 'Bales Gym', address: 'Hays High School', city: 'Hays', state: 'TX' },
      { name: 'Graham Gym', address: 'Hays High School', city: 'Hays', state: 'TX' },
      { name: 'Red Gym', address: 'Hays High School', city: 'Hays', state: 'TX' },
      { name: 'Barton MS', address: 'Barton Middle School', city: 'Hays', state: 'TX' },
    ];
    
    const christmasLocationIds: string[] = [];
    for (const loc of christmasLocations) {
      const locData = {
        ...loc,
        coordinates: { latitude: 30.0, longitude: -97.9 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const result = await upsertDocument('locations', locData);
      christmasLocationIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} location: ${loc.name}`);
    }
    
    const [balesGymId, grahamGymId, redGymId, bartonMSId] = christmasLocationIds;
    
    // Create pools
    console.log('\n📝 Creating pools...');
    const christmasPools = [
      // Red Division Pools
      { divisionId: redDivisionId, name: 'Pool A', teams: ['Hays', 'Elgin', 'Anderson'] },
      { divisionId: redDivisionId, name: 'Pool B', teams: ['Pebble Hills', 'Cedar Creek', 'La Joya'] },
      { divisionId: redDivisionId, name: 'Pool C', teams: ['Rockdale', 'Dripping Springs', 'Georgetown Eastview'] },
      { divisionId: redDivisionId, name: 'Pool D', teams: ['Westwood', 'Connally', 'Austin'] },
      // Blue Division Pools
      { divisionId: blueDivisionId, name: 'Pool W', teams: ['Regents', 'Bastrop', 'Stephenville'] },
      { divisionId: blueDivisionId, name: 'Pool X', teams: ['Graham', 'Yorktown', 'Canyon Lake'] },
      { divisionId: blueDivisionId, name: 'Pool Y', teams: ['Fulton', 'Austin NE', 'Port Allen'] },
      { divisionId: blueDivisionId, name: 'Pool Z', teams: ['Burnet', 'Travis', 'Hyde Park'] },
    ];
    
    const christmasPoolIds: string[] = [];
    for (const pool of christmasPools) {
      const poolData = {
        ...pool,
        tournamentId: christmasTournamentId,
        advancementCount: 3,
        tiebreaker: 'pointDifferential',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const result = await upsertDocument('pools', poolData);
      christmasPoolIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} pool: ${pool.name}`);
    }
    
    const [poolAId, poolBId, poolCId, poolDId, poolWId, poolXId, poolYId, poolZId] = christmasPoolIds;
    
    // Create pool games (December 29)
    console.log('\n📝 Creating pool games...');
    const dec29 = '2025-12-29';
    const poolGamesData = [
      // Pool A
      { poolId: poolAId, divisionId: redDivisionId, teamA: 'Hays', teamB: 'Elgin', time: '09:30', locationId: balesGymId, court: 'Bales Gym', label: 'Pool A Game 1' },
      { poolId: poolAId, divisionId: redDivisionId, teamA: 'Elgin', teamB: 'Anderson', time: '13:40', locationId: grahamGymId, court: 'Graham Gym', label: 'Pool A Game 2' },
      { poolId: poolAId, divisionId: redDivisionId, teamA: 'Hays', teamB: 'Anderson', time: '17:40', locationId: balesGymId, court: 'Bales Gym', label: 'Pool A Game 3' },
      // Pool B
      { poolId: poolBId, divisionId: redDivisionId, teamA: 'Pebble Hills', teamB: 'Cedar Creek', time: '11:00', locationId: balesGymId, court: 'Bales Gym', label: 'Pool B Game 1' },
      { poolId: poolBId, divisionId: redDivisionId, teamA: 'Cedar Creek', teamB: 'La Joya', time: '15:00', locationId: grahamGymId, court: 'Graham Gym', label: 'Pool B Game 2' },
      { poolId: poolBId, divisionId: redDivisionId, teamA: 'La Joya', teamB: 'Pebble Hills', time: '19:00', locationId: balesGymId, court: 'Bales Gym', label: 'Pool B Game 3' },
      // Pool C
      { poolId: poolCId, divisionId: redDivisionId, teamA: 'Rockdale', teamB: 'Dripping Springs', time: '09:30', locationId: grahamGymId, court: 'Graham Gym', label: 'Pool C Game 1' },
      { poolId: poolCId, divisionId: redDivisionId, teamA: 'Georgetown Eastview', teamB: 'Rockdale', time: '13:40', locationId: balesGymId, court: 'Bales Gym', label: 'Pool C Game 2' },
      { poolId: poolCId, divisionId: redDivisionId, teamA: 'Dripping Springs', teamB: 'Georgetown Eastview', time: '17:40', locationId: bartonMSId, court: 'Barton MS', label: 'Pool C Game 3' },
      // Pool D
      { poolId: poolDId, divisionId: redDivisionId, teamA: 'Westwood', teamB: 'Connally', time: '11:00', locationId: grahamGymId, court: 'Graham Gym', label: 'Pool D Game 1' },
      { poolId: poolDId, divisionId: redDivisionId, teamA: 'Westwood', teamB: 'Austin', time: '15:00', locationId: balesGymId, court: 'Bales Gym', label: 'Pool D Game 2' },
      { poolId: poolDId, divisionId: redDivisionId, teamA: 'Austin', teamB: 'Connally', time: '19:00', locationId: grahamGymId, court: 'Graham Gym', label: 'Pool D Game 3' },
      // Pool W
      { poolId: poolWId, divisionId: blueDivisionId, teamA: 'Regents', teamB: 'Bastrop', time: '09:30', locationId: redGymId, court: 'Red Gym', label: 'Pool W Game 1' },
      { poolId: poolWId, divisionId: blueDivisionId, teamA: 'Stephenville', teamB: 'Regents', time: '13:40', locationId: redGymId, court: 'Red Gym', label: 'Pool W Game 2' },
      { poolId: poolWId, divisionId: blueDivisionId, teamA: 'Bastrop', teamB: 'Stephenville', time: '17:40', locationId: redGymId, court: 'Red Gym', label: 'Pool W Game 3' },
      // Pool X
      { poolId: poolXId, divisionId: blueDivisionId, teamA: 'Graham', teamB: 'Yorktown', time: '09:30', locationId: bartonMSId, court: 'Barton MS', label: 'Pool X Game 1' },
      { poolId: poolXId, divisionId: blueDivisionId, teamA: 'Yorktown', teamB: 'Canyon Lake', time: '13:40', locationId: bartonMSId, court: 'Barton MS', label: 'Pool X Game 2' },
      { poolId: poolXId, divisionId: blueDivisionId, teamA: 'Canyon Lake', teamB: 'Graham', time: '17:40', locationId: grahamGymId, court: 'Graham Gym', label: 'Pool X Game 3' },
      // Pool Y
      { poolId: poolYId, divisionId: blueDivisionId, teamA: 'Fulton', teamB: 'Austin NE', time: '11:00', locationId: redGymId, court: 'Red Gym', label: 'Pool Y Game 1' },
      { poolId: poolYId, divisionId: blueDivisionId, teamA: 'Austin NE', teamB: 'Port Allen', time: '15:00', locationId: bartonMSId, court: 'Barton MS', label: 'Pool Y Game 2' },
      { poolId: poolYId, divisionId: blueDivisionId, teamA: 'Fulton', teamB: 'Port Allen', time: '19:00', locationId: redGymId, court: 'Red Gym', label: 'Pool Y Game 3' },
      // Pool Z
      { poolId: poolZId, divisionId: blueDivisionId, teamA: 'Burnet', teamB: 'Travis', time: '11:00', locationId: bartonMSId, court: 'Barton MS', label: 'Pool Z Game 1' },
      { poolId: poolZId, divisionId: blueDivisionId, teamA: 'Travis', teamB: 'Hyde Park', time: '15:00', locationId: redGymId, court: 'Red Gym', label: 'Pool Z Game 2' },
      { poolId: poolZId, divisionId: blueDivisionId, teamA: 'Hyde Park', teamB: 'Burnet', time: '19:00', locationId: bartonMSId, court: 'Barton MS', label: 'Pool Z Game 3' },
    ];
    
    for (const game of poolGamesData) {
      const gameData = {
        tournamentId: christmasTournamentId,
        divisionId: game.divisionId,
        poolId: game.poolId,
        teamA: game.teamA,
        teamB: game.teamB,
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date(`${dec29}T${game.time}:00`)),
        locationId: game.locationId,
        court: game.court,
        status: 'scheduled',
        gameLabel: game.label,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const result = await upsertGame(gameData);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} ${game.label}`);
    }
    
    // Create brackets
    console.log('\n📝 Creating brackets...');
    const christmasBrackets = [
      // Red Division Brackets
      { divisionId: redDivisionId, name: 'Gold Bracket', size: 4, seedingSource: 'pools' },
      { divisionId: redDivisionId, name: 'Silver Bracket', size: 4, seedingSource: 'pools' },
      { divisionId: redDivisionId, name: 'Bronze Bracket', size: 4, seedingSource: 'pools' },
      // Blue Division Brackets
      { divisionId: blueDivisionId, name: 'Gold Bracket', size: 4, seedingSource: 'pools' },
      { divisionId: blueDivisionId, name: 'Silver Bracket', size: 4, seedingSource: 'pools' },
      { divisionId: blueDivisionId, name: 'Bronze Bracket', size: 4, seedingSource: 'pools' },
    ];
    
    const christmasBracketIds: string[] = [];
    for (const bracket of christmasBrackets) {
      const bracketData = {
        ...bracket,
        tournamentId: christmasTournamentId,
        seeds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const result = await upsertDocument('brackets', bracketData);
      christmasBracketIds.push(result.id);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} ${bracket.divisionId === redDivisionId ? 'Red' : 'Blue'} ${bracket.name}`);
    }
    
    const [redGoldId, redSilverId, redBronzeId, blueGoldId, blueSilverId, blueBronzeId] = christmasBracketIds;
    
    // Create bracket games (December 30)
    console.log('\n📝 Creating bracket games...');
    const dec30 = '2025-12-30';
    const bracketGamesData = [
      // Red Gold Bracket
      { bracketId: redGoldId, divisionId: redDivisionId, label: 'Red Gold Semifinal 1', teamA: '1st Pool A', teamB: '1st Pool B', time: '13:00', locationId: balesGymId, court: 'Bales Gym', round: 'Semifinals', position: 1 },
      { bracketId: redGoldId, divisionId: redDivisionId, label: 'Red Gold Semifinal 2', teamA: '1st Pool C', teamB: '1st Pool D', time: '13:00', locationId: redGymId, court: 'Red Gym', round: 'Semifinals', position: 2 },
      { bracketId: redGoldId, divisionId: redDivisionId, label: 'Red Gold Championship', teamA: 'Winner SF1', teamB: 'Winner SF2', time: '19:40', locationId: balesGymId, court: 'Bales Gym', round: 'Finals', position: 1 },
      { bracketId: redGoldId, divisionId: redDivisionId, label: 'Red Gold 3rd Place', teamA: 'Loser SF1', teamB: 'Loser SF2', time: '19:40', locationId: grahamGymId, court: 'Graham Gym', round: '3rd Place', position: 2 },
      // Red Silver Bracket
      { bracketId: redSilverId, divisionId: redDivisionId, label: 'Red Silver Semifinal 1', teamA: '2nd Pool A', teamB: '2nd Pool B', time: '11:40', locationId: balesGymId, court: 'Bales Gym', round: 'Semifinals', position: 1 },
      { bracketId: redSilverId, divisionId: redDivisionId, label: 'Red Silver Semifinal 2', teamA: '2nd Pool C', teamB: '2nd Pool D', time: '11:40', locationId: grahamGymId, court: 'Graham Gym', round: 'Semifinals', position: 2 },
      { bracketId: redSilverId, divisionId: redDivisionId, label: 'Red Silver Championship', teamA: 'Winner SF1', teamB: 'Winner SF2', time: '18:20', locationId: grahamGymId, court: 'Graham Gym', round: 'Finals', position: 1 },
      { bracketId: redSilverId, divisionId: redDivisionId, label: 'Red Silver 3rd Place', teamA: 'Loser SF1', teamB: 'Loser SF2', time: '17:00', locationId: bartonMSId, court: 'Barton MS', round: '3rd Place', position: 2 },
      // Red Bronze Bracket
      { bracketId: redBronzeId, divisionId: redDivisionId, label: 'Red Bronze Semifinal 1', teamA: '3rd Pool C', teamB: '3rd Pool D', time: '09:00', locationId: redGymId, court: 'Red Gym', round: 'Semifinals', position: 1 },
      { bracketId: redBronzeId, divisionId: redDivisionId, label: 'Red Bronze Semifinal 2', teamA: '3rd Pool A', teamB: '3rd Pool B', time: '09:00', locationId: balesGymId, court: 'Bales Gym', round: 'Semifinals', position: 2 },
      { bracketId: redBronzeId, divisionId: redDivisionId, label: 'Red Bronze Championship', teamA: 'Winner SF1', teamB: 'Winner SF2', time: '15:40', locationId: balesGymId, court: 'Bales Gym', round: 'Finals', position: 1 },
      { bracketId: redBronzeId, divisionId: redDivisionId, label: 'Red Bronze 3rd Place', teamA: 'Loser SF1', teamB: 'Loser SF2', time: '15:40', locationId: grahamGymId, court: 'Graham Gym', round: '3rd Place', position: 2 },
      // Blue Gold Bracket
      { bracketId: blueGoldId, divisionId: blueDivisionId, label: 'Blue Gold Semifinal 1', teamA: '1st Pool W', teamB: '1st Pool X', time: '13:00', locationId: grahamGymId, court: 'Graham Gym', round: 'Semifinals', position: 1 },
      { bracketId: blueGoldId, divisionId: blueDivisionId, label: 'Blue Gold Semifinal 2', teamA: '1st Pool Y', teamB: '1st Pool Z', time: '13:00', locationId: bartonMSId, court: 'Barton MS', round: 'Semifinals', position: 2 },
      { bracketId: blueGoldId, divisionId: blueDivisionId, label: 'Blue Gold Championship', teamA: 'Winner SF1', teamB: 'Winner SF2', time: '18:20', locationId: balesGymId, court: 'Bales Gym', round: 'Finals', position: 1 },
      { bracketId: blueGoldId, divisionId: blueDivisionId, label: 'Blue Gold 3rd Place', teamA: 'Loser SF1', teamB: 'Loser SF2', time: '17:00', locationId: redGymId, court: 'Red Gym', round: '3rd Place', position: 2 },
      // Blue Silver Bracket
      { bracketId: blueSilverId, divisionId: blueDivisionId, label: 'Blue Silver Semifinal 1', teamA: '2nd Pool W', teamB: '2nd Pool X', time: '11:40', locationId: bartonMSId, court: 'Barton MS', round: 'Semifinals', position: 1 },
      { bracketId: blueSilverId, divisionId: blueDivisionId, label: 'Blue Silver Semifinal 2', teamA: '2nd Pool Y', teamB: '2nd Pool Z', time: '11:40', locationId: redGymId, court: 'Red Gym', round: 'Semifinals', position: 2 },
      { bracketId: blueSilverId, divisionId: blueDivisionId, label: 'Blue Silver Championship', teamA: 'Winner SF1', teamB: 'Winner SF2', time: '15:40', locationId: bartonMSId, court: 'Barton MS', round: 'Finals', position: 1 },
      { bracketId: blueSilverId, divisionId: blueDivisionId, label: 'Blue Silver 3rd Place', teamA: 'Loser SF1', teamB: 'Loser SF2', time: '15:40', locationId: redGymId, court: 'Red Gym', round: '3rd Place', position: 2 },
      // Blue Bronze Bracket
      { bracketId: blueBronzeId, divisionId: blueDivisionId, label: 'Blue Bronze Semifinal 1', teamA: '3rd Pool Y', teamB: '3rd Pool Z', time: '09:00', locationId: bartonMSId, court: 'Barton MS', round: 'Semifinals', position: 1 },
      { bracketId: blueBronzeId, divisionId: blueDivisionId, label: 'Blue Bronze Semifinal 2', teamA: '3rd Pool W', teamB: '3rd Pool X', time: '09:00', locationId: grahamGymId, court: 'Graham Gym', round: 'Semifinals', position: 2 },
      { bracketId: blueBronzeId, divisionId: blueDivisionId, label: 'Blue Bronze Championship', teamA: 'Winner SF1', teamB: 'Winner SF2', time: '14:20', locationId: balesGymId, court: 'Bales Gym', round: 'Finals', position: 1 },
      { bracketId: blueBronzeId, divisionId: blueDivisionId, label: 'Blue Bronze 3rd Place', teamA: 'Loser SF1', teamB: 'Loser SF2', time: '14:20', locationId: redGymId, court: 'Red Gym', round: '3rd Place', position: 2 },
    ];
    
    for (const game of bracketGamesData) {
      const gameData = {
        tournamentId: christmasTournamentId,
        divisionId: game.divisionId,
        bracketId: game.bracketId,
        teamA: game.teamA,
        teamB: game.teamB,
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date(`${dec30}T${game.time}:00`)),
        locationId: game.locationId,
        court: game.court,
        status: 'scheduled',
        bracketRound: game.round,
        bracketPosition: game.position,
        gameLabel: game.label,
        dependsOnGames: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const result = await upsertGame(gameData);
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} ${game.label}`);
    }
    
    console.log('\n✅ Hangry Joe\'s Hays Hawks Christmas Classic created successfully!');
    console.log('   - 2 divisions (Red, Blue)');
    console.log('   - 8 pools (A, B, C, D, W, X, Y, Z)');
    console.log('   - 24 pool games (December 29)');
    console.log('   - 6 brackets (3 per division: Gold, Silver, Bronze)');
    console.log('   - 24 bracket games (December 30)');
    
    console.log('\n✨ Test data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${users.length} user accounts`);
    console.log(`   - ${tournaments.length + 1} tournaments`);
    console.log(`   - ${divisions.length + 2} divisions`);
    console.log(`   - ${locations.length + 4} locations`);
    console.log(`   - ${games.length} regular games`);
    console.log(`   - ${pools.length + 8} pools`);
    console.log(`   - ${poolGames.length + 24} pool games`);
    console.log(`   - ${brackets.length + 6} brackets`);
    console.log(`   - ${bracketGames.length + 24} bracket games`);
    console.log('\n🏀 Tournament Formats:');
    console.log('   - Pool-only: Boys 14U (2 pools, 12 games)');
    console.log('   - Bracket-only: Boys 18U (8-team bracket, 7 games)');
    console.log('   - Hybrid: Girls 16U (2 pools → 4-team bracket)');
    console.log('   - 🎄 Hangry Joe\'s Christmas Classic: 8 pools → 6 brackets (48 games)');
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
