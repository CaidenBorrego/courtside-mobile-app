/**
 * Verify script to check seeded data in Firestore
 * Run with: npx ts-node --project scripts/tsconfig.json scripts/verify-data.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
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

async function verifyData() {
  console.log('🔍 Verifying seeded data...\n');

  try {
    // Check tournaments
    const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
    console.log(`✅ Tournaments: ${tournamentsSnapshot.size} found`);
    tournamentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.name} (${data.status})`);
    });

    // Check active/upcoming tournaments (what the app queries)
    const activeQuery = query(
      collection(db, 'tournaments'),
      where('status', 'in', ['upcoming', 'active'])
    );
    const activeSnapshot = await getDocs(activeQuery);
    console.log(`\n✅ Active/Upcoming Tournaments: ${activeSnapshot.size} found`);

    // Check divisions
    const divisionsSnapshot = await getDocs(collection(db, 'divisions'));
    console.log(`\n✅ Divisions: ${divisionsSnapshot.size} found`);

    // Check locations
    const locationsSnapshot = await getDocs(collection(db, 'locations'));
    console.log(`\n✅ Locations: ${locationsSnapshot.size} found`);

    // Check games
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    console.log(`\n✅ Games: ${gamesSnapshot.size} found`);

    console.log('\n✨ Data verification complete!');
    console.log('\n📱 Your app should now display tournaments on the home screen.');
    
  } catch (error) {
    console.error('❌ Error verifying data:', error);
    process.exit(1);
  }

  process.exit(0);
}

verifyData();
