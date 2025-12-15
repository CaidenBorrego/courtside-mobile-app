import { bracketService, BracketService } from '../BracketService';
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
import { Bracket, Game, GameStatus, BracketSeed, PoolStanding } from '../../../types';
import { poolService } from '../PoolService';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../../firebase/config', () => ({
  db: {},
}));
jest.mock('../PoolService');

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

describe('BracketService', () => {
  let service: BracketService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BracketService();
    
    // Mock Timestamp.now()
    (mockTimestamp.now as jest.Mock) = jest.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
    }));
  });

  describe('createBracket', () => {
    it('should create a bracket successfully', async () => {
      const mockBracketRef = { id: 'bracket-123' };
      mockCollection.mockReturnValue({} as any);
      mockAddDoc.mockResolvedValue(mockBracketRef as any);

      const result = await service.createBracket(
        'division-1',
        'tournament-1',
        'Gold Bracket',
        8,
        'manual'
      );

      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.id).toBe('bracket-123');
      expect(result.name).toBe('Gold Bracket');
      expect(result.size).toBe(8);
      expect(result.seeds).toHaveLength(8);
    });

    it('should throw error for invalid bracket size', async () => {
      await expect(
        service.createBracket('division-1', 'tournament-1', 'Bracket', 6 as any)
      ).rejects.toThrow('Bracket size must be 4, 8, 16, or 32');
    });

    it('should initialize empty seeds', async () => {
      const mockBracketRef = { id: 'bracket-123' };
      mockCollection.mockReturnValue({} as any);
      mockAddDoc.mockResolvedValue(mockBracketRef as any);

      const result = await service.createBracket(
        'division-1',
        'tournament-1',
        'Gold Bracket',
        4
      );

      expect(result.seeds).toHaveLength(4);
      expect(result.seeds[0]).toEqual({
        position: 1,
        teamName: undefined,
        sourcePoolId: undefined,
        sourcePoolRank: undefined,
      });
    });
  });

  describe('generateBracketGames', () => {
    it('should generate correct number of games for 4-team bracket', async () => {
      const mockBracket: Bracket = {
        id: 'bracket-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Gold Bracket',
        size: 4,
        seedingSource: 'manual',
        seeds: [
          { position: 1, teamName: 'Team A' },
          { position: 2, teamName: 'Team B' },
          { position: 3, teamName: 'Team C' },
          { position: 4, teamName: 'Team D' },
        ],
        createdAt: Timestamp.now() as any,
      };

      const mockBracketDoc = {
        exists: () => true,
        id: 'bracket-123',
        data: () => mockBracket,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockBracketDoc as any);
      mockCollection.mockReturnValue({} as any);

      const mockBatch = {
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);

      const gameIds = await service.generateBracketGames('bracket-123');

      // 4-team bracket: 2 semifinals + 1 final = 3 games
      expect(gameIds).toHaveLength(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should generate correct number of games for 8-team bracket', async () => {
      const seeds: BracketSeed[] = Array.from({ length: 8 }, (_, i) => ({
        position: i + 1,
        teamName: `Team ${i + 1}`,
      }));

      const mockBracket: Bracket = {
        id: 'bracket-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Gold Bracket',
        size: 8,
        seedingSource: 'manual',
        seeds,
        createdAt: Timestamp.now() as any,
      };

      const mockBracketDoc = {
        exists: () => true,
        id: 'bracket-123',
        data: () => mockBracket,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockBracketDoc as any);
      mockCollection.mockReturnValue({} as any);

      const mockBatch = {
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);

      const gameIds = await service.generateBracketGames('bracket-123');

      // 8-team bracket: 4 quarterfinals + 2 semifinals + 1 final = 7 games
      expect(gameIds).toHaveLength(7);
    });

    it('should throw error if bracket not found', async () => {
      const mockBracketDoc = {
        exists: () => false,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(mockBracketDoc as any);

      await expect(service.generateBracketGames('bracket-123')).rejects.toThrow(
        'Bracket not found'
      );
    });
  });

  describe('advanceWinner', () => {
    it('should advance winner to next game', async () => {
      const mockGame: Game = {
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
        bracketId: 'bracket-123',
        bracketRound: 'Semifinals',
        bracketPosition: 1,
        feedsIntoGame: 'game-final',
        createdAt: Timestamp.now() as any,
      };

      const mockNextGame: Game = {
        id: 'game-final',
        tournamentId: 'tournament-1',
        divisionId: 'division-1',
        teamA: '',
        teamB: '',
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.now() as any,
        locationId: 'loc-1',
        status: GameStatus.SCHEDULED,
        bracketId: 'bracket-123',
        bracketRound: 'Finals',
        bracketPosition: 1,
        dependsOnGames: ['game-1', 'game-2'],
        createdAt: Timestamp.now() as any,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'game-1',
          data: () => mockGame,
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'game-final',
          data: () => mockNextGame,
        } as any);

      mockUpdateDoc.mockResolvedValue(undefined);

      await service.advanceWinner('game-1', 'Team A');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teamA: 'Team A',
        })
      );
    });

    it('should throw error if game is not completed', async () => {
      const mockGame: Game = {
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
        bracketId: 'bracket-123',
        bracketRound: 'Semifinals',
        bracketPosition: 1,
        feedsIntoGame: 'game-final',
        createdAt: Timestamp.now() as any,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'game-1',
        data: () => mockGame,
      } as any);

      await expect(service.advanceWinner('game-1', 'Team A')).rejects.toThrow(
        'Game must be completed before advancing winner'
      );
    });

    it('should throw error if winner is not one of the teams', async () => {
      const mockGame: Game = {
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
        bracketId: 'bracket-123',
        bracketRound: 'Semifinals',
        bracketPosition: 1,
        feedsIntoGame: 'game-final',
        createdAt: Timestamp.now() as any,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'game-1',
        data: () => mockGame,
      } as any);

      await expect(service.advanceWinner('game-1', 'Team C')).rejects.toThrow(
        'Winner must be one of the teams in the game'
      );
    });

    it('should not advance if game is finals', async () => {
      const mockGame: Game = {
        id: 'game-final',
        tournamentId: 'tournament-1',
        divisionId: 'division-1',
        teamA: 'Team A',
        teamB: 'Team B',
        scoreA: 25,
        scoreB: 20,
        startTime: Timestamp.now() as any,
        locationId: 'loc-1',
        status: GameStatus.COMPLETED,
        bracketId: 'bracket-123',
        bracketRound: 'Finals',
        bracketPosition: 1,
        createdAt: Timestamp.now() as any,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'game-final',
        data: () => mockGame,
      } as any);

      await service.advanceWinner('game-final', 'Team A');

      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('seedBracketFromPools', () => {
    it('should seed bracket from pool standings', async () => {
      const mockBracket: Bracket = {
        id: 'bracket-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Gold Bracket',
        size: 4,
        seedingSource: 'pools',
        seeds: [
          { position: 1 },
          { position: 2 },
          { position: 3 },
          { position: 4 },
        ],
        createdAt: Timestamp.now() as any,
      };

      const mockStandings: PoolStanding[] = [
        {
          teamName: 'Team A',
          poolId: 'pool-1',
          wins: 3,
          losses: 0,
          pointsFor: 75,
          pointsAgainst: 50,
          pointDifferential: 25,
          gamesPlayed: 3,
          poolRank: 1,
        },
        {
          teamName: 'Team B',
          poolId: 'pool-1',
          wins: 2,
          losses: 1,
          pointsFor: 70,
          pointsAgainst: 60,
          pointDifferential: 10,
          gamesPlayed: 3,
          poolRank: 2,
        },
        {
          teamName: 'Team C',
          poolId: 'pool-2',
          wins: 3,
          losses: 0,
          pointsFor: 80,
          pointsAgainst: 55,
          pointDifferential: 25,
          gamesPlayed: 3,
          poolRank: 1,
        },
        {
          teamName: 'Team D',
          poolId: 'pool-2',
          wins: 2,
          losses: 1,
          pointsFor: 65,
          pointsAgainst: 60,
          pointDifferential: 5,
          gamesPlayed: 3,
          poolRank: 2,
        },
      ];

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'bracket-123',
        data: () => mockBracket,
      } as any);

      (poolService.calculateStandings as jest.Mock)
        .mockResolvedValueOnce([mockStandings[0], mockStandings[1]])
        .mockResolvedValueOnce([mockStandings[2], mockStandings[3]]);

      mockUpdateDoc.mockResolvedValue(undefined);

      // Mock updateBracketGamesWithSeeds
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({ docs: [] } as any);

      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);

      await service.seedBracketFromPools('bracket-123', ['pool-1', 'pool-2']);

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = (mockUpdateDoc.mock.calls[0] as any)[1];
      expect(updateCall.seeds).toBeDefined();
      // Pool winners should be seeded first, sorted by point differential
      // Team A and Team C both have rank 1, but Team C has higher point diff (25 vs 25)
      // Actually they're equal, so order depends on which pool is processed first
      // Since pool-1 is processed first, Team A comes before Team C
      expect(updateCall.seeds[0].teamName).toBe('Team A');
      expect(updateCall.seeds[1].teamName).toBe('Team C');
    });

    it('should throw error if too many teams for bracket size', async () => {
      const mockBracket: Bracket = {
        id: 'bracket-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Gold Bracket',
        size: 4,
        seedingSource: 'pools',
        seeds: [
          { position: 1 },
          { position: 2 },
          { position: 3 },
          { position: 4 },
        ],
        createdAt: Timestamp.now() as any,
      };

      const mockStandings: PoolStanding[] = Array.from({ length: 6 }, (_, i) => ({
        teamName: `Team ${i + 1}`,
        poolId: 'pool-1',
        wins: 3 - i,
        losses: i,
        pointsFor: 75,
        pointsAgainst: 50,
        pointDifferential: 25,
        gamesPlayed: 3,
        poolRank: i + 1,
      }));

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'bracket-123',
        data: () => mockBracket,
      } as any);

      (poolService.calculateStandings as jest.Mock).mockResolvedValue(mockStandings);

      await expect(
        service.seedBracketFromPools('bracket-123', ['pool-1'])
      ).rejects.toThrow('Too many teams (6) for bracket size (4)');
    });
  });

  describe('deleteBracket', () => {
    it('should delete bracket and all associated games', async () => {
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
          bracketId: 'bracket-123',
          bracketRound: 'Finals',
          bracketPosition: 1,
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

      await service.deleteBracket('bracket-123');

      expect(mockBatch.delete).toHaveBeenCalledTimes(2); // 1 game + 1 bracket
      expect(mockBatch.commit).toHaveBeenCalled();
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
          bracketId: 'bracket-123',
          bracketRound: 'Finals',
          bracketPosition: 1,
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

      await expect(service.deleteBracket('bracket-123')).rejects.toThrow(
        'Cannot delete bracket: some games have already been completed'
      );
    });
  });

  describe('getBracket', () => {
    it('should return bracket data', async () => {
      const mockBracket: Bracket = {
        id: 'bracket-123',
        divisionId: 'division-1',
        tournamentId: 'tournament-1',
        name: 'Gold Bracket',
        size: 8,
        seedingSource: 'manual',
        seeds: [],
        createdAt: Timestamp.now() as any,
      };

      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'bracket-123',
        data: () => mockBracket,
      } as any);

      const result = await service.getBracket('bracket-123');

      expect(result.id).toBe('bracket-123');
      expect(result.name).toBe('Gold Bracket');
    });

    it('should throw error if bracket not found', async () => {
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(service.getBracket('bracket-123')).rejects.toThrow(
        'Bracket not found'
      );
    });
  });
});
