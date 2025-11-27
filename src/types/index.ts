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

// Update data types for modifying existing documents
export type UpdateTournamentData = UpdateDocumentData<Tournament>;
export type UpdateGameData = UpdateDocumentData<Game>;
export type UpdateDivisionData = UpdateDocumentData<Division>;
export type UpdateLocationData = UpdateDocumentData<Location>;
export type UpdateUserProfileData = UpdateDocumentData<UserProfile>;

export interface Tournament extends FirestoreDocument {
  name: string;
  startDate: FirebaseTimestamp;
  endDate: FirebaseTimestamp;
  city: string;
  state: string;
  status: TournamentStatus;
  createdBy: string;
}

export interface Division extends FirestoreDocument {
  tournamentId: string;
  name: string;
  ageGroup: string;
  gender: Gender;
  skillLevel: string;
}

export interface Game extends FirestoreDocument {
  tournamentId: string;
  divisionId: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  startTime: FirebaseTimestamp;
  locationId: string;
  status: GameStatus;
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

export interface UserProfile extends FirestoreDocument {
  email: string;
  displayName: string;
  role: UserRole;
  followingTeams: string[];
  followingGames: string[];
  notificationsEnabled: boolean;
  fcmToken?: string;
  lastActive: FirebaseTimestamp;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TournamentDetail: { tournamentId: string };
  GameDetail: { gameId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ManageTeams: undefined;
  ManageGames: undefined;
  SearchTeams: undefined;
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