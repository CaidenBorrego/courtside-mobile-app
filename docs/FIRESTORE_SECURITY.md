# Firestore Security Rules Documentation

This document explains the security rules implemented for the CourtSide mobile app's Firestore database.

## Overview

The security rules implement a role-based access control system with three user roles:
- **Admin**: Full access to all data, can manage tournaments, games, divisions, and locations
- **Scorekeeper**: Can update game scores and status during tournaments
- **User**: Can read public data and manage their own profile and following lists

## Rule Structure

### Helper Functions

- `isAuthenticated()`: Checks if the user is logged in
- `isAdmin()`: Checks if the user has admin role
- `isScorekeeper()`: Checks if the user has scorekeeper role
- `isAdminOrScorekeeper()`: Checks if the user is either admin or scorekeeper
- `isOwner(userId)`: Checks if the authenticated user owns the document

### Collection Rules

#### Tournaments (`/tournaments/{tournamentId}`)
- **Read**: Public access (anyone can view tournaments)
- **Write**: Admin only (create, update, delete tournaments)

#### Games (`/games/{gameId}`)
- **Read**: Public access (anyone can view games)
- **Write**: 
  - Admin: Full access (create, update, delete games)
  - Scorekeeper: Limited update access (only scoreA, scoreB, status fields)

#### Divisions (`/divisions/{divisionId}`)
- **Read**: Public access (anyone can view divisions)
- **Write**: Admin only (create, update, delete divisions)

#### Locations (`/locations/{locationId}`)
- **Read**: Public access (anyone can view locations)
- **Write**: Admin only (create, update, delete locations)

#### Users (`/users/{userId}`)
- **Read**: 
  - Users can read their own profile
  - Admins can read all profiles
- **Write**:
  - Users can update their own profile (except role field)
  - Admins can update user roles
  - New user creation allowed during registration with 'user' role

## Security Features

### Role Protection
- Users cannot escalate their own role
- Only admins can assign admin or scorekeeper roles
- New users automatically get 'user' role

### Data Validation
- Following arrays (teams/games) are limited to 100 items each
- Scorekeepers can only update specific game fields
- User profile updates are restricted to allowed fields

### Access Control
- Public read access for tournament data (tournaments, games, divisions, locations)
- Private user profiles with owner-based access
- Role-based write permissions

## Deployment

To deploy these rules to Firebase:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project (if not already done)
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

## Testing Security Rules

Use the Firebase Emulator Suite to test security rules locally:

```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Run security rules tests
firebase emulators:exec --only firestore "npm test"
```

## Important Notes

1. **Public Data**: Tournament, game, division, and location data is publicly readable to support the app's core functionality
2. **User Privacy**: User profiles are private and only accessible by the user themselves or admins
3. **Role Management**: Only admins can manage user roles and tournament data
4. **Scorekeeper Access**: Scorekeepers have limited write access only to game scores and status
5. **Data Integrity**: Rules enforce data validation to prevent malformed data

## Security Considerations

- All write operations require authentication
- Role-based permissions prevent unauthorized data modification
- User profile data is protected from unauthorized access
- Following lists have size limits to prevent abuse
- Scorekeeper permissions are limited to essential game data only