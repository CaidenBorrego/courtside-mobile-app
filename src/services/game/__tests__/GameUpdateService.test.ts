import { GameUpdateService } from '../GameUpdateService';
import { FirebaseService } from '../../firebase/FirebaseService';
import { Game, GameStatus } from '../../../types';
import { Timestamp } from 'firebase/firestore';

// Mock the Firebase service
jest.mock('../../firebase/FirebaseService');

describe('GameUpdateService', () => {
  let gameUpdateService: GameUpdateService;
  let mockFirebaseService: jest.Mocked<FirebaseService>;

  // Helper to create a mock game
  const createMockGame = (overrides?: Partial<Game>): Game => ({
    id: 'game-1',
    tournamentId: 'tournament-1',
    divisionId: 'division-1',
    teamA: 'Team A',
    teamB: 'Team B',
    scoreA: 0,
    scoreB: 0,
    startTime: Timestamp.now(),
    locationId: 'location-1',
    status: GameStatus.SCHEDULED,
    createdAt: Timestamp.now(),
    ...overrides,
  });

  beforeEach(() => {
    mockFirebaseService = new FirebaseService() as jest.Mocked<FirebaseService>;
    gameUpdateService = new GameUpdateService(mockFirebaseService);
  });

  describe('hasPlaceholderTeams', () => {
    it('should return true when teamA is TBD', () => {
      const game = createMockGame({ teamA: 'TBD', teamB: 'Team B' });
      expect(gameUpdateService.hasPlaceholderTeams(game)).toBe(true);
    });

    it('should return true when teamB is TBD', () => {
      const game = createMockGame({ teamA: 'Team A', teamB: 'TBD' });
      expect(gameUpdateService.hasPlaceholderTeams(game)).toBe(true);
    });

    it('should return true when teamA is "Winner of Game 1"', () => {
      const game = createMockGame({ teamA: 'Winner of Game 1', teamB: 'Team B' });
      expect(gameUpdateService.hasPlaceholderTeams(game)).toBe(true);
    });

    it('should return true when teamB is "Loser of Game 2"', () => {
      const game = createMockGame({ teamA: 'Team A', teamB: 'Loser of Game 2' });
      expect(gameUpdateService.hasPlaceholderTeams(game)).toBe(true);
    });

    it('should return true when team is pool placeholder', () => {
      const game = createMockGame({ teamA: '1st Pool A', teamB: 'Team B' });
      expect(gameUpdateService.hasPlaceholderTeams(game)).toBe(true);
    });

    it('should return false when both teams are real teams', () => {
      const game = createMockGame({ teamA: 'Team A', teamB: 'Team B' });
      expect(gameUpdateService.hasPlaceholderTeams(game)).toBe(false);
    });

    it('should return true when teamA is empty', () => {
      const game = createMockGame({ teamA: '', teamB: 'Team B' });
      expect(gameUpdateService.hasPlaceholderTeams(game)).toBe(true);
    });
  });

  describe('validateGameUpdate', () => {
    describe('score validation', () => {
      it('should pass validation for valid scores', async () => {
        const game = createMockGame();
        const updates = { scoreA: 21, scoreB: 15 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail validation for negative scores', async () => {
        const game = createMockGame();
        const updates = { scoreA: -5, scoreB: 10 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Scores must be non-negative integers');
      });

      it('should fail validation for non-integer scores', async () => {
        const game = createMockGame();
        const updates = { scoreA: 21.5, scoreB: 15 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Scores must be non-negative integers');
      });

      it('should warn about tie games', async () => {
        const game = createMockGame();
        const updates = { scoreA: 15, scoreB: 15 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('Tie game detected - please verify scores');
      });

      it('should not warn about tie games when both scores are zero', async () => {
        const game = createMockGame();
        const updates = { scoreA: 0, scoreB: 0 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('placeholder team validation', () => {
      it('should fail validation when updating scores for placeholder game', async () => {
        const game = createMockGame({ teamA: 'TBD', teamB: 'Winner of Game 1' });
        const updates = { scoreA: 21, scoreB: 15 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot update scores for games with undetermined teams');
      });

      it('should allow zero scores for placeholder game', async () => {
        const game = createMockGame({ teamA: 'TBD', teamB: 'Winner of Game 1' });
        const updates = { scoreA: 0, scoreB: 0 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail validation when changing status of placeholder game', async () => {
        const game = createMockGame({ teamA: 'TBD', teamB: 'Winner of Game 1' });
        const updates = { status: GameStatus.IN_PROGRESS };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot update scores for games with undetermined teams');
      });

      it('should allow CANCELLED status for placeholder game', async () => {
        const game = createMockGame({ teamA: 'TBD', teamB: 'Winner of Game 1' });
        const updates = { status: GameStatus.CANCELLED };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('dependency validation', () => {
      it('should pass validation when no dependencies exist', async () => {
        const game = createMockGame();
        const updates = { status: GameStatus.IN_PROGRESS };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass validation when all dependencies are completed', async () => {
        const game = createMockGame({ 
          dependsOnGames: ['game-2', 'game-3'] 
        });
        const updates = { status: GameStatus.IN_PROGRESS };

        const upstreamGame1 = createMockGame({ 
          id: 'game-2', 
          status: GameStatus.COMPLETED 
        });
        const upstreamGame2 = createMockGame({ 
          id: 'game-3', 
          status: GameStatus.COMPLETED 
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(upstreamGame1)
          .mockResolvedValueOnce(upstreamGame2);

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail validation when dependencies are not completed', async () => {
        const game = createMockGame({ 
          dependsOnGames: ['game-2', 'game-3'] 
        });
        const updates = { status: GameStatus.IN_PROGRESS };

        const upstreamGame1 = createMockGame({ 
          id: 'game-2', 
          status: GameStatus.COMPLETED 
        });
        const upstreamGame2 = createMockGame({ 
          id: 'game-3', 
          status: GameStatus.SCHEDULED 
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(upstreamGame1)
          .mockResolvedValueOnce(upstreamGame2);

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot start game until dependent games are completed');
      });

      it('should only validate dependencies when status changes to IN_PROGRESS', async () => {
        const game = createMockGame({ 
          dependsOnGames: ['game-2'] 
        });
        const updates = { scoreA: 10, scoreB: 5 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(mockFirebaseService.getGame).not.toHaveBeenCalled();
      });
    });

    describe('combined validations', () => {
      it('should return multiple errors when multiple validations fail', async () => {
        const game = createMockGame({ teamA: 'TBD', teamB: 'Team B' });
        const updates = { scoreA: -5, scoreB: 10 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should validate partial updates correctly', async () => {
        const game = createMockGame({ scoreA: 10, scoreB: 5 });
        const updates = { scoreA: 21 };

        const result = await gameUpdateService.validateGameUpdate(game, updates);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('advanceTeams', () => {
    describe('single elimination scenarios', () => {
      it('should advance winner to next game', async () => {
        const completedGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const downstreamGame = createMockGame({
          id: 'game-3',
          teamA: 'TBD',
          teamB: 'TBD',
          dependsOnGames: ['game-1', 'game-2'],
        });

        mockFirebaseService.getGame.mockResolvedValue(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        const result = await gameUpdateService.advanceTeams(completedGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamA: 'Team A',
            }),
          },
        ]);
        expect(result).toHaveLength(1);
      });

      it('should determine correct team slot based on dependsOnGames order', async () => {
        const completedGame = createMockGame({
          id: 'game-2',
          teamA: 'Team C',
          teamB: 'Team D',
          scoreA: 18,
          scoreB: 21,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const downstreamGame = createMockGame({
          id: 'game-3',
          teamA: 'TBD',
          teamB: 'TBD',
          dependsOnGames: ['game-1', 'game-2'],
        });

        mockFirebaseService.getGame.mockResolvedValue(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        await gameUpdateService.advanceTeams(completedGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamB: 'Team D',
            }),
          },
        ]);
      });

      it('should use bracketPosition to determine team slot', async () => {
        const completedGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const downstreamGame = createMockGame({
          id: 'game-3',
          teamA: 'TBD',
          teamB: 'TBD',
          bracketPosition: 1,
        });

        mockFirebaseService.getGame.mockResolvedValue(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        await gameUpdateService.advanceTeams(completedGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamB: 'Team A',
            }),
          },
        ]);
      });

      it('should preserve team images when advancing', async () => {
        const completedGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          teamAImageUrl: 'https://example.com/teamA.png',
          teamBImageUrl: 'https://example.com/teamB.png',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const downstreamGame = createMockGame({
          id: 'game-3',
          teamA: 'TBD',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        mockFirebaseService.getGame.mockResolvedValue(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        await gameUpdateService.advanceTeams(completedGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamA: 'Team A',
              teamAImageUrl: 'https://example.com/teamA.png',
            }),
          },
        ]);
      });
    });

    describe('double elimination scenarios', () => {
      it('should advance both winner and loser to different games', async () => {
        const completedGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
          loserFeedsIntoGame: 'game-4',
        });

        const winnerGame = createMockGame({
          id: 'game-3',
          teamA: 'TBD',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        const loserGame = createMockGame({
          id: 'game-4',
          teamA: 'TBD',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(winnerGame)
          .mockResolvedValueOnce(loserGame)
          .mockResolvedValueOnce(winnerGame)
          .mockResolvedValueOnce(loserGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        const result = await gameUpdateService.advanceTeams(completedGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamA: 'Team A',
            }),
          },
          {
            gameId: 'game-4',
            data: expect.objectContaining({
              teamA: 'Team B',
            }),
          },
        ]);
        expect(result).toHaveLength(2);
      });

      it('should advance loser with correct team image', async () => {
        const completedGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          teamAImageUrl: 'https://example.com/teamA.png',
          teamBImageUrl: 'https://example.com/teamB.png',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          loserFeedsIntoGame: 'game-4',
        });

        const loserGame = createMockGame({
          id: 'game-4',
          teamA: 'TBD',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(loserGame)
          .mockResolvedValueOnce(loserGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        await gameUpdateService.advanceTeams(completedGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-4',
            data: expect.objectContaining({
              teamA: 'Team B',
              teamAImageUrl: 'https://example.com/teamB.png',
            }),
          },
        ]);
      });
    });

    it('should throw error when game is not completed', async () => {
      const game = createMockGame({
        status: GameStatus.SCHEDULED,
      });

      await expect(gameUpdateService.advanceTeams(game)).rejects.toThrow(
        'Cannot advance teams from a game that is not completed'
      );
    });

    it('should handle games with no downstream games', async () => {
      const completedGame = createMockGame({
        id: 'game-1',
        teamA: 'Team A',
        teamB: 'Team B',
        scoreA: 21,
        scoreB: 15,
        status: GameStatus.COMPLETED,
      });

      const result = await gameUpdateService.advanceTeams(completedGame);

      expect(result).toHaveLength(0);
      expect(mockFirebaseService.batchUpdateGames).not.toHaveBeenCalled();
    });
  });

  describe('cascadeGameChanges', () => {
    describe('winner changes', () => {
      it('should update downstream game when winner changes', async () => {
        const oldGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const newGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 15,
          scoreB: 21,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const downstreamGame = createMockGame({
          id: 'game-3',
          teamA: 'Team A',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(downstreamGame)
          .mockResolvedValueOnce(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        const result = await gameUpdateService.cascadeGameChanges('game-1', oldGame, newGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamA: 'Team B',
            }),
          },
        ]);
        expect(result).toHaveLength(1);
      });

      it('should update downstream game when loser changes', async () => {
        const oldGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          loserFeedsIntoGame: 'game-4',
        });

        const newGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 15,
          scoreB: 21,
          status: GameStatus.COMPLETED,
          loserFeedsIntoGame: 'game-4',
        });

        const downstreamGame = createMockGame({
          id: 'game-4',
          teamA: 'Team B',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(downstreamGame)
          .mockResolvedValueOnce(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        const result = await gameUpdateService.cascadeGameChanges('game-1', oldGame, newGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-4',
            data: expect.objectContaining({
              teamA: 'Team A',
            }),
          },
        ]);
        expect(result).toHaveLength(1);
      });

      it('should not cascade when winner does not change', async () => {
        const oldGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const newGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 25,
          scoreB: 18,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const result = await gameUpdateService.cascadeGameChanges('game-1', oldGame, newGame);

        expect(mockFirebaseService.batchUpdateGames).not.toHaveBeenCalled();
        expect(result).toHaveLength(0);
      });
    });

    describe('status resets', () => {
      it('should replace teams with placeholders when status changes to scheduled', async () => {
        const oldGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
          gameLabel: 'Semifinal 1',
        });

        const newGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 0,
          scoreB: 0,
          status: GameStatus.SCHEDULED,
          winnerFeedsIntoGame: 'game-3',
          gameLabel: 'Semifinal 1',
        });

        const downstreamGame = createMockGame({
          id: 'game-3',
          teamA: 'Team A',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(downstreamGame)
          .mockResolvedValueOnce(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        const result = await gameUpdateService.cascadeGameChanges('game-1', oldGame, newGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamA: 'Winner of Semifinal 1',
              teamAImageUrl: undefined,
            }),
          },
        ]);
        expect(result).toHaveLength(1);
      });

      it('should replace loser with placeholder when status resets', async () => {
        const oldGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          loserFeedsIntoGame: 'game-4',
          gameLabel: 'Semifinal 1',
        });

        const newGame = createMockGame({
          id: 'game-1',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 0,
          scoreB: 0,
          status: GameStatus.SCHEDULED,
          loserFeedsIntoGame: 'game-4',
          gameLabel: 'Semifinal 1',
        });

        const downstreamGame = createMockGame({
          id: 'game-4',
          teamA: 'Team B',
          teamB: 'TBD',
          dependsOnGames: ['game-1'],
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(downstreamGame)
          .mockResolvedValueOnce(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        const result = await gameUpdateService.cascadeGameChanges('game-1', oldGame, newGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-4',
            data: expect.objectContaining({
              teamA: 'Loser of Semifinal 1',
              teamAImageUrl: undefined,
            }),
          },
        ]);
        expect(result).toHaveLength(1);
      });

      it('should use game ID in placeholder when gameLabel is missing', async () => {
        const oldGame = createMockGame({
          id: 'game-abc123',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 21,
          scoreB: 15,
          status: GameStatus.COMPLETED,
          winnerFeedsIntoGame: 'game-3',
        });

        const newGame = createMockGame({
          id: 'game-abc123',
          teamA: 'Team A',
          teamB: 'Team B',
          scoreA: 0,
          scoreB: 0,
          status: GameStatus.SCHEDULED,
          winnerFeedsIntoGame: 'game-3',
        });

        const downstreamGame = createMockGame({
          id: 'game-3',
          teamA: 'Team A',
          teamB: 'TBD',
          dependsOnGames: ['game-abc123'],
        });

        mockFirebaseService.getGame
          .mockResolvedValueOnce(downstreamGame)
          .mockResolvedValueOnce(downstreamGame);
        mockFirebaseService.batchUpdateGames.mockResolvedValue();

        await gameUpdateService.cascadeGameChanges('game-abc123', oldGame, newGame);

        expect(mockFirebaseService.batchUpdateGames).toHaveBeenCalledWith([
          {
            gameId: 'game-3',
            data: expect.objectContaining({
              teamA: 'Winner of Game game-abc',
            }),
          },
        ]);
      });
    });

    it('should handle games with no downstream games', async () => {
      const oldGame = createMockGame({
        id: 'game-1',
        teamA: 'Team A',
        teamB: 'Team B',
        scoreA: 21,
        scoreB: 15,
        status: GameStatus.COMPLETED,
      });

      const newGame = createMockGame({
        id: 'game-1',
        teamA: 'Team A',
        teamB: 'Team B',
        scoreA: 0,
        scoreB: 0,
        status: GameStatus.SCHEDULED,
      });

      const result = await gameUpdateService.cascadeGameChanges('game-1', oldGame, newGame);

      expect(result).toHaveLength(0);
      expect(mockFirebaseService.batchUpdateGames).not.toHaveBeenCalled();
    });
  });
});
