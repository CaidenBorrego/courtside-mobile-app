# Seeding Test Data

This guide explains how to add test tournament data to your Firestore database.

## Quick Start

### Option 1: Temporarily Open Firestore Rules (Easiest for Development)

1. **Deploy development rules** (allows all reads/writes):
   ```bash
   npx firebase deploy --only firestore:rules --config firestore.rules.dev
   ```

2. **Run the seed script**:
   ```bash
   npm run seed:test-data
   ```

3. **Restore production rules**:
   ```bash
   npx firebase deploy --only firestore:rules
   ```

### Option 2: Manual Entry via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/borrego-tourneyapp/firestore)
2. Navigate to Firestore Database
3. Add documents manually using the structure below

## Test Data Structure

### Tournament Document (Collection: `tournaments`)

```json
{
  "name": "Summer Basketball Championship 2024",
  "startDate": "2024-07-15T00:00:00.000Z",
  "endDate": "2024-07-20T00:00:00.000Z",
  "city": "Los Angeles",
  "state": "CA",
  "status": "active",
  "createdBy": "admin",
  "createdAt": "[Timestamp]",
  "updatedAt": "[Timestamp]"
}
```

**Required fields:**
- `name` (string): Tournament name
- `startDate` (timestamp): Start date
- `endDate` (timestamp): End date
- `city` (string): City name
- `state` (string): State abbreviation
- `status` (string): One of: `"active"`, `"upcoming"`, `"completed"`
- `createdBy` (string): User ID who created it
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

### Division Document (Collection: `divisions`)

```json
{
  "tournamentId": "[tournament-doc-id]",
  "name": "Boys 14U",
  "ageGroup": "14U",
  "gender": "male",
  "skillLevel": "Competitive",
  "createdAt": "[Timestamp]",
  "updatedAt": "[Timestamp]"
}
```

**Required fields:**
- `tournamentId` (string): Reference to tournament document ID
- `name` (string): Division name
- `ageGroup` (string): Age group (e.g., "14U", "16U")
- `gender` (string): One of: `"male"`, `"female"`, `"mixed"`
- `skillLevel` (string): Skill level description
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

### Location Document (Collection: `locations`)

```json
{
  "name": "Downtown Sports Complex",
  "address": "123 Main Street",
  "city": "Los Angeles",
  "state": "CA",
  "coordinates": {
    "latitude": 34.0522,
    "longitude": -118.2437
  },
  "createdAt": "[Timestamp]",
  "updatedAt": "[Timestamp]"
}
```

**Required fields:**
- `name` (string): Location name
- `address` (string): Street address
- `city` (string): City name
- `state` (string): State abbreviation
- `coordinates` (object, optional): Lat/long coordinates
  - `latitude` (number)
  - `longitude` (number)
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

### Game Document (Collection: `games`)

```json
{
  "tournamentId": "[tournament-doc-id]",
  "divisionId": "[division-doc-id]",
  "teamA": "Lakers Youth",
  "teamB": "Warriors Academy",
  "scoreA": 0,
  "scoreB": 0,
  "startTime": "2024-07-15T10:00:00.000Z",
  "locationId": "[location-doc-id]",
  "status": "scheduled",
  "createdAt": "[Timestamp]",
  "updatedAt": "[Timestamp]"
}
```

**Required fields:**
- `tournamentId` (string): Reference to tournament document ID
- `divisionId` (string): Reference to division document ID
- `teamA` (string): First team name
- `teamB` (string): Second team name
- `scoreA` (number): Team A score
- `scoreB` (number): Team B score
- `startTime` (timestamp): Game start time
- `locationId` (string): Reference to location document ID
- `status` (string): One of: `"scheduled"`, `"in_progress"`, `"completed"`, `"cancelled"`
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

## Important Notes

1. **Status Values**: Make sure to use `"active"` or `"upcoming"` for tournaments to appear in the home screen (the query filters by these statuses)

2. **Timestamps**: In Firebase Console, use the "timestamp" type when adding dates

3. **Document IDs**: Firebase will auto-generate document IDs. When referencing them (like `tournamentId` in divisions), copy the actual document ID from Firebase Console

4. **Security**: Never deploy the development rules (`firestore.rules.dev`) to production!

## Verification

After seeding data, you should see:
- Tournaments appearing on the Home screen
- Divisions in the tournament detail screen
- Games in the schedule tab
- Locations in the locations tab
