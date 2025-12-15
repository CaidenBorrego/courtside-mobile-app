import { poolService, PoolService } from '../PoolService';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Pool, Game, GameStatus, PoolStanding } from '../../../types';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../../firebase/config', () => ({
  db: {},
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockWriteBatch = writeBatch as jest.MockedFunction<typeof writeBatch>;
const mockTimestamp = Timestamp as jest.Mocked<typeof Timestamp>;

describe('PoolService', () => {
  let service: PoolService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PoolService();
    
    // Mock Timestamp.now()
    (mockTimestamp.now as jest.Mock) = jest.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
    }));
  });

  describe('createPool', () => {
    it('should create a pool successfully', async () => {
      const mockPoolRef = { id: 'pool-123' };
      mockCollection.mockReturnValue({} as any);
      mockAddDoc.mockResolvedValue(mockPoolRef as any);

      const result = await service.createPool(
        'division-1',
        'tournament-1',
        'Pool A',
        ['Team 1', 'Team 2', 'Team 3'],
        2
      );

      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.id).toBe('pool-123');
      expect(result.name).toBe('Pool A');
      expect(result.teams).toEqual(['Team 1', 'Team 2', 'Team 3']);
      expect(result.advancementCount).toBe(2);
    });

    it('should throw error for pool with less than 2 teams', async () => {
      await expect(
        service.createPool('division-1', 'tournament-1', 'Pool A', ['Team 1'])
      ).rejects.toThrow('Pool must have at least 2 teams');
    });

    it('should throw error for pool with more than 16 teams', async () => {
      const teams = Array.from({ length: 17 }, (_, i) => `Team ${i + 1}`);
      
      await expect(
        service.createPool('division-1', 'tournament-1', 'Pool A', teams)
      ).rejects.toThrow('Pool cannot have more than 16 teams');
    });

    it('should throw error for duplicate team names', async () => {
      await expect(
        service.createPool(
          'division-1',
          'tournament-1',
          'Pool A',
          ['Team 1', 'Team 2', 'Team 1']
        )
      ).rejects.toThrow('Pool cannot have duplicate team names');
    });
  });

  describe('generatePoolGames', () => {
    it('should generate round-robin games for a pool', async () => {
      const mockPool: Pool = {
        id: 'pool-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Pool A',
        teams: ['Team 1', 'Team 2', 'Team 3'],
        createdAt: Timestamp.now() as any,
      };

      const mockPoolDoc = {
        exists: () => true,
        id: 'pool-123',
        data: () => mockPool,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);
      mockCollection.mockReturnValue({} as any);

      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);

      const gameIds = await service.generatePoolGames('pool-123');

      // For 3 teams, should generate 3 games (3*2/2 = 3)
      expect(gameIds).toHaveLength(3);
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should throw error if pool not found', async () => {
      const mockPoolDoc = {
        exists: () => false,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      await expect(service.generatePoolGames('pool-123')).rejects.toThrow(
        'Pool not found'
      );
    });

    it('should throw error if pool has less than 2 teams', async () => {
      const mockPool: Pool = {
        id: 'pool-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Pool A',
        teams: ['Team 1'],
        createdAt: Timestamp.now() as any,
      };

      const mockPoolDoc = {
        exists: () => true,
        id: 'pool-123',
        data: () => mockPool,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      await expect(service.generatePoolGames('pool-123')).rejects.toThrow(
        'Pool must have at least 2 teams to generate games'
      );
    });
  });

  describe('getPool', () => {
    it('should return pool data', async () => {
      const mockPool: Pool = {
        id: 'pool-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Pool A',
        teams: ['Team 1', 'Team 2'],
        createdAt: Timestamp.now() as any,
      };

      const mockPoolDoc = {
        exists: () => true,
        id: 'pool-123',
        data: () => mockPool,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      const result = await service.getPool('pool-123');

      expect(result.id).toBe('pool-123');
      expect(result.name).toBe('Pool A');
    });

    it('should throw error if pool not found', async () => {
      const mockPoolDoc = {
        exists: () => false,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      await expect(service.getPool('pool-123')).rejects.toThrow('Pool not found');
    });
  });

  describe('calculateStandings', () => {
    it('should calculate standings correctly', async () => {
      const mockPool: Pool = {
        id: 'pool-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Pool A',
        teams: ['Team A', 'Team B', 'Team C'],
        createdAt: Timestamp.now() as any,
      };

      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 25,
          scoreB: 20,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.COMPLETED,
          poolId: 'pool-123',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
        {
          id: 'game-2',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team A',
          teamB: 'Team C',
          scoreA: 25,
          scoreB: 15,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.COMPLETED,
          poolId: 'pool-123',
          poolGameNumber: 2,
          createdAt: Timestamp.now() as any,
        },
        {
          id: 'game-3',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team B',
          teamB: 'Team C',
          scoreA: 25,
          scoreB: 18,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.COMPLETED,
          poolId: 'pool-123',
          poolGameNumber: 3,
          createdAt: Timestamp.now() as any,
        },
      ];

      // Mock getPool
      const mockPoolDoc = {
        exists: () => true,
        id: 'pool-123',
        data: () => mockPool,
      };
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      // Mock getGamesByPool
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(game => ({
          id: game.id,
          data: () => game,
        })),
      } as any);

      const standings = await service.calculateStandings('pool-123');

      expect(standings).toHaveLength(3);
      
      // Team A should be first (2 wins)
      expect(standings[0].teamName).toBe('Team A');
      expect(standings[0].wins).toBe(2);
      expect(standings[0].losses).toBe(0);
      expect(standings[0].poolRank).toBe(1);
      
      // Team B should be second (1 win)
      expect(standings[1].teamName).toBe('Team B');
      expect(standings[1].wins).toBe(1);
      expect(standings[1].losses).toBe(1);
      expect(standings[1].poolRank).toBe(2);
      
      // Team C should be third (0 wins)
      expect(standings[2].teamName).toBe('Team C');
      expect(standings[2].wins).toBe(0);
      expect(standings[2].losses).toBe(2);
      expect(standings[2].poolRank).toBe(3);
    });

    it('should sort by point differential when wins are tied', async () => {
      const mockPool: Pool = {
        id: 'pool-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Pool A',
        teams: ['Team A', 'Team B'],
        createdAt: Timestamp.now() as any,
      };

      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 25,
          scoreB: 20,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.COMPLETED,
          poolId: 'pool-123',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      const mockPoolDoc = {
        exists: () => true,
        id: 'pool-123',
        data: () => mockPool,
      };
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(game => ({
          id: game.id,
          data: () => game,
        })),
      } as any);

      const standings = await service.calculateStandings('pool-123');

      expect(standings[0].pointDifferential).toBe(5); // Team A: 25-20
      expect(standings[1].pointDifferential).toBe(-5); // Team B: 20-25
    });
  });

  describe('getAdvancingTeams', () => {
    it('should return top N teams based on standings', async () => {
      const mockPool: Pool = {
        id: 'pool-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Pool A',
        teams: ['Team A', 'Team B', 'Team C'],
        advancementCount: 2,
        createdAt: Timestamp.now() as any,
      };

      const mockStandings: PoolStanding[] = [
        {
          teamName: 'Team A',
          poolId: 'pool-123',
          wins: 2,
          losses: 0,
          pointsFor: 50,
          pointsAgainst: 35,
          pointDifferential: 15,
          gamesPlayed: 2,
          poolRank: 1,
        },
        {
          teamName: 'Team B',
          poolId: 'pool-123',
          wins: 1,
          losses: 1,
          pointsFor: 45,
          pointsAgainst: 43,
          pointDifferential: 2,
          gamesPlayed: 2,
          poolRank: 2,
        },
        {
          teamName: 'Team C',
          poolId: 'pool-123',
          wins: 0,
          losses: 2,
          pointsFor: 33,
          pointsAgainst: 50,
          pointDifferential: -17,
          gamesPlayed: 2,
          poolRank: 3,
        },
      ];

      // Mock getPool
      const mockPoolDoc = {
        exists: () => true,
        id: 'pool-123',
        data: () => mockPool,
      };
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      // Mock calculateStandings by mocking the internal calls
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      // Spy on calculateStandings
      jest.spyOn(service, 'calculateStandings').mockResolvedValue(mockStandings);

      const advancingTeams = await service.getAdvancingTeams('pool-123');

      expect(advancingTeams).toEqual(['Team A', 'Team B']);
    });

    it('should return empty array if advancement count is 0', async () => {
      const mockPool: Pool = {
        id: 'pool-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Pool A',
        teams: ['Team A', 'Team B'],
        advancementCount: 0,
        createdAt: Timestamp.now() as any,
      };

      const mockPoolDoc = {
        exists: () => true,
        id: 'pool-123',
        data: () => mockPool,
      };
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockPoolDoc as any);

      const advancingTeams = await service.getAdvancingTeams('pool-123');

      expect(advancingTeams).toEqual([]);
    });
  });

  describe('updatePoolTeams', () => {
    it('should update pool teams and regenerate games', async () => {
      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 0,
          scoreB: 0,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.SCHEDULED,
          poolId: 'pool-123',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      // Mock getGamesByPool
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(game => ({
          id: game.id,
          data: () => game,
        })),
      } as any);

      const mockBatch = {
        delete: jest.fn(),
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);
      mockDoc.mockReturnValue({} as any);

      // Mock generatePoolGames
      jest.spyOn(service, 'generatePoolGames').mockResolvedValue(['game-2', 'game-3']);

      const newGameIds = await service.updatePoolTeams('pool-123', [
        'Team X',
        'Team Y',
        'Team Z',
      ]);

      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(newGameIds).toEqual(['game-2', 'game-3']);
    });

    it('should throw error if games have been completed', async () => {
      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 25,
          scoreB: 20,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.COMPLETED,
          poolId: 'pool-123',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(game => ({
          id: game.id,
          data: () => game,
        })),
      } as any);

      await expect(
        service.updatePoolTeams('pool-123', ['Team X', 'Team Y'])
      ).rejects.toThrow('Cannot update pool teams: some games have already been completed');
    });
  });

  describe('deletePool', () => {
    it('should delete pool and all associated games', async () => {
      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 0,
          scoreB: 0,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.SCHEDULED,
          poolId: 'pool-123',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(game => ({
          id: game.id,
          data: () => game,
        })),
      } as any);

      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);
      mockDoc.mockReturnValue({} as any);

      await service.deletePool('pool-123');

      expect(mockBatch.delete).toHaveBeenCalledTimes(2); // 1 game + 1 pool
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
