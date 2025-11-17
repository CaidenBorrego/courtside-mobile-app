import { Tournament, TournamentStatus } from '../types';

/**
 * Compute the actual status of a tournament based on its dates
 * This allows the status field to be overridden by admins while still
 * providing automatic date-based status for normal operation
 * 
 * Rules:
 * - Before startDate: upcoming
 * - Between startDate and endDate (inclusive): active
 * - After endDate (midnight of day after): completed
 * - Admin can override by setting status field
 */
export function computeTournamentStatus(tournament: Tournament): TournamentStatus {
  // Handle invalid dates - default to upcoming
  if (!tournament.startDate || !tournament.endDate) {
    return TournamentStatus.UPCOMING;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  try {
    // Convert Firebase timestamps to dates
    const startDate = tournament.startDate.toDate ? tournament.startDate.toDate() : new Date(tournament.startDate as any);
    const endDate = tournament.endDate.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate as any);
    
    // Normalize dates to start of day for comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // Calculate the day after end date (when tournament becomes completed)
    const dayAfterEnd = new Date(endDate);
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
    
    // Compute status based on dates
    if (now < startDate) {
      return TournamentStatus.UPCOMING;
    } else if (now >= startDate && now < dayAfterEnd) {
      return TournamentStatus.ACTIVE;
    } else {
      return TournamentStatus.COMPLETED;
    }
  } catch (error) {
    // If date conversion fails, default to upcoming
    console.warn('Error computing tournament status:', error);
    return TournamentStatus.UPCOMING;
  }
}

/**
 * Get the display status for a tournament
 * Always computes from dates - the stored status field is just for reference
 * In the future, admins could have a separate "statusOverride" field if needed
 */
export function getTournamentDisplayStatus(tournament: Tournament): TournamentStatus {
  // Always compute from dates
  return computeTournamentStatus(tournament);
}

/**
 * Check if a tournament should be displayed in the active/upcoming list
 */
export function isTournamentActiveOrUpcoming(tournament: Tournament): boolean {
  const status = getTournamentDisplayStatus(tournament);
  return status === TournamentStatus.ACTIVE || status === TournamentStatus.UPCOMING;
}
