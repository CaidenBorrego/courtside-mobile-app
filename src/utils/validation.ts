/**
 * Validation utilities for form inputs and data validation
 */

import {
  Tournament,
  Game,
  Division,
  Location,
  UserProfile,
  GameStatus,
  TournamentStatus,
  UserRole,
  Gender,
  FirebaseTimestamp
} from '../types';

/**
 * Validate email address format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate password strength
 * Minimum 6 characters
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Validate display name
 * Minimum 2 characters, maximum 50 characters
 */
export const validateDisplayName = (displayName: string): boolean => {
  const trimmed = displayName.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

/**
 * Validate required field
 */
export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate phone number (optional, for future use)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.trim());
};

/**
 * Validate tournament name
 */
export const validateTournamentName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= 100;
};

/**
 * Validate team name
 */
export const validateTeamName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

/**
 * Validate score (non-negative integer)
 */
export const validateScore = (score: string | number): boolean => {
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  // Check if it's a valid number, non-negative, within range, and is an integer
  return !isNaN(numScore) && isFinite(numScore) && numScore >= 0 && numScore <= 999 && Number.isInteger(numScore);
};

// ============================================================================
// TOURNAMENT DATA VALIDATION
// ============================================================================

/**
 * Validate tournament data
 */
export const validateTournament = (tournament: Partial<Tournament>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!tournament.name || !validateTournamentName(tournament.name)) {
    errors.push('Tournament name must be between 3 and 100 characters');
  }

  if (!tournament.city || !validateRequired(tournament.city)) {
    errors.push('City is required');
  }

  if (!tournament.state || !validateRequired(tournament.state)) {
    errors.push('State is required');
  }

  if (!tournament.startDate) {
    errors.push('Start date is required');
  }

  if (!tournament.endDate) {
    errors.push('End date is required');
  }

  if (tournament.startDate && tournament.endDate) {
    const startTime = tournament.startDate.toMillis();
    const endTime = tournament.endDate.toMillis();
    if (startTime >= endTime) {
      errors.push('End date must be after start date');
    }
  }

  if (tournament.status && !Object.values(TournamentStatus).includes(tournament.status)) {
    errors.push('Invalid tournament status');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate game data
 */
export const validateGame = (game: Partial<Game>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!game.tournamentId || !validateRequired(game.tournamentId)) {
    errors.push('Tournament ID is required');
  }

  if (!game.divisionId || !validateRequired(game.divisionId)) {
    errors.push('Division ID is required');
  }

  if (!game.teamA || !validateTeamName(game.teamA)) {
    errors.push('Team A name must be between 2 and 50 characters');
  }

  if (!game.teamB || !validateTeamName(game.teamB)) {
    errors.push('Team B name must be between 2 and 50 characters');
  }

  if (game.teamA && game.teamB && game.teamA.trim() === game.teamB.trim()) {
    errors.push('Team names must be different');
  }

  if (game.scoreA !== undefined && !validateScore(game.scoreA)) {
    errors.push('Team A score must be a valid non-negative integer');
  }

  if (game.scoreB !== undefined && !validateScore(game.scoreB)) {
    errors.push('Team B score must be a valid non-negative integer');
  }

  if (!game.startTime) {
    errors.push('Start time is required');
  }

  if (!game.locationId || !validateRequired(game.locationId)) {
    errors.push('Location ID is required');
  }

  if (game.status && !Object.values(GameStatus).includes(game.status)) {
    errors.push('Invalid game status');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate division data
 */
export const validateDivision = (division: Partial<Division>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!division.tournamentId || !validateRequired(division.tournamentId)) {
    errors.push('Tournament ID is required');
  }

  if (!division.name || !validateRequired(division.name)) {
    errors.push('Division name is required');
  }

  if (!division.ageGroup || !validateRequired(division.ageGroup)) {
    errors.push('Age group is required');
  }

  if (division.gender && !Object.values(Gender).includes(division.gender)) {
    errors.push('Invalid gender value');
  }

  if (!division.skillLevel || !validateRequired(division.skillLevel)) {
    errors.push('Skill level is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate location data
 */
export const validateLocation = (location: Partial<Location>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!location.name || !validateRequired(location.name)) {
    errors.push('Location name is required');
  }

  if (!location.address || !validateRequired(location.address)) {
    errors.push('Address is required');
  }

  if (!location.city || !validateRequired(location.city)) {
    errors.push('City is required');
  }

  if (!location.state || !validateRequired(location.state)) {
    errors.push('State is required');
  }

  if (location.coordinates) {
    const { latitude, longitude } = location.coordinates;
    if (latitude < -90 || latitude > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate user profile data
 */
export const validateUserProfile = (profile: Partial<UserProfile>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!profile.email || !validateEmail(profile.email)) {
    errors.push('Valid email address is required');
  }

  if (!profile.displayName || !validateDisplayName(profile.displayName)) {
    errors.push('Display name must be between 2 and 50 characters');
  }

  if (profile.role && !Object.values(UserRole).includes(profile.role)) {
    errors.push('Invalid user role');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// FORM VALIDATION HELPERS
// ============================================================================

/**
 * Form validation result interface
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate login form
 */
export const validateLoginForm = (email: string, password: string): FormValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!validatePassword(password)) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate registration form
 */
export const validateRegistrationForm = (
  email: string,
  password: string,
  confirmPassword: string,
  displayName: string
): FormValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!validatePassword(password)) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!validateDisplayName(displayName)) {
    errors.displayName = 'Display name must be between 2 and 50 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate tournament form
 */
export const validateTournamentForm = (formData: {
  name: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
}): FormValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateTournamentName(formData.name)) {
    errors.name = 'Tournament name must be between 3 and 100 characters';
  }

  if (!validateRequired(formData.city)) {
    errors.city = 'City is required';
  }

  if (!validateRequired(formData.state)) {
    errors.state = 'State is required';
  }

  if (!formData.startDate) {
    errors.startDate = 'Start date is required';
  }

  if (!formData.endDate) {
    errors.endDate = 'End date is required';
  }

  if (formData.startDate && formData.endDate) {
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (startDate >= endDate) {
      errors.endDate = 'End date must be after start date';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate game form
 */
export const validateGameForm = (formData: {
  teamA: string;
  teamB: string;
  scoreA?: string;
  scoreB?: string;
  startTime: string;
}): FormValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateTeamName(formData.teamA)) {
    errors.teamA = 'Team A name must be between 2 and 50 characters';
  }

  if (!validateTeamName(formData.teamB)) {
    errors.teamB = 'Team B name must be between 2 and 50 characters';
  }

  if (formData.teamA && formData.teamB && formData.teamA.trim() === formData.teamB.trim()) {
    errors.teamB = 'Team names must be different';
  }

  if (formData.scoreA !== undefined && formData.scoreA !== '' && !validateScore(formData.scoreA)) {
    errors.scoreA = 'Score must be a valid non-negative integer';
  }

  if (formData.scoreB !== undefined && formData.scoreB !== '' && !validateScore(formData.scoreB)) {
    errors.scoreB = 'Score must be a valid non-negative integer';
  }

  if (!formData.startTime) {
    errors.startTime = 'Start time is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ============================================================================
// TYPE GUARDS FOR RUNTIME TYPE CHECKING
// ============================================================================

/**
 * Type guard to check if value is a valid GameStatus
 */
export const isGameStatus = (value: any): value is GameStatus => {
  return Object.values(GameStatus).includes(value);
};

/**
 * Type guard to check if value is a valid TournamentStatus
 */
export const isTournamentStatus = (value: any): value is TournamentStatus => {
  return Object.values(TournamentStatus).includes(value);
};

/**
 * Type guard to check if value is a valid UserRole
 */
export const isUserRole = (value: any): value is UserRole => {
  return Object.values(UserRole).includes(value);
};

/**
 * Type guard to check if value is a valid Gender
 */
export const isGender = (value: any): value is Gender => {
  return Object.values(Gender).includes(value);
};

/**
 * Type guard to check if value is a Firebase Timestamp
 */
export const isFirebaseTimestamp = (value: any): value is FirebaseTimestamp => {
  return value && typeof value.toMillis === 'function' && typeof value.toDate === 'function';
};

/**
 * Type guard to check if object has required Tournament properties
 */
export const isTournament = (obj: any): obj is Tournament => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.city === 'string' &&
    typeof obj.state === 'string' &&
    typeof obj.createdBy === 'string' &&
    isFirebaseTimestamp(obj.startDate) &&
    isFirebaseTimestamp(obj.endDate) &&
    isFirebaseTimestamp(obj.createdAt) &&
    isTournamentStatus(obj.status)
  );
};

/**
 * Type guard to check if object has required Game properties
 */
export const isGame = (obj: any): obj is Game => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.tournamentId === 'string' &&
    typeof obj.divisionId === 'string' &&
    typeof obj.teamA === 'string' &&
    typeof obj.teamB === 'string' &&
    typeof obj.scoreA === 'number' &&
    typeof obj.scoreB === 'number' &&
    typeof obj.locationId === 'string' &&
    isFirebaseTimestamp(obj.startTime) &&
    isFirebaseTimestamp(obj.createdAt) &&
    isGameStatus(obj.status)
  );
};

/**
 * Type guard to check if object has required UserProfile properties
 */
export const isUserProfile = (obj: any): obj is UserProfile => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.displayName === 'string' &&
    typeof obj.notificationsEnabled === 'boolean' &&
    Array.isArray(obj.followingTeams) &&
    Array.isArray(obj.followingGames) &&
    isFirebaseTimestamp(obj.createdAt) &&
    isFirebaseTimestamp(obj.lastActive) &&
    isUserRole(obj.role)
  );
};

/**
 * Type guard to check if object has required Division properties
 */
export const isDivision = (obj: any): obj is Division => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.tournamentId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.ageGroup === 'string' &&
    typeof obj.skillLevel === 'string' &&
    isFirebaseTimestamp(obj.createdAt) &&
    isGender(obj.gender)
  );
};

/**
 * Type guard to check if object has required Location properties
 */
export const isLocation = (obj: any): obj is Location => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.address === 'string' &&
    typeof obj.city === 'string' &&
    typeof obj.state === 'string' &&
    isFirebaseTimestamp(obj.createdAt) &&
    (obj.coordinates === undefined || (
      typeof obj.coordinates.latitude === 'number' &&
      typeof obj.coordinates.longitude === 'number'
    ))
  );
};