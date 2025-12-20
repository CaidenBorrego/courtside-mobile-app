import { PoolService } from '../PoolService';
import { addDoc, getDoc, getDocs, doc, query, where, writeBatch } from 'firebase/firestore';
import { mockTimestamp } from '../../../__tests__/setup';

// Mock Firestore
jest.mock('firebase/firestore');
jest.mock('../../firebase/config', () => ({
  db: {},
}));

const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockWriteBatch = writeBatch as jest.MockedFunction<typeof writeBatch>;

describe('PoolService', () => {
  let service: PoolService;
  let mockBatch: any;

  beforeEach(() => {
    service = new PoolService();
    
    // Setup batch mock
    mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    
    mockWriteBatch.mockReturnValue(mockBatch);
    mockDoc.mockReturnValue({ id: 'mock-id' } as any);
    mockQuery.mockReturnValue({} as any);
    mockWhere.mockReturnValue({} as any);
    
    jest.clearAllMocks();
  });

  describe('createPool', () => {
    it('should create pool with valid data', async () => {
      const mockDocRef = { id: 'pool123' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      
      // Mock getPoolsByDivision to return empty array (no existing pools)
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const result = await service.createPool(
        'division1',
        'tournament1',
        'Pool A',
        ['Team 1', 'Team 2', 'Team 3']
      );

      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.id).toBe('pool123');
      expect(result.name).toBe('Pool A');
      expect(result.teams).toEqual(['Team 1', 'Team 2', 'Team 3']);
    });

    it('should throw error for less than 2 teams', async () => {
      // Mock getPoolsByDivision to return empty array
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);
      
      await expect(
        service.createPool('division1', 'tournament1', 'Pool A', ['Team 1'])
      ).rejects.toThrow('Pool must have at least 2 teams');
    });

    it('should throw error for more than 16 teams', async () => {
      const teams = Array.from({ length: 17 }, (_, i) => `Team ${i + 1}`);
      
      // Mock getPoolsByDivision to return empty array
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);
      
      await expect(
        service.createPool('division1', 'tournament1', 'Pool A', teams)
      ).rejects.toThrow('Pool cannot have more than 16 teams');
    });

    it('should throw error for duplicate team names', async () => {
      // Mock getPoolsByDivision to return empty array
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);
      
      await expect(
        service.createPool('division1', 'tournament1', 'Pool A', ['Team 1', 'Team 1'])
      ).rejects.toThrow('Pool cannot have duplicate team names');
    });
  });

  describe('generatePoolGames', () => {
    it('should generate correct number of games for 3 teams', async () => {
      const mockPool = {
        id: 'pool1',
        divisionId: 'division1',
        tournamentId: 'tournament1',
        name: 'Pool A',
        teams: ['Team 1', 'Team 2', 'Team 3'],
        createdAt: mockTimestamp.now(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'pool1',
        data: () => mockPool,
      } as any);

      await service.generatePoolGames('pool1');

      // 3 teams = 3 games (n * (n-1) / 2)
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should generate correct number of games for 4 teams', async () => {
      const mockPool = {
        id: 'pool1',
        divisionId: 'division1',
        tournamentId: 'tournament1',
        name: 'Pool A',
        teams: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
        createdAt: mockTimestamp.now(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'pool1',
        data: () => mockPool,
      } as any);

      await service.generatePoolGames('pool1');

      // 4 teams = 6 games
      expect(mockBatch.set).toHaveBeenCalledTimes(6);
    });

    it('should throw error if pool not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(service.generatePoolGames('nonexistent'))
        .rejects.toThrow('Pool not found');
    });

    it('should throw error if pool has less than 2 teams', async () => {
      const mockPool = {
        id: 'pool1',
        teams: ['Team 1'],
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'pool1',
        data: () => mockPool,
      } as any);

      await expect(service.generatePoolGames('pool1'))
        .rejects.toThrow('Pool must have at least 2 teams to generate games');
    });
  });

  describe('getPool', () => {
    it('should return pool data', async () => {
      const mockPool = {
        id: 'pool1',
        name: 'Pool A',
        teams: ['Team 1', 'Team 2'],
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'pool1',
        data: () => mockPool,
      } as any);

      const result = await service.getPool('pool1');

      expect(result.id).toBe('pool1');
      expect(result.name).toBe('Pool A');
    });

    it('should throw error if pool not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(service.getPool('nonexistent'))
        .rejects.toThrow('Pool not found');
    });
  });

  describe('getPoolsByDivision', () => {
    it('should return array of pools', async () => {
      const mockPools = [
        { id: 'pool1', name: 'Pool A' },
        { id: 'pool2', name: 'Pool B' },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockPools.map(pool => ({
          id: pool.id,
          data: () => pool,
        })),
      } as any);

      const result = await service.getPoolsByDivision('division1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Pool A');
      expect(result[1].name).toBe('Pool B');
    });

    it('should return empty array if no pools found', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const result = await service.getPoolsByDivision('division1');

      expect(result).toHaveLength(0);
    });
  });
});
