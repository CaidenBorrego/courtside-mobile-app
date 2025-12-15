import {
  tournamentStructureService,
  TournamentStructureService,
} from '../TournamentStructureService';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Pool, Bracket, Game, GameStatus } from '../../../types';
import { poolService } from '../PoolService';
import { bracketService } from '../BracketService';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../../firebase/config', () => ({
  db: {},
}));
jest.mock('../PoolService');
jest.mock('../BracketService');

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockTimestamp = Timestamp as jest.Mocked<typeof Timestamp>;

describe('TournamentStructureService', () => {
  let service: TournamentStructureService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TournamentStructureService();

    // Mock Timestamp.now()
    (mockTimestamp.now as jest.Mock) = jest.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
    }));
  });

  describe('advancePoolsToBrackets', () => {
    it('should advance pools to brackets successfully', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          advancementCount: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      const mockBrackets: Bracket[] = [
        {
          id: 'bracket-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Gold Bracket',
          size: 4,
          seedingSource: 'pools',
          seeds: [],
          createdAt: Timestamp.now() as any,
        },
      ];

      // Mock arePoolsComplete
      jest.spyOn(service, 'arePoolsComplete').mockResolvedValue(true);

      // Mock pools query
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: mockPools.map(pool => ({
            id: pool.id,
            data: () => pool,
          })),
        } as any)
        .mockResolvedValueOnce({
          empty: false,
          docs: mockBrackets.map(bracket => ({
            id: bracket.id,
            data: () => bracket,
          })),
        } as any);

      (bracketService.seedBracketFromPools as jest.Mock).mockResolvedValue(undefined);

      await service.advancePoolsToBrackets('division-1');

      expect(bracketService.seedBracketFromPools).toHaveBeenCalledWith('bracket-1', [
        'pool-1',
      ]);
    });

    it('should throw error if pools are not complete', async () => {
      jest.spyOn(service, 'arePoolsComplete').mockResolvedValue(false);

      await expect(service.advancePoolsToBrackets('division-1')).rejects.toThrow(
        'Cannot advance to brackets: not all pool games are completed'
      );
    });

    it('should throw error if no pools found', async () => {
      jest.spyOn(service, 'arePoolsComplete').mockResolvedValue(true);

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      } as any);

      await expect(service.advancePoolsToBrackets('division-1')).rejects.toThrow(
        'No pools found for division'
      );
    });

    it('should throw error if no brackets found', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          createdAt: Timestamp.now() as any,
        },
      ];

      jest.spyOn(service, 'arePoolsComplete').mockResolvedValue(true);

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: mockPools.map(pool => ({
            id: pool.id,
            data: () => pool,
          })),
        } as any)
        .mockResolvedValueOnce({
          empty: true,
          docs: [],
        } as any);

      await expect(service.advancePoolsToBrackets('division-1')).rejects.toThrow(
        'No brackets found for division'
      );
    });

    it('should only seed brackets configured for pool seeding', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          createdAt: Timestamp.now() as any,
        },
      ];

      const mockBrackets: Bracket[] = [
        {
          id: 'bracket-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Gold Bracket',
          size: 4,
          seedingSource: 'pools',
          seeds: [],
          createdAt: Timestamp.now() as any,
        },
        {
          id: 'bracket-2',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Silver Bracket',
          size: 4,
          seedingSource: 'manual',
          seeds: [],
          createdAt: Timestamp.now() as any,
        },
      ];

      jest.spyOn(service, 'arePoolsComplete').mockResolvedValue(true);

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: mockPools.map(pool => ({
            id: pool.id,
            data: () => pool,
          })),
        } as any)
        .mockResolvedValueOnce({
          empty: false,
          docs: mockBrackets.map(bracket => ({
            id: bracket.id,
            data: () => bracket,
          })),
        } as any);

      (bracketService.seedBracketFromPools as jest.Mock).mockResolvedValue(undefined);

      await service.advancePoolsToBrackets('division-1');

      // Should only seed bracket-1 (pools seeding), not bracket-2 (manual seeding)
      expect(bracketService.seedBracketFromPools).toHaveBeenCalledTimes(1);
      expect(bracketService.seedBracketFromPools).toHaveBeenCalledWith('bracket-1', [
        'pool-1',
      ]);
    });
  });

  describe('arePoolsComplete', () => {
    it('should return true if all pool games are completed', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          createdAt: Timestamp.now() as any,
        },
      ];

      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team 1',
          teamB: 'Team 2',
          scoreA: 25,
          scoreB: 20,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.COMPLETED,
          poolId: 'pool-1',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: mockPools.map(pool => ({
          id: pool.id,
          data: () => pool,
        })),
      } as any);

      (poolService.getGamesByPool as jest.Mock).mockResolvedValue(mockGames);

      const result = await service.arePoolsComplete('division-1');

      expect(result).toBe(true);
    });

    it('should return false if any pool games are not completed', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          createdAt: Timestamp.now() as any,
        },
      ];

      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team 1',
          teamB: 'Team 2',
          scoreA: 0,
          scoreB: 0,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.SCHEDULED,
          poolId: 'pool-1',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: mockPools.map(pool => ({
          id: pool.id,
          data: () => pool,
        })),
      } as any);

      (poolService.getGamesByPool as jest.Mock).mockResolvedValue(mockGames);

      const result = await service.arePoolsComplete('division-1');

      expect(result).toBe(false);
    });

    it('should return true if no pools exist', async () => {
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      } as any);

      const result = await service.arePoolsComplete('division-1');

      expect(result).toBe(true);
    });

    it('should ignore cancelled games', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          createdAt: Timestamp.now() as any,
        },
      ];

      const mockGames: Game[] = [
        {
          id: 'game-1',
          tournamentId: 'tournament-1',
          divisionId: 'division-1',
          teamA: 'Team 1',
          teamB: 'Team 2',
          scoreA: 0,
          scoreB: 0,
          startTime: Timestamp.now() as any,
          locationId: 'loc-1',
          status: GameStatus.CANCELLED,
          poolId: 'pool-1',
          poolGameNumber: 1,
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: mockPools.map(pool => ({
          id: pool.id,
          data: () => pool,
        })),
      } as any);

      (poolService.getGamesByPool as jest.Mock).mockResolvedValue(mockGames);

      const result = await service.arePoolsComplete('division-1');

      expect(result).toBe(true);
    });
  });

  describe('getTournamentFormat', () => {
    it('should return hybrid format when both pools and brackets exist', async () => {
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({ size: 2 } as any) // pools
        .mockResolvedValueOnce({ size: 1 } as any); // brackets

      const result = await service.getTournamentFormat('division-1');

      expect(result).toEqual({
        hasPoolPlay: true,
        hasBrackets: true,
        isHybrid: true,
        poolCount: 2,
        bracketCount: 1,
      });
    });

    it('should return pool-only format', async () => {
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({ size: 2 } as any) // pools
        .mockResolvedValueOnce({ size: 0 } as any); // brackets

      const result = await service.getTournamentFormat('division-1');

      expect(result).toEqual({
        hasPoolPlay: true,
        hasBrackets: false,
        isHybrid: false,
        poolCount: 2,
        bracketCount: 0,
      });
    });

    it('should return bracket-only format', async () => {
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({ size: 0 } as any) // pools
        .mockResolvedValueOnce({ size: 1 } as any); // brackets

      const result = await service.getTournamentFormat('division-1');

      expect(result).toEqual({
        hasPoolPlay: false,
        hasBrackets: true,
        isHybrid: false,
        poolCount: 0,
        bracketCount: 1,
      });
    });
  });

  describe('validateStructure', () => {
    it('should return valid for correct structure', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2', 'Team 3'],
          advancementCount: 2,
          createdAt: Timestamp.now() as any,
        },
      ];

      const mockBrackets: Bracket[] = [
        {
          id: 'bracket-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Gold Bracket',
          size: 4,
          seedingSource: 'pools',
          seeds: Array.from({ length: 4 }, (_, i) => ({ position: i + 1 })),
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockPools.map(pool => ({
            id: pool.id,
            data: () => pool,
          })),
        } as any)
        .mockResolvedValueOnce({
          docs: mockBrackets.map(bracket => ({
            id: bracket.id,
            data: () => bracket,
          })),
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const result = await service.validateStructure('division-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate pool names', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          createdAt: Timestamp.now() as any,
        },
        {
          id: 'pool-2',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 3', 'Team 4'],
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockPools.map(pool => ({
            id: pool.id,
            data: () => pool,
          })),
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const result = await service.validateStructure('division-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate pool names found: Pool A');
    });

    it('should detect pools with too few teams', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1'],
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockPools.map(pool => ({
            id: pool.id,
            data: () => pool,
          })),
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const result = await service.validateStructure('division-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pool "Pool A" must have at least 2 teams');
    });

    it('should detect teams in multiple pools', async () => {
      const mockPools: Pool[] = [
        {
          id: 'pool-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool A',
          teams: ['Team 1', 'Team 2'],
          createdAt: Timestamp.now() as any,
        },
        {
          id: 'pool-2',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Pool B',
          teams: ['Team 2', 'Team 3'],
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockPools.map(pool => ({
            id: pool.id,
            data: () => pool,
          })),
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const result = await service.validateStructure('division-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Teams assigned to multiple pools: Team 2');
    });

    it('should detect invalid bracket sizes', async () => {
      const mockBrackets: Bracket[] = [
        {
          id: 'bracket-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Gold Bracket',
          size: 6 as any,
          seedingSource: 'manual',
          seeds: [],
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValueOnce({
          docs: mockBrackets.map(bracket => ({
            id: bracket.id,
            data: () => bracket,
          })),
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const result = await service.validateStructure('division-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bracket "Gold Bracket" has invalid size: 6');
    });

    it('should warn about unseeded manual brackets', async () => {
      const mockBrackets: Bracket[] = [
        {
          id: 'bracket-1',
          divisionId: 'division-1',
          tournamentId: 'tournament-1',
          name: 'Gold Bracket',
          size: 4,
          seedingSource: 'manual',
          seeds: [
            { position: 1 },
            { position: 2 },
            { position: 3 },
            { position: 4 },
          ],
          createdAt: Timestamp.now() as any,
        },
      ];

      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [],
        } as any)
        .mockResolvedValueOnce({
          docs: mockBrackets.map(bracket => ({
            id: bracket.id,
            data: () => bracket,
          })),
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const result = await service.validateStructure('division-1');

      expect(result.warnings).toContain(
        'Bracket "Gold Bracket" has unseeded positions: 1, 2, 3, 4'
      );
    });
  });
});
