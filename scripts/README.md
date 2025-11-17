# Scripts

## Seed Test Data

The `seed-test-data.ts` script populates your Firestore database with sample tournament data for testing and development.

### What it creates:

- **3 Tournaments**:
  - Summer Basketball Championship 2024 (Active)
  - Fall Hoops Classic (Upcoming)
  - Winter Invitational (Upcoming)

- **3 Divisions** (for the first tournament):
  - Boys 14U (Competitive)
  - Girls 16U (Elite)
  - Boys 18U (Elite)

- **2 Locations**:
  - Downtown Sports Complex
  - Westside Recreation Center

- **3 Games**:
  - 2 scheduled games
  - 1 completed game with scores

### How to run:

```bash
npm run seed:test-data
```

### Prerequisites:

Make sure your `.env` file has the correct Firebase configuration:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

### Note:

This script will add data to your Firestore database. It does not clear existing data, so running it multiple times will create duplicate entries.

If you want to clear the database first, you can do so manually through the Firebase Console.
