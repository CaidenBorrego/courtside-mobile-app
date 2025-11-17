import { computeTournamentStatus, getTournamentDisplayStatus } from '../tournamentStatus';
import { Tournament, TournamentStatus } from '../../types';
import { Timestamp } from 'firebase/firestore';

describe('tournamentStatus', () => {
  describe('computeTournamentStatus', () => {
    it('should return UPCOMING for future tournaments', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const tournament: Tournament = {
        id: 'test-1',
        name: 'Future Tournament',
        startDate: Timestamp.fromDate(futureDate),
        endDate: Timestamp.fromDate(new Date(futureDate.getTime() + 5 * 24 * 60 * 60 * 1000)),
        city: 'Test City',
        state: 'CA',
        status: TournamentStatus.ACTIVE, // This should be ignored
        createdBy: 'test',
        createdAt: Timestamp.now(),
      };

      expect(computeTournamentStatus(tournament)).toBe(TournamentStatus.UPCOMING);
    });

    it('should return ACTIVE for current tournaments', () => {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3);
      
      const tournament: Tournament = {
        id: 'test-2',
        name: 'Current Tournament',
        startDate: Timestamp.fromDate(today),
        endDate: Timestamp.fromDate(endDate),
        city: 'Test City',
        state: 'CA',
        status: TournamentStatus.UPCOMING, // This should be ignored
        createdBy: 'test',
        createdAt: Timestamp.now(),
      };

      expect(computeTournamentStatus(tournament)).toBe(TournamentStatus.ACTIVE);
    });

    it('should return COMPLETED for past tournaments', () => {
      const pastStart = new Date('2024-07-15');
      const pastEnd = new Date('2024-07-20');
      
      const tournament: Tournament = {
        id: 'test-3',
        name: 'Past Tournament',
        startDate: Timestamp.fromDate(pastStart),
        endDate: Timestamp.fromDate(pastEnd),
        city: 'Test City',
        state: 'CA',
        status: TournamentStatus.ACTIVE, // This should be ignored
        createdBy: 'test',
        createdAt: Timestamp.now(),
      };

      expect(computeTournamentStatus(tournament)).toBe(TournamentStatus.COMPLETED);
    });

    it('should return ACTIVE on the start date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 3);
      
      const tournament: Tournament = {
        id: 'test-4',
        name: 'Starting Today',
        startDate: Timestamp.fromDate(today),
        endDate: Timestamp.fromDate(endDate),
        city: 'Test City',
        state: 'CA',
        status: TournamentStatus.UPCOMING,
        createdBy: 'test',
        createdAt: Timestamp.now(),
      };

      expect(computeTournamentStatus(tournament)).toBe(TournamentStatus.ACTIVE);
    });

    it('should return ACTIVE on the end date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 3);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tournament: Tournament = {
        id: 'test-5',
        name: 'Ending Today',
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(today),
        city: 'Test City',
        state: 'CA',
        status: TournamentStatus.ACTIVE,
        createdBy: 'test',
        createdAt: Timestamp.now(),
      };

      expect(computeTournamentStatus(tournament)).toBe(TournamentStatus.ACTIVE);
    });

    it('should return COMPLETED the day after end date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      
      const tournament: Tournament = {
        id: 'test-6',
        name: 'Ended Yesterday',
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        city: 'Test City',
        state: 'CA',
        status: TournamentStatus.ACTIVE,
        createdBy: 'test',
        createdAt: Timestamp.now(),
      };

      expect(computeTournamentStatus(tournament)).toBe(TournamentStatus.COMPLETED);
    });
  });

  describe('getTournamentDisplayStatus', () => {
    it('should always compute from dates, ignoring stored status', () => {
      const pastStart = new Date('2024-07-15');
      const pastEnd = new Date('2024-07-20');
      
      const tournament: Tournament = {
        id: 'test-7',
        name: 'Past Tournament',
        startDate: Timestamp.fromDate(pastStart),
        endDate: Timestamp.fromDate(pastEnd),
        city: 'Test City',
        state: 'CA',
        status: TournamentStatus.ACTIVE, // Stored as active but should show completed
        createdBy: 'test',
        createdAt: Timestamp.now(),
      };

      expect(getTournamentDisplayStatus(tournament)).toBe(TournamentStatus.COMPLETED);
    });
  });
});
