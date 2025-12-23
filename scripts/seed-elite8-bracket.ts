/**
 * Seed script for Hays HS Christmas Classic - ELITE 8 Bracket
 * This tournament demonstrates multiple game advancement with losers feeding into a consolation pool
 * Run with: npx ts-node scripts/seed-elite8-bracket.ts
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  Timestamp, 
  doc, 
  query,
  where,
  getDocs,
  updateDoc
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

// Helper functions
async function findDocumentByName(collectionName: string, name: string) {
  const q = query(collection(db, collectionName), where('name', '==', name));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
}

async function upsertDocument(collectionName: string, data: any) {
  const existing = await findDocumentByName(collectionName, data.name);
  if (existing) {
    const docRef = doc(db, collectionName, existing.id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
    return { id: existing.id, isNew: false };
  } else {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { id: docRef.id, isNew: true };
  }
}

async function findGameByLabel(gameLabel: string, tournamentId: string) {
  const q = query(
    collection(db, 'games'), 
    where('gameLabel', '==', gameLabel),
    where('tournamentId', '==', tournamentId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
}

async function upsertGame(gameData: any) {
  if (gameData.gameLabel && gameData.tournamentId) {
    const existing = await findGameByLabel(gameData.gameLabel, gameData.tournamentId);
    if (existing) {
      const docRef = doc(db, 'games', existing.id);
      await updateDoc(docRef, { ...gameData, updatedAt: Timestamp.now() });
      return { id: existing.id, isNew: false };
    }
  }
  const docRef = await addDoc(collection(db, 'games'), gameData);
  return { id: docRef.id, isNew: true };
}

async function findPoolByNameAndDivision(name: string, divisionId: string) {
  const q = query(
    collection(db, 'pools'),
    where('name', '==', name),
    where('divisionId', '==', divisionId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
}

async function upsertPool(poolData: any) {
  const existing = await findPoolByNameAndDivision(poolData.name, poolData.divisionId);
  if (existing) {
    const docRef = doc(db, 'pools', existing.id);
    await updateDoc(docRef, { ...poolData, updatedAt: Timestamp.now() });
    return { id: existing.id, isNew: false };
  }
  const docRef = await addDoc(collection(db, 'pools'), poolData);
  return { id: docRef.id, isNew: true };
}

async function findBracketByNameAndDivision(name: string, divisionId: string) {
  const q = query(
    collection(db, 'brackets'),
    where('name', '==', name),
    where('divisionId', '==', divisionId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
}

async function upsertBracket(bracketData: any) {
  const existing = await findBracketByNameAndDivision(bracketData.name, bracketData.divisionId);
  if (existing) {
    const docRef = doc(db, 'brackets', existing.id);
    await updateDoc(docRef, { ...bracketData, updatedAt: Timestamp.now() });
    return { id: existing.id, isNew: false };
  }
  const docRef = await addDoc(collection(db, 'brackets'), bracketData);
  return { id: docRef.id, isNew: true };
}

async function seedElite8Tournament() {
  console.log('🏀 Creating Hays HS Christmas Classic - ELITE 8 Bracket...\n');

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

    // Create tournament
    console.log('📝 Creating tournament...');
    const tournament = {
      name: 'Hays HS Christmas Classic - ELITE 8 Bracket',
      startDate: Timestamp.fromDate(new Date('2025-12-29')),
      endDate: Timestamp.fromDate(new Date('2025-12-30')),
      address: 'Jack C. Hays High School',
      city: 'Buda',
      state: 'TX',
      status: 'upcoming',
      createdBy: 'admin',
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const tournamentResult = await upsertDocument('tournaments', tournament);
    const tournamentId = tournamentResult.id;
    console.log(`${tournamentResult.isNew ? '✅ Created' : '🔄 Updated'} tournament\n`);

    // Create division
    console.log('📝 Creating division...');
    const division = {
      tournamentId,
      name: 'Varsity',
      ageGroup: 'Varsity',
      gender: 'mixed',
      skillLevel: 'Elite',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const divisionResult = await upsertDocument('divisions', division);
    const divisionId = divisionResult.id;
    console.log(`${divisionResult.isNew ? '✅ Created' : '🔄 Updated'} division\n`);

    // Create locations
    console.log('📝 Creating locations...');
    const locations = [
      { name: 'Bales Gym', address: 'Jack C. Hays High School', city: 'Buda', state: 'TX' },
      { name: 'Graham Gym', address: 'Jack C. Hays High School', city: 'Buda', state: 'TX' },
      { name: 'Red Gym', address: 'Jack C. Hays High School', city: 'Buda', state: 'TX' },
      { name: 'Barton MS', address: 'Barton Middle School', city: 'Buda', state: 'TX' },
    ];
    
    const locationIds: Record<string, string> = {};
    for (const loc of locations) {
      const locData = {
        ...loc,
        coordinates: { latitude: 30.0, longitude: -97.9 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const result = await upsertDocument('locations', locData);
      locationIds[loc.name] = result.id;
      console.log(`${result.isNew ? '✅ Created' : '🔄 Updated'} location: ${loc.name}`);
    }
    console.log('');

    // Create Championship Bracket
    console.log('📝 Creating Championship Bracket...');
    const championshipBracket = {
      divisionId,
      tournamentId,
      name: 'Championship Bracket',
      size: 8,
      seedingSource: 'manual',
      seeds: [
        { position: 1, teamName: 'Veterans Memorial' },
        { position: 2, teamName: 'Ellison' },
        { position: 3, teamName: 'Antonian' },
        { position: 4, teamName: 'HCSA' },
        { position: 5, teamName: 'Harker Heights' },
        { position: 6, teamName: 'Weiss' },
        { position: 7, teamName: 'Liberty Christian' },
        { position: 8, teamName: 'Round Rock' },
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const bracketResult = await upsertBracket(championshipBracket);
    const championshipBracketId = bracketResult.id;
    console.log(`${bracketResult.isNew ? '✅ Created' : '🔄 Updated'} Championship Bracket\n`);

    // Create Consolation Pool
    console.log('📝 Creating Consolation Pool...');
    const consolationPool = {
      divisionId,
      tournamentId,
      name: 'Consolation Pool',
      teams: ['Loser Game 1', 'Loser Game 2', 'Loser Game 3', 'Loser Game 4'],
      advancementCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const poolResult = await upsertPool(consolationPool);
    const consolationPoolId = poolResult.id;
    console.log(`${poolResult.isNew ? '✅ Created' : '🔄 Updated'} Consolation Pool\n`);

    // DECEMBER 29 - Round 1 and Quarterfinals
    console.log('📝 Creating Round 1 games (December 29)...');
    
    const round1Game1 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Round 1',
      bracketPosition: 1,
      teamA: 'Veterans Memorial',
      teamB: 'Ellison',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T12:20:00')),
      locationId: locationIds['Bales Gym'],
      court: 'Bales Gym',
      status: 'scheduled',
      gameLabel: 'Round 1 Game 1',
      dependsOnGames: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${round1Game1.isNew ? '✅ Created' : '🔄 Updated'} Round 1 Game 1`);

    const round1Game2 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Round 1',
      bracketPosition: 2,
      teamA: 'Antonian',
      teamB: 'HCSA',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T12:20:00')),
      locationId: locationIds['Graham Gym'],
      court: 'Graham Gym',
      status: 'scheduled',
      gameLabel: 'Round 1 Game 2',
      dependsOnGames: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${round1Game2.isNew ? '✅ Created' : '🔄 Updated'} Round 1 Game 2`);

    const round1Game3 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Round 1',
      bracketPosition: 3,
      teamA: 'Harker Heights',
      teamB: 'Weiss',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T12:20:00')),
      locationId: locationIds['Red Gym'],
      court: 'Red Gym',
      status: 'scheduled',
      gameLabel: 'Round 1 Game 3',
      dependsOnGames: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${round1Game3.isNew ? '✅ Created' : '🔄 Updated'} Round 1 Game 3`);

    const round1Game4 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Round 1',
      bracketPosition: 4,
      teamA: 'Liberty Christian',
      teamB: 'Round Rock',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T12:20:00')),
      locationId: locationIds['Barton MS'],
      court: 'Barton MS',
      status: 'scheduled',
      gameLabel: 'Round 1 Game 4',
      dependsOnGames: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${round1Game4.isNew ? '✅ Created' : '🔄 Updated'} Round 1 Game 4\n`);

    // Quarterfinals
    console.log('📝 Creating Quarterfinals (December 29)...');
    
    const quarterGame5 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Quarterfinals',
      bracketPosition: 1,
      teamA: 'Winner Game 1',
      teamB: 'Winner Game 2',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T16:20:00')),
      locationId: locationIds['Barton MS'],
      court: 'Barton MS',
      status: 'scheduled',
      gameLabel: 'Quarterfinals Game 5',
      dependsOnGames: [round1Game1.id, round1Game2.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${quarterGame5.isNew ? '✅ Created' : '🔄 Updated'} Quarterfinals Game 5`);

    const quarterGame6 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Quarterfinals',
      bracketPosition: 2,
      teamA: 'Winner Game 3',
      teamB: 'Winner Game 4',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T16:20:00')),
      locationId: locationIds['Bales Gym'],
      court: 'Bales Gym',
      status: 'scheduled',
      gameLabel: 'Quarterfinals Game 6',
      dependsOnGames: [round1Game3.id, round1Game4.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${quarterGame6.isNew ? '✅ Created' : '🔄 Updated'} Quarterfinals Game 6\n`);

    // DECEMBER 30 - Semifinals, Finals, 3rd Place, and Losers Pool
    console.log('📝 Creating Semifinals (December 30)...');
    
    const semiGame7 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Semifinals',
      bracketPosition: 1,
      teamA: 'Loser Game 6',
      teamB: 'Winner Game 5',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T10:20:00')),
      locationId: locationIds['Bales Gym'],
      court: 'Bales Gym',
      status: 'scheduled',
      gameLabel: 'Semifinals Game 7',
      dependsOnGames: [quarterGame5.id, quarterGame6.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${semiGame7.isNew ? '✅ Created' : '🔄 Updated'} Semifinals Game 7`);

    const semiGame8 = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Semifinals',
      bracketPosition: 2,
      teamA: 'Loser Game 5',
      teamB: 'Winner Game 6',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T10:20:00')),
      locationId: locationIds['Graham Gym'],
      court: 'Graham Gym',
      status: 'scheduled',
      gameLabel: 'Semifinals Game 8',
      dependsOnGames: [quarterGame5.id, quarterGame6.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${semiGame8.isNew ? '✅ Created' : '🔄 Updated'} Semifinals Game 8\n`);

    console.log('📝 Creating Finals and 3rd Place (December 30)...');
    
    const thirdPlaceGame = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: '3rd Place',
      bracketPosition: 1,
      teamA: 'Loser Game 7',
      teamB: 'Loser Game 8',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T17:00:00')),
      locationId: locationIds['Graham Gym'],
      court: 'Graham Gym',
      status: 'scheduled',
      gameLabel: '3rd Place Game',
      dependsOnGames: [semiGame7.id, semiGame8.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${thirdPlaceGame.isNew ? '✅ Created' : '🔄 Updated'} 3rd Place Game`);

    const finalsGame = await upsertGame({
      tournamentId,
      divisionId,
      bracketId: championshipBracketId,
      bracketRound: 'Finals',
      bracketPosition: 1,
      teamA: 'Winner Game 7',
      teamB: 'Winner Game 8',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T17:00:00')),
      locationId: locationIds['Bales Gym'],
      court: 'Bales Gym',
      status: 'scheduled',
      gameLabel: 'Finals',
      dependsOnGames: [semiGame7.id, semiGame8.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${finalsGame.isNew ? '✅ Created' : '🔄 Updated'} Finals\n`);

    // CONSOLATION POOL GAMES
    console.log('📝 Creating Consolation Pool games...');
    
    const consolationGame1 = await upsertGame({
      tournamentId,
      divisionId,
      poolId: consolationPoolId,
      teamA: 'Loser Round 1 Game 1',
      teamB: 'Loser Round 1 Game 2',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T16:20:00')),
      locationId: locationIds['Red Gym'],
      court: 'Red Gym',
      status: 'scheduled',
      gameLabel: 'Consolation Pool Game 1',
      poolGameNumber: 1,
      dependsOnGames: [round1Game1.id, round1Game2.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${consolationGame1.isNew ? '✅ Created' : '🔄 Updated'} Consolation Pool Game 1`);

    const consolationGame2 = await upsertGame({
      tournamentId,
      divisionId,
      poolId: consolationPoolId,
      teamA: 'Loser Round 1 Game 3',
      teamB: 'Loser Round 1 Game 4',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-29T16:20:00')),
      locationId: locationIds['Graham Gym'],
      court: 'Graham Gym',
      status: 'scheduled',
      gameLabel: 'Consolation Pool Game 2',
      poolGameNumber: 2,
      dependsOnGames: [round1Game3.id, round1Game4.id],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${consolationGame2.isNew ? '✅ Created' : '🔄 Updated'} Consolation Pool Game 2`);

    const consolationGame3 = await upsertGame({
      tournamentId,
      divisionId,
      poolId: consolationPoolId,
      teamA: 'Loser Round 1 Game 1',
      teamB: 'Loser Round 1 Game 3',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T10:20:00')),
      locationId: locationIds['Barton MS'],
      court: 'Barton MS',
      status: 'scheduled',
      gameLabel: 'Consolation Pool Game 3',
      poolGameNumber: 3,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${consolationGame3.isNew ? '✅ Created' : '🔄 Updated'} Consolation Pool Game 3`);

    const consolationGame4 = await upsertGame({
      tournamentId,
      divisionId,
      poolId: consolationPoolId,
      teamA: 'Loser Round 1 Game 2',
      teamB: 'Loser Round 1 Game 4',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T10:20:00')),
      locationId: locationIds['Red Gym'],
      court: 'Red Gym',
      status: 'scheduled',
      gameLabel: 'Consolation Pool Game 4',
      poolGameNumber: 4,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${consolationGame4.isNew ? '✅ Created' : '🔄 Updated'} Consolation Pool Game 4`);

    const consolationGame5 = await upsertGame({
      tournamentId,
      divisionId,
      poolId: consolationPoolId,
      teamA: 'Loser Round 1 Game 1',
      teamB: 'Loser Round 1 Game 4',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T14:20:00')),
      locationId: locationIds['Graham Gym'],
      court: 'Graham Gym',
      status: 'scheduled',
      gameLabel: 'Consolation Pool Game 5',
      poolGameNumber: 5,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${consolationGame5.isNew ? '✅ Created' : '🔄 Updated'} Consolation Pool Game 5`);

    const consolationGame6 = await upsertGame({
      tournamentId,
      divisionId,
      poolId: consolationPoolId,
      teamA: 'Loser Round 1 Game 2',
      teamB: 'Loser Round 1 Game 3',
      scoreA: 0,
      scoreB: 0,
      startTime: Timestamp.fromDate(new Date('2025-12-30T14:20:00')),
      locationId: locationIds['Barton MS'],
      court: 'Barton MS',
      status: 'scheduled',
      gameLabel: 'Consolation Pool Game 6',
      poolGameNumber: 6,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`${consolationGame6.isNew ? '✅ Created' : '🔄 Updated'} Consolation Pool Game 6\n`);

    // NOW UPDATE GAMES WITH ADVANCEMENT ARRAYS
    console.log('📝 Setting up advancement paths (multiple game advancement)...');
    
    // Round 1 Game 1 - winner to Quarterfinals Game 5, loser to 3 pool games
    await updateDoc(doc(db, 'games', round1Game1.id), {
      winnerAdvancesTo: [quarterGame5.id],
      loserAdvancesTo: [consolationGame1.id, consolationGame3.id, consolationGame5.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Round 1 Game 1 → Winner to QF5, Loser to Consolation Pool Games 1, 3, 5');

    // Round 1 Game 2 - winner to Quarterfinals Game 5, loser to 3 pool games
    await updateDoc(doc(db, 'games', round1Game2.id), {
      winnerAdvancesTo: [quarterGame5.id],
      loserAdvancesTo: [consolationGame1.id, consolationGame4.id, consolationGame6.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Round 1 Game 2 → Winner to QF5, Loser to Consolation Pool Games 1, 4, 6');

    // Round 1 Game 3 - winner to Quarterfinals Game 6, loser to 3 pool games
    await updateDoc(doc(db, 'games', round1Game3.id), {
      winnerAdvancesTo: [quarterGame6.id],
      loserAdvancesTo: [consolationGame2.id, consolationGame3.id, consolationGame6.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Round 1 Game 3 → Winner to QF6, Loser to Consolation Pool Games 2, 3, 6');

    // Round 1 Game 4 - winner to Quarterfinals Game 6, loser to 3 pool games
    await updateDoc(doc(db, 'games', round1Game4.id), {
      winnerAdvancesTo: [quarterGame6.id],
      loserAdvancesTo: [consolationGame2.id, consolationGame4.id, consolationGame5.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Round 1 Game 4 → Winner to QF6, Loser to Consolation Pool Games 2, 4, 5');

    // Quarterfinals Game 5 - winner and loser to Semifinals
    await updateDoc(doc(db, 'games', quarterGame5.id), {
      winnerAdvancesTo: [semiGame7.id],
      loserAdvancesTo: [semiGame8.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Quarterfinals Game 5 → Winner to Semi7, Loser to Semi8');

    // Quarterfinals Game 6 - winner and loser to Semifinals
    await updateDoc(doc(db, 'games', quarterGame6.id), {
      winnerAdvancesTo: [semiGame8.id],
      loserAdvancesTo: [semiGame7.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Quarterfinals Game 6 → Winner to Semi8, Loser to Semi7');

    // Semifinals Game 7 - winner to Finals, loser to 3rd Place
    await updateDoc(doc(db, 'games', semiGame7.id), {
      winnerAdvancesTo: [finalsGame.id],
      loserAdvancesTo: [thirdPlaceGame.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Semifinals Game 7 → Winner to Finals, Loser to 3rd Place');

    // Semifinals Game 8 - winner to Finals, loser to 3rd Place
    await updateDoc(doc(db, 'games', semiGame8.id), {
      winnerAdvancesTo: [finalsGame.id],
      loserAdvancesTo: [thirdPlaceGame.id],
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Semifinals Game 8 → Winner to Finals, Loser to 3rd Place\n');

    console.log('✅ Tournament created successfully!\n');
    console.log('📊 Summary:');
    console.log('   - 1 tournament: Hays HS Christmas Classic - ELITE 8 Bracket');
    console.log('   - 1 division: Varsity');
    console.log('   - 4 locations: Bales Gym, Graham Gym, Red Gym, Barton MS');
    console.log('   - 1 bracket: Championship Bracket (8 teams)');
    console.log('   - 1 pool: Consolation Pool (4 teams)');
    console.log('   - 10 bracket games:');
    console.log('     • 4 Round 1 games (Dec 29)');
    console.log('     • 2 Quarterfinals (Dec 29)');
    console.log('     • 2 Semifinals (Dec 30)');
    console.log('     • 1 Finals (Dec 30)');
    console.log('     • 1 3rd Place (Dec 30)');
    console.log('   - 6 Consolation Pool games (Dec 29-30)');
    console.log('\n🎯 Key Feature:');
    console.log('   - Round 1 losers feed into Consolation Pool games');
    console.log('   - Demonstrates bracket games advancing to pool games');
    console.log('   - Uses multiple game advancement arrays\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedElite8Tournament();
