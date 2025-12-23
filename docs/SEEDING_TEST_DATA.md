# Seeding Test Data for Pools and Brackets

This guide explains how to seed test data for the pools and brackets feature.

## Overview

The seed script (`scripts/seed-test-data.ts`) creates comprehensive test data including:

- **3 Tournament Formats**:
  - Pool-only tournament (Boys 14U)
  - Bracket-only tournament (Boys 18U)
  - Hybrid tournament (Girls 16U)

- **Test Data Created**:
  - 3 user accounts (admin, scorekeeper, user)
  - 5 tournaments
  - 6 divisions
  - 5 locations
  - 11 regular games
  - 4 pools (2 for pool-only, 2 for hybrid)
  - 12 pool games (6 per pool, all completed)
  - 2 brackets (1 bracket-only, 1 hybrid)
  - 7 bracket games (quarterfinals, semifinals, finals)

## Prerequisites

1. Firebase project set up
2. Environment variables configured in `.env`
3. Node.js and npm installed
4. TypeScript installed (`npm install -g typescript ts-node`)

## Running the Seed Script

### Step 1: Install Dependencies

```bash
cd courtside-mobile-app
npm install
```

### Step 2: Update Firestore Rules (IMPORTANT)

The seed script requires open write access. Temporarily update your Firestore rules:

```bash
# Deploy open rules for seeding
firebase deploy --only firestore:rules
```

The rules have been temporarily set to allow all reads and writes for development.

**⚠️ IMPORTANT**: After seeding, restore production rules:

```bash
# Restore production rules
./scripts/restore-firestore-rules.sh
```

### Step 3: Configure Environment

Ensure your `.env` file has the correct Firebase configuration:

```env
EXPO_PUBLIC_FIREBASE_API_KEY_DEV=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV=your-auth-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV=your-storage-bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID_DEV=your-app-id
```

### Step 4: Run the Seed Script

```bash
npx ts-node scripts/seed-test-data.ts
```

### Step 5: Restore Production Rules

**CRITICAL**: After seeding is complete, restore your production Firestore rules:

```bash
./scripts/restore-firestore-rules.sh
```

This will:
1. Restore the original production rules
2. Deploy them to Firebase
3. Clean up backup files

### Expected Output

```
🌱 Starting to seed test data...

👥 Creating test user accounts...
✅ Created admin: admin@courtside.test
✅ Created scorekeeper: scorekeeper@courtside.test
✅ Created user: user@courtside.test

📝 Creating tournaments...
✅ Created tournament: Summer Basketball Championship 2024 (ID: xxx)
✅ Created tournament: Fall Hoops Classic (ID: xxx)
...

📝 Creating divisions...
✅ Created division: Boys 14U (ID: xxx)
✅ Created division: Girls 16U (ID: xxx)
...

📝 Creating locations...
✅ Created location: Downtown Sports Complex (ID: xxx)
...

📝 Creating games...
✅ Created game: Lakers Youth vs Warriors Academy (ID: xxx)
...

📝 Creating pools...
✅ Created pool: Pool A in division xxx (ID: xxx)
✅ Created pool: Pool B in division xxx (ID: xxx)
...

📝 Creating pool games...
✅ Created pool game: Pool A Game 1 (ID: xxx)
✅ Created pool game: Pool A Game 2 (ID: xxx)
...

📝 Creating brackets...
✅ Created bracket: Championship Bracket in division xxx (ID: xxx)
✅ Created bracket: Gold Bracket in division xxx (ID: xxx)

📝 Creating bracket games...
✅ Created bracket game: Championship Bracket Quarterfinals Game 1 (ID: xxx)
...

✨ Test data seeded successfully!

📊 Summary:
   - 3 user accounts
   - 5 tournaments
   - 6 divisions
   - 5 locations
   - 11 regular games
   - 4 pools
   - 12 pool games
   - 2 brackets
   - 7 bracket games

🏀 Tournament Formats:
   - Pool-only: Boys 14U (2 pools, 12 games)
   - Bracket-only: Boys 18U (8-team bracket, 7 games)
   - Hybrid: Girls 16U (2 pools → 4-team bracket)

🔐 Test User Credentials:
   Admin: admin@courtside.test / Admin123!
   Scorekeeper: scorekeeper@courtside.test / Score123!
   User: user@courtside.test / User123!
```

## Test Data Details

### Pool-Only Tournament (Boys 14U)

**Format**: 2 pools of 4 teams each, round-robin play

**Pool A Teams**:
- Lakers Youth (3-0, +15)
- Clippers Elite (2-1, +5)
- Warriors Academy (1-2, -8)
- Kings Basketball (0-3, -12)

**Pool B Teams**:
- Rockets Elite (3-0, +11)
- Suns Academy (2-1, +4)
- Phoenix Rising (1-2, -6)
- Mavericks Select (0-3, -9)

**All pool games are completed** with realistic scores.

### Bracket-Only Tournament (Boys 18U)

**Format**: 8-team single-elimination bracket

**Seeds**:
1. Lakers Youth
2. Warriors Academy
3. Clippers Elite
4. Kings Basketball
5. Phoenix Rising
6. Suns Academy
7. Mavericks Select
8. Rockets Elite

**Bracket Status**:
- Quarterfinals: All completed
- Semifinals: All completed
- Finals: Scheduled (Lakers Youth vs Warriors Academy)

### Hybrid Tournament (Girls 16U)

**Format**: 2 pools → 4-team bracket

**Pool A Teams**:
- Thunder Youth
- Blazers Academy
- Spurs Select
- Nuggets Elite

**Pool B Teams**:
- Heat Rising
- Celtics Academy
- Bulls Select
- Nets Elite

**Advancement**: Top 2 from each pool advance to Gold Bracket

**Note**: Pool games need to be completed before bracket can be seeded.

## Testing Scenarios

### Scenario 1: View Pool Standings

1. Log in as any user
2. Navigate to "Summer Basketball Championship 2024"
3. Select "Boys 14U" division
4. View pool standings with completed games

### Scenario 2: View Bracket Progression

1. Navigate to "Summer Basketball Championship 2024"
2. Select "Boys 18U" division
3. View bracket with completed quarterfinals and semifinals
4. See finals game scheduled

### Scenario 3: Test Pool-to-Bracket Advancement

1. Log in as admin
2. Navigate to "Summer Basketball Championship 2024"
3. Select "Girls 16U" division
4. Complete remaining pool games
5. Click "Advance to Brackets"
6. Verify bracket is seeded from pool results

### Scenario 4: Score a Game

1. Log in as scorekeeper or admin
2. Navigate to the scheduled finals game
3. Enter scores for both teams
4. Mark game as completed
5. Verify standings update

### Scenario 5: Follow a Team

1. Log in as regular user
2. Navigate to any team (e.g., "Lakers Youth")
3. Click "Follow" button
4. Verify team appears in followed teams list

## Resetting Test Data

To reset and reseed the database:

```bash
# Run the reset script (if available)
npm run reset-db

# Then reseed
npx ts-node scripts/seed-test-data.ts
```

Or manually delete collections in Firebase Console and reseed.

## Troubleshooting

### Error: "Email already in use"

The script handles this automatically. If users already exist, it will skip creation and continue.

### Error: "Permission denied"

Check your Firestore security rules. For development, you may need to temporarily allow writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // DEVELOPMENT ONLY
    }
  }
}
```

### Error: "Firebase config not found"

Ensure your `.env` file is properly configured with Firebase credentials.

### Script Hangs

The script should complete in 10-30 seconds. If it hangs:
1. Check your internet connection
2. Verify Firebase project is accessible
3. Check for rate limiting issues

## Customizing Test Data

To customize the test data, edit `scripts/seed-test-data.ts`:

### Add More Teams

```typescript
const teamNames = [
  'Lakers Youth', 'Warriors Academy', 'Clippers Elite',
  // Add your teams here
  'Your Team Name',
];
```

### Change Pool Sizes

```typescript
{
  name: 'Pool A',
  teams: [teamNames[0], teamNames[1], teamNames[2], teamNames[3], teamNames[4]], // 5 teams
  advancementCount: 2,
}
```

### Add More Tournaments

```typescript
const tournaments = [
  // Existing tournaments...
  {
    name: 'Your Tournament Name',
    startDate: Timestamp.fromDate(new Date('2024-08-01')),
    endDate: Timestamp.fromDate(new Date('2024-08-05')),
    city: 'Your City',
    state: 'CA',
    status: 'upcoming',
    createdBy: adminUid,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
];
```

## Next Steps

After seeding test data:

1. **Test Pool Features**:
   - View pool standings
   - Check game labels
   - Verify standings calculations

2. **Test Bracket Features**:
   - View bracket structure
   - Check winner advancement
   - Verify game dependencies

3. **Test Hybrid Flow**:
   - Complete pool games
   - Advance to brackets
   - Verify automatic seeding

4. **Test User Features**:
   - Follow teams
   - View team details
   - Check notifications

## Support

For issues with seeding:
- Check Firebase Console for data
- Review Firestore security rules
- Verify environment configuration
- Check script output for errors

## Related Documentation

- [Admin Guide](./POOLS_AND_BRACKETS_ADMIN_GUIDE.md)
- [User Guide](./POOLS_AND_BRACKETS_USER_GUIDE.md)
- [Troubleshooting Guide](./POOLS_AND_BRACKETS_TROUBLESHOOTING.md)
- [Example Configurations](./examples/)
