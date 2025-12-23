// Core data types for the CourtSide app
import { Timestamp } from 'firebase/firestore';

// Enum types for better type safety
export enum GameStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

export enum UserRole {
  ADMIN = 'admin',
  SCOREKEEPER = 'scorekeeper',
  USER = 'user'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  MIXED = 'mixed'
}

export enum TournamentFormat {
  POOL_ONLY = 'pool_only',
  BRACKET_ONLY = 'bracket_only',
  HYBRID = 'hybrid'
}

// Firebase utility types
export type FirebaseTimestamp = Timestamp;

export interface FirestoreDocument {
  id: string;
  createdAt: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

export type CreateDocumentData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: FirebaseTimestamp;
};

export type UpdateDocumentData<T> = Partial<Omit<T, 'id' | 'createdAt'>> & {
  updatedAt: FirebaseTimestamp;
};

// Form data types for creating new documents
export type CreateTournamentData = CreateDocumentData<Tournament>;
export type CreateGameData = CreateDocumentData<Game>;
export type CreateDivisionData = CreateDocumentData<Division>;
export type CreateLocationData = CreateDocumentData<Location>;
export type CreateUserProfileData = CreateDocumentData<UserProfile>;
export type CreatePoolData = CreateDocumentData<Pool>;
export type CreateBracketData = CreateDocumentData<Bracket>;

// Update data types for modifying existing documents
export type UpdateTournamentData = UpdateDocumentData<Tournament>;
export type UpdateGameData = UpdateDocumentData<Game>;
export type UpdateDivisionData = UpdateDocumentData<Division>;
export type UpdateLocationData = UpdateDocumentData<Location>;
export type UpdateUserProfileData = UpdateDocumentData<UserProfile>;
export type UpdatePoolData = UpdateDocumentData<Pool>;
export type UpdateBracketData = UpdateDocumentData<Bracket>;

export interface Tournament extends FirestoreDocument {
  name: string;
  startDate: FirebaseTimestamp;
  endDate: FirebaseTimestamp;
  city: string;
  state: string;
  status: TournamentStatus;
  createdBy: string;
  imageUrl?: string;
  address?: string;
  mapUrl?: string;
}

export interface Division extends FirestoreDocument {
  tournamentId: string;
  name: string;
  ageGroup: string;
  gender: Gender;
  skillLevel: string;
  format?: TournamentFormat;
}

/**
 * Game data model
 * 
 * Represents a single game between two teams. Can be part of pool play,
 * bracket play, or standalone. Includes scheduling, scoring, and structure
 * information.
 * 
 * @property tournamentId - Reference to the tournament
 * @property divisionId - Reference to the division
 * @property teamA - Name of the first team
 * @property teamB - Name of the second team
 * @property teamAImageUrl - Optional image URL for team A
 * @property teamBImageUrl - Optional image URL for team B
 * @property scoreA - Score for team A
 * @property scoreB - Score for team B
 * @property startTime - Scheduled start time
 * @property locationId - Reference to the location/venue
 * @property court - Optional court identifier (e.g., "Court 1")
 * @property status - Current game status (scheduled, in_progress, completed, cancelled)
 * 
 * Pool play fields:
 * @property poolId - Optional reference to pool if this is a pool game
 * @property poolGameNumber - Optional game number within the pool (e.g., 1, 2, 3)
 * 
 * Bracket play fields:
 * @property bracketId - Optional reference to bracket if this is a bracket game
 * @property bracketRound - Optional round name (e.g., "Finals", "Semifinals", "Round 1")
 * @property bracketPosition - Optional position within the round
 * @property dependsOnGames - Optional array of game IDs that must complete before this game
 * @property feedsIntoGame - DEPRECATED: Use winnerFeedsIntoGame instead
 * @property winnerFeedsIntoGame - Optional game ID that the winner advances to
 * @property loserFeedsIntoGame - Optional game ID that the loser advances to (for consolation/double-elimination)
 * 
 * Display fields:
 * @property gameLabel - Optional computed label (e.g., "Pool A Game 1", "Gold Bracket Finals")
 */
export interface Game extends FirestoreDocument {
  tournamentId: string;
  divisionId: string;
  teamA: string;
  teamB: string;
  teamAImageUrl?: string;
  teamBImageUrl?: string;
  scoreA: number;
  scoreB: number;
  startTime: FirebaseTimestamp;
  locationId: string;
  court?: string;
  status: GameStatus;
  // Pool and bracket structure fields
  poolId?: string;
  poolGameNumber?: number;
  bracketId?: string;
  bracketRound?: string;
  bracketPosition?: number;
  dependsOnGames?: string[];
  feedsIntoGame?: string; // DEPRECATED: Use winnerFeedsIntoGame
  winnerFeedsIntoGame?: string;
  loserFeedsIntoGame?: string;
  gameLabel?: string;
}

export interface Location extends FirestoreDocument {
  name: string;
  address: string;
  city: string;
  state: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  mapUrl?: string;
}

/**
 * Pool data model for round-robin tournament play
 * 
 * A pool is a group of teams that play each other in a round-robin format,
 * where each team plays every other team exactly once.
 * 
 * @property divisionId - Reference to the division this pool belongs to
 * @property tournamentId - Reference to the tournament this pool belongs to
 * @property name - Display name for the pool (e.g., "Pool A", "Gold Pool")
 * @property teams - Array of team names participating in this pool
 * @property advancementCount - Optional number of teams that advance to brackets from this pool
 * 
 * @example
 * {
 *   id: "pool123",
 *   divisionId: "div456",
 *   tournamentId: "tourn789",
 *   name: "Pool A",
 *   teams: ["Team 1", "Team 2", "Team 3", "Team 4"],
 *   advancementCount: 2,
 *   createdAt: Timestamp.now(),
 *   updatedAt: Timestamp.now()
 * }
 */
export interface Pool extends FirestoreDocument {
  divisionId: string;
  tournamentId: string;
  name: string;
  teams: string[];
  advancementCount?: number;
}

/**
 * Bracket seed configuration
 * 
 * Defines how a team is positioned in a bracket, either manually assigned
 * or automatically seeded from pool play results.
 * 
 * @property position - 1-based position in the bracket (1 = top seed)
 * @property teamName - Optional team name if seed is assigned
 * @property sourcePoolId - Optional reference to pool if seeded from pool play
 * @property sourcePoolRank - Optional rank in source pool (1 = pool winner)
 */
export interface BracketSeed {
  position: number;
  teamName?: string;
  sourcePoolId?: string;
  sourcePoolRank?: number;
}

/**
 * Bracket data model for single-elimination tournament play
 * 
 * A bracket is a single-elimination tournament structure where teams advance
 * based on wins and are eliminated after losses. Supports standard bracket
 * sizes (4, 8, 16, 32 teams).
 * 
 * @property divisionId - Reference to the division this bracket belongs to
 * @property tournamentId - Reference to the tournament this bracket belongs to
 * @property name - Display name for the bracket (e.g., "Gold Bracket", "Championship")
 * @property size - Number of teams in the bracket (must be 4, 8, 16, or 32)
 * @property seedingSource - How teams are seeded: 'manual' (admin assigns), 'pools' (from pool results), or 'mixed'
 * @property seeds - Array of seed configurations defining team positions
 * 
 * @example
 * {
 *   id: "bracket123",
 *   divisionId: "div456",
 *   tournamentId: "tourn789",
 *   name: "Gold Bracket",
 *   size: 8,
 *   seedingSource: "pools",
 *   seeds: [
 *     { position: 1, teamName: "Team A", sourcePoolId: "pool1", sourcePoolRank: 1 },
 *     { position: 2, teamName: "Team B", sourcePoolId: "pool2", sourcePoolRank: 1 },
 *     // ... more seeds
 *   ],
 *   createdAt: Timestamp.now(),
 *   updatedAt: Timestamp.now()
 * }
 */
export interface Bracket extends FirestoreDocument {
  divisionId: string;
  tournamentId: string;
  name: string;
  size: 4 | 8 | 16 | 32;
  seedingSource: 'manual' | 'pools' | 'mixed';
  seeds: BracketSeed[];
}

/**
 * Team statistics computed from game results
 * 
 * Aggregated statistics for a team within a division, calculated from
 * all completed games. Used for standings and team detail displays.
 * 
 * @property teamName - Name of the team
 * @property divisionId - Division the team is competing in
 * @property wins - Number of games won
 * @property losses - Number of games lost
 * @property pointsFor - Total points scored by the team
 * @property pointsAgainst - Total points scored against the team
 * @property pointDifferential - Difference between pointsFor and pointsAgainst
 * @property gamesPlayed - Total number of completed games
 * @property rank - Optional overall rank in division standings
 */
export interface TeamStats {
  teamName: string;
  divisionId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  gamesPlayed: number;
  rank?: number;
}

/**
 * Pool-specific team standings
 * 
 * Extends TeamStats with pool-specific information for displaying
 * standings within a pool.
 * 
 * @property poolId - Reference to the pool
 * @property poolRank - Rank within the pool (1 = first place)
 */
export interface PoolStanding extends TeamStats {
  poolId: string;
  poolRank: number;
}

export interface UserProfile extends FirestoreDocument {
  email: string;
  displayName: string;
  role: UserRole;
  followingTeams: string[];
  followingGames: string[];
  // NOTIFICATIONS TEMPORARILY DISABLED
  // notificationsEnabled: boolean;
  // fcmToken?: string;
  lastActive: FirebaseTimestamp;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TournamentDetail: { tournamentId: string };
  GameDetail: { gameId: string };
  TeamDetail: { teamName: string; divisionId: string };
  ManageTournament: { tournamentId: string };
  BulkImport: undefined;
  EditGame: { gameId: string };
  EditTournament: { tournamentId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
  Admin: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ManageTeams: undefined;
  ManageGames: undefined;
  SearchTeams: undefined;
  TeamDetail: { teamName: string; divisionId: string };
};

export type TournamentStackParamList = {
  TournamentList: undefined;
  TournamentDetail: { tournamentId: string };
  GameDetail: { gameId: string };
};

// Deep linking configuration types
export interface DeepLinkConfig {
  screens: {
    Main: {
      screens: {
        Home: string;
        Profile: string;
      };
    };
    TournamentDetail: string;
    GameDetail: string;
  };
}