import { TeamStatsService } from '../TeamStatsService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Game, GameStatus, Pool } from '../../../types';
import { mockTimestamp } from '../../../__tests__/setup';

jest.mock('firebase/firestore');
jest.mock('../../firebase/config', () => ({
  db: {},
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

describe('TeamStatsService', () => {
  let service: TeamStatsService;

  beforeEach(() => {
    service = new TeamStatsService();
    jest.clearAllMocks();
  });

  describe('calculateTeamStats', () => {
    it('should calculate stats for a team with wins and losses', async () => {
      const mockGames: Game[] = [
        {
          id: 'game1',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Beta',
          scoreA: 21,
          scoreB: 15,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        {
          id: 'game2',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Gamma',
          teamB: 'Team Alpha',
          scoreA: 18,
          scoreB: 21,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        {
          id: 'game3',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Delta',
          scoreA: 15,
          scoreB: 21,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      
      // Mock two queries (teamA and teamB)
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [
            { id: 'game1', data: () => mockGames[0] },
            { id: 'game3', data: () => mockGames[2] },
          ],
        } as any)
        .mockResolvedValueOnce({
          docs: [
            { id: 'game2', data: () => mockGames[1] },
          ],
        } as any);

      const stats = await service.calculateTeamStats('Team Alpha', 'division1');

      expect(stats).toEqual({
        teamName: 'Team Alpha',
        divisionId: 'division1',
        wins: 2,
        losses: 1,
        pointsFor: 57, // 21 + 21 + 15
        pointsAgainst: 54, // 15 + 18 + 21
        pointDifferential: 3,
        gamesPlayed: 3,
      });
    });

    it('should handle team with no games', async () => {
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({ docs: [] } as any)
        .mockResolvedValueOnce({ docs: [] } as any);

      const stats = await service.calculateTeamStats('Team NoGames', 'division1');

      expect(stats).toEqual({
        teamName: 'Team NoGames',
        divisionId: 'division1',
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0,
        gamesPlayed: 0,
      });
    });

    it('should only count completed games', async () => {
      const mockGames: Game[] = [
        {
          id: 'game1',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Beta',
          scoreA: 21,
          scoreB: 15,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        {
          id: 'game2',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Gamma',
          scoreA: 0,
          scoreB: 0,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.SCHEDULED,
          createdAt: mockTimestamp.now(),
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockGames.map(g => ({ id: g.id, data: () => g })),
        } as any)
        .mockResolvedValueOnce({ docs: [] } as any);

      const stats = await service.calculateTeamStats('Team Alpha', 'division1');

      expect(stats.gamesPlayed).toBe(1);
      expect(stats.wins).toBe(1);
    });
  });

  describe('getDivisionStandings', () => {
    it('should calculate and rank standings correctly', async () => {
      const mockGames: Game[] = [
        // Team Alpha: 2-0, +12
        {
          id: 'game1',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Beta',
          scoreA: 21,
          scoreB: 15,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        {
          id: 'game2',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Gamma',
          scoreA: 21,
          scoreB: 15,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        // Team Beta: 1-1, 0
        {
          id: 'game3',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Beta',
          teamB: 'Team Gamma',
          scoreA: 21,
          scoreB: 18,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        // Team Gamma: 0-2, -12
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(g => ({ id: g.id, data: () => g })),
      } as any);

      const standings = await service.getDivisionStandings('division1');

      expect(standings).toHaveLength(3);
      expect(standings[0]).toMatchObject({
        teamName: 'Team Alpha',
        wins: 2,
        losses: 0,
        rank: 1,
      });
      expect(standings[1]).toMatchObject({
        teamName: 'Team Beta',
        wins: 1,
        losses: 1,
        rank: 2,
      });
      expect(standings[2]).toMatchObject({
        teamName: 'Team Gamma',
        wins: 0,
        losses: 2,
        rank: 3,
      });
    });

    it('should rank by point differential when wins are tied', async () => {
      const mockGames: Game[] = [
        // Team Alpha: 1-0, +10
        {
          id: 'game1',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Gamma',
          scoreA: 21,
          scoreB: 11,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        // Team Beta: 1-0, +3
        {
          id: 'game2',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Beta',
          teamB: 'Team Delta',
          scoreA: 21,
          scoreB: 18,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(g => ({ id: g.id, data: () => g })),
      } as any);

      const standings = await service.getDivisionStandings('division1');

      expect(standings[0].teamName).toBe('Team Alpha');
      expect(standings[0].pointDifferential).toBe(10);
      expect(standings[1].teamName).toBe('Team Beta');
      expect(standings[1].pointDifferential).toBe(3);
    });
  });

  describe('getTeamGames', () => {
    it('should fetch and sort games by most recent first', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const mockGames: Game[] = [
        {
          id: 'game1',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Beta',
          scoreA: 21,
          scoreB: 15,
          startTime: mockTimestamp.fromDate(twoDaysAgo),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        {
          id: 'game2',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Gamma',
          teamB: 'Team Alpha',
          scoreA: 18,
          scoreB: 21,
          startTime: mockTimestamp.fromDate(now),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        {
          id: 'game3',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          teamA: 'Team Alpha',
          teamB: 'Team Delta',
          scoreA: 15,
          scoreB: 21,
          startTime: mockTimestamp.fromDate(yesterday),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [
            { id: 'game1', data: () => mockGames[0] },
            { id: 'game3', data: () => mockGames[2] },
          ],
        } as any)
        .mockResolvedValueOnce({
          docs: [
            { id: 'game2', data: () => mockGames[1] },
          ],
        } as any);

      const games = await service.getTeamGames('Team Alpha', 'division1');

      expect(games).toHaveLength(3);
      expect(games[0].id).toBe('game2'); // Most recent
      expect(games[1].id).toBe('game3');
      expect(games[2].id).toBe('game1'); // Oldest
    });
  });

  describe('getPoolStandings', () => {
    it('should calculate pool standings correctly', async () => {
      const mockPool: Pool = {
        id: 'pool1',
        divisionId: 'division1',
        tournamentId: 'tournament1',
        name: 'Pool A',
        teams: ['Team Alpha', 'Team Beta', 'Team Gamma'],
        createdAt: mockTimestamp.now(),
      };

      const mockGames: Game[] = [
        {
          id: 'game1',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          poolId: 'pool1',
          teamA: 'Team Alpha',
          teamB: 'Team Beta',
          scoreA: 21,
          scoreB: 15,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
        {
          id: 'game2',
          tournamentId: 'tournament1',
          divisionId: 'division1',
          poolId: 'pool1',
          teamA: 'Team Alpha',
          teamB: 'Team Gamma',
          scoreA: 21,
          scoreB: 18,
          startTime: mockTimestamp.now(),
          locationId: 'location1',
          status: GameStatus.COMPLETED,
          createdAt: mockTimestamp.now(),
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [{ id: 'pool1', data: () => mockPool }],
        } as any)
        .mockResolvedValueOnce({
          docs: mockGames.map(g => ({ id: g.id, data: () => g })),
        } as any);

      const standings = await service.getPoolStandings('pool1');

      expect(standings).toHaveLength(3);
      expect(standings[0]).toMatchObject({
        teamName: 'Team Alpha',
        poolId: 'pool1',
        wins: 2,
        losses: 0,
        poolRank: 1,
      });
    });

    it('should throw error if pool not found', async () => {
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);

      await expect(service.getPoolStandings('nonexistent'))
        .rejects.toThrow('Pool not found');
    });
  });
});
