import { BracketService } from '../BracketService';
import { addDoc, getDoc, getDocs, doc, query, where, writeBatch } from 'firebase/firestore';
import { GameStatus } from '../../../types';
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

describe('BracketService', () => {
  let service: BracketService;
  let mockBatch: any;

  beforeEach(() => {
    service = new BracketService();
    
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

  describe('createBracket', () => {
    it('should create 4-team bracket', async () => {
      const mockDocRef = { id: 'bracket123' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      
      // Mock getBracketsByDivision to return empty array (no existing brackets)
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const result = await service.createBracket(
        'division1',
        'tournament1',
        'Gold Bracket',
        4,
        'manual'
      );

      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.id).toBe('bracket123');
      expect(result.name).toBe('Gold Bracket');
      expect(result.size).toBe(4);
      expect(result.seeds).toHaveLength(4);
    });

    it('should create 8-team bracket with correct seeds', async () => {
      const mockDocRef = { id: 'bracket456' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      
      // Mock getBracketsByDivision to return empty array
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const result = await service.createBracket(
        'division1',
        'tournament1',
        'Silver Bracket',
        8,
        'pools'
      );

      expect(result.size).toBe(8);
      expect(result.seeds).toHaveLength(8);
      expect(result.seedingSource).toBe('pools');
    });

    it('should throw error for invalid bracket size', async () => {
      // Mock getBracketsByDivision to return empty array
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);
      
      await expect(
        service.createBracket(
          'division1',
          'tournament1',
          'Gold Bracket',
          5 as any, // Invalid size
          'manual'
        )
      ).rejects.toThrow('Bracket size must be 4, 8, 16, or 32');
    });
  });

  describe('generateBracketGames', () => {
    it('should generate 3 games for 4-team bracket', async () => {
      const mockBracket = {
        id: 'bracket1',
        divisionId: 'division1',
        tournamentId: 'tournament1',
        name: 'Gold Bracket',
        size: 4,
        seedingSource: 'manual',
        seeds: [
          { position: 1, teamName: 'Team 1' },
          { position: 2, teamName: 'Team 2' },
          { position: 3, teamName: 'Team 3' },
          { position: 4, teamName: 'Team 4' },
        ],
        createdAt: mockTimestamp.now(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'bracket1',
        data: () => mockBracket,
      } as any);

      await service.generateBracketGames('bracket1');

      // 4-team bracket = 3 games (2 semifinals + 1 final)
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should generate 7 games for 8-team bracket', async () => {
      const seeds = Array.from({ length: 8 }, (_, i) => ({
        position: i + 1,
        teamName: `Team ${i + 1}`,
      }));

      const mockBracket = {
        id: 'bracket1',
        divisionId: 'division1',
        tournamentId: 'tournament1',
        name: 'Gold Bracket',
        size: 8,
        seedingSource: 'manual',
        seeds,
        createdAt: mockTimestamp.now(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'bracket1',
        data: () => mockBracket,
      } as any);

      await service.generateBracketGames('bracket1');

      // 8-team bracket = 7 games (4 quarterfinals + 2 semifinals + 1 final)
      expect(mockBatch.set).toHaveBeenCalledTimes(7);
    });

    it('should throw error if bracket not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(service.generateBracketGames('nonexistent'))
        .rejects.toThrow('Bracket not found');
    });
  });

  describe('getBracket', () => {
    it('should return bracket data', async () => {
      const mockBracket = {
        id: 'bracket1',
        name: 'Gold Bracket',
        size: 4,
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'bracket1',
        data: () => mockBracket,
      } as any);

      const result = await service.getBracket('bracket1');

      expect(result.id).toBe('bracket1');
      expect(result.name).toBe('Gold Bracket');
    });

    it('should throw error if bracket not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(service.getBracket('nonexistent'))
        .rejects.toThrow('Bracket not found');
    });
  });

  describe('getBracketsByDivision', () => {
    it('should return array of brackets', async () => {
      const mockBrackets = [
        { id: 'bracket1', name: 'Gold Bracket' },
        { id: 'bracket2', name: 'Silver Bracket' },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockBrackets.map(bracket => ({
          id: bracket.id,
          data: () => bracket,
        })),
      } as any);

      const result = await service.getBracketsByDivision('division1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Gold Bracket');
      expect(result[1].name).toBe('Silver Bracket');
    });

    it('should return empty array if no brackets found', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const result = await service.getBracketsByDivision('division1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getBracketState', () => {
    it('should organize games by round', async () => {
      const mockBracket = {
        id: 'bracket1',
        name: 'Gold Bracket',
        size: 4,
      };

      const mockGames = [
        {
          id: 'game1',
          bracketRound: 'Semifinals',
          bracketPosition: 1,
          status: GameStatus.COMPLETED,
        },
        {
          id: 'game2',
          bracketRound: 'Semifinals',
          bracketPosition: 2,
          status: GameStatus.COMPLETED,
        },
        {
          id: 'game3',
          bracketRound: 'Finals',
          bracketPosition: 1,
          status: GameStatus.SCHEDULED,
        },
      ];

      // Mock getBracket call
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'bracket1',
        data: () => mockBracket,
      } as any);

      // Mock getGamesByBracket call
      mockGetDocs.mockResolvedValue({
        docs: mockGames.map(game => ({
          id: game.id,
          data: () => game,
        })),
      } as any);

      const result = await service.getBracketState('bracket1');

      expect(result.bracket.id).toBe('bracket1');
      expect(result.gamesByRound.size).toBe(2);
      expect(result.gamesByRound.get('Semifinals')).toHaveLength(2);
      expect(result.gamesByRound.get('Finals')).toHaveLength(1);
    });
  });
});
