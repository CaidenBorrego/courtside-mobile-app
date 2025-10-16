import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { FirebaseService } from '../FirebaseService';
import {
  Tournament,
  Game,
  Division,
  Location,
  UserProfile,
  TournamentStatus,
  GameStatus,
  UserRole,
  Gender,
} from '../../../types';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../config', () => ({
  db: {},
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>;
const mockWriteBatch = writeBatch as jest.MockedFunction<typeof writeBatch>;
const mockArrayUnion = arrayUnion as jest.MockedFunction<typeof arrayUnion>;
const mockArrayRemove = arrayRemove as jest.MockedFunction<typeof arrayRemove>;

describe('FirebaseService', () => {
  let firebaseService: FirebaseService;
  let mockTimestamp: jest.MockedFunction<typeof Timestamp.now>;

  beforeEach(() => {
    jest.clearAllMocks();
    firebaseService = new FirebaseService();
    
    // Mock Timestamp.now
    mockTimestamp = jest.fn().mockReturnValue({
      seconds: 1640995200,
      nanoseconds: 0,
    } as any);
    (Timestamp as any).now = mockTimestamp;

    // Setup default mocks
    mockCollection.mockReturnValue({} as any);
    mockDoc.mockReturnValue({ id: 'mock-doc-id' } as any);
    mockQuery.mockReturnValue({} as any);
    mockWhere.mockReturnValue({} as any);
    mockOrderBy.mockReturnValue({} as any);
  });

  describe('Tournament Operations', () => {
    const mockTournament: Tournament = {
      id: 'tournament-1',
      name: 'Summer Basketball Tournament',
      startDate: Timestamp.now(),
      endDate: Timestamp.now(),
      city: 'Los Angeles',
      state: 'CA',
      status: TournamentStatus.UPCOMING,
      createdBy: 'admin-user-id',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    describe('getTournaments', () => {
      it('should fetch all tournaments successfully', async () => {
        const mockQuerySnapshot = {
          docs: [
            {
              id: 'tournament-1',
              data: () => ({
                name: 'Summer Basketball Tournament',
                startDate: Timestamp.now(),
                endDate: Timestamp.now(),
                city: 'Los Angeles',
                state: 'CA',
                status: TournamentStatus.UPCOMING,
                createdBy: 'admin-user-id',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              }),
            },
          ],
        };

        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any);

        const result = await firebaseService.getTournaments();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('tournament-1');
        expect(result[0].name).toBe('Summer Basketball Tournament');
        expect(mockGetDocs).toHaveBeenCalledTimes(1);
      });

      it('should handle errors when fetching tournaments', async () => {
        mockGetDocs.mockRejectedValue(new Error('Firestore error'));

        await expect(firebaseService.getTournaments()).rejects.toThrow(
          'Failed to fetch tournaments'
        );
      });
    });

    describe('getTournament', () => {
      it('should fetch a single tournament successfully', async () => {
        const mockDocSnapshot = {
          exists: () => true,
          id: 'tournament-1',
          data: () => ({
            name: 'Summer Basketball Tournament',
            startDate: Timestamp.now(),
            endDate: Timestamp.now(),
            city: 'Los Angeles',
            state: 'CA',
            status: TournamentStatus.UPCOMING,
            createdBy: 'admin-user-id',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }),
        };

        mockGetDoc.mockResolvedValue(mockDocSnapshot as any);

        const result = await firebaseService.getTournament('tournament-1');

        expect(result.id).toBe('tournament-1');
        expect(result.name).toBe('Summer Basketball Tournament');
        expect(mockGetDoc).toHaveBeenCalledTimes(1);
      });

      it('should throw error when tournament not found', async () => {
        const mockDocSnapshot = {
          exists: () => false,
        };

        mockGetDoc.mockResolvedValue(mockDocSnapshot as any);

        await expect(firebaseService.getTournament('non-existent')).rejects.toThrow(
          'Failed to fetch tournament'
        );
      });
    });

    describe('createTournament', () => {
      it('should create a tournament successfully', async () => {
        const mockDocRef = { id: 'new-tournament-id' };
        mockAddDoc.mockResolvedValue(mockDocRef as any);

        const tournamentData = {
          name: 'New Tournament',
          startDate: Timestamp.now(),
          endDate: Timestamp.now(),
          city: 'New York',
          state: 'NY',
          status: TournamentStatus.UPCOMING,
          createdBy: 'admin-user-id',
          createdAt: Timestamp.now(),
        };

        const result = await firebaseService.createTournament(tournamentData);

        expect(result).toBe('new-tournament-id');
        expect(mockAddDoc).toHaveBeenCalledTimes(1);
      });

      it('should handle errors when creating tournament', async () => {
        mockAddDoc.mockRejectedValue(new Error('Firestore error'));

        const tournamentData = {
          name: 'New Tournament',
          startDate: Timestamp.now(),
          endDate: Timestamp.now(),
          city: 'New York',
          state: 'NY',
          status: TournamentStatus.UPCOMING,
          createdBy: 'admin-user-id',
          createdAt: Timestamp.now(),
        };

        await expect(firebaseService.createTournament(tournamentData)).rejects.toThrow(
          'Failed to create tournament'
        );
      });
    });

    describe('updateTournament', () => {
      it('should update a tournament successfully', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);

        const updates = {
          name: 'Updated Tournament Name',
          city: 'Updated City',
          updatedAt: Timestamp.now(),
        };

        await firebaseService.updateTournament('tournament-1', updates);

        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...updates,
            updatedAt: expect.anything(),
          })
        );
      });
    });

    describe('deleteTournament', () => {
      it('should delete a tournament successfully', async () => {
        mockDeleteDoc.mockResolvedValue(undefined);

        await firebaseService.deleteTournament('tournament-1');

        expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Game Operations', () => {
    const mockGame: Game = {
      id: 'game-1',
      tournamentId: 'tournament-1',
      divisionId: 'division-1',
      teamA: 'Lakers',
      teamB: 'Warriors',
      scoreA: 95,
      scoreB: 88,
      startTime: Timestamp.now(),
      locationId: 'location-1',
      status: GameStatus.COMPLETED,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    describe('getGamesByTournament', () => {
      it('should fetch games by tournament successfully', async () => {
        const mockQuerySnapshot = {
          docs: [
            {
              id: 'game-1',
              data: () => ({
                tournamentId: 'tournament-1',
                divisionId: 'division-1',
                teamA: 'Lakers',
                teamB: 'Warriors',
                scoreA: 95,
                scoreB: 88,
                startTime: Timestamp.now(),
                locationId: 'location-1',
                status: GameStatus.COMPLETED,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              }),
            },
          ],
        };

        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any);

        const result = await firebaseService.getGamesByTournament('tournament-1');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('game-1');
        expect(result[0].tournamentId).toBe('tournament-1');
      });
    });

    describe('getGame', () => {
      it('should fetch a single game successfully', async () => {
        const mockDocSnapshot = {
          exists: () => true,
          id: 'game-1',
          data: () => ({
            tournamentId: 'tournament-1',
            divisionId: 'division-1',
            teamA: 'Lakers',
            teamB: 'Warriors',
            scoreA: 95,
            scoreB: 88,
            startTime: Timestamp.now(),
            locationId: 'location-1',
            status: GameStatus.COMPLETED,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }),
        };

        mockGetDoc.mockResolvedValue(mockDocSnapshot as any);

        const result = await firebaseService.getGame('game-1');

        expect(result.id).toBe('game-1');
        expect(result.teamA).toBe('Lakers');
        expect(result.teamB).toBe('Warriors');
      });
    });

    describe('updateGame', () => {
      it('should update game scores successfully', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);

        const updates = {
          scoreA: 100,
          scoreB: 95,
          status: GameStatus.COMPLETED,
          updatedAt: Timestamp.now(),
        };

        await firebaseService.updateGame('game-1', updates);

        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...updates,
            updatedAt: expect.anything(),
          })
        );
      });
    });
  });

  describe('User Profile Operations', () => {
    const mockUserProfile: UserProfile = {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.USER,
      followingTeams: ['Lakers', 'Warriors'],
      followingGames: ['game-1', 'game-2'],
      notificationsEnabled: true,
      fcmToken: 'fcm-token-123',
      lastActive: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    describe('getUserProfile', () => {
      it('should fetch user profile successfully', async () => {
        const mockDocSnapshot = {
          exists: () => true,
          id: 'user-1',
          data: () => ({
            email: 'test@example.com',
            displayName: 'Test User',
            role: UserRole.USER,
            followingTeams: ['Lakers', 'Warriors'],
            followingGames: ['game-1', 'game-2'],
            notificationsEnabled: true,
            fcmToken: 'fcm-token-123',
            lastActive: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }),
        };

        mockGetDoc.mockResolvedValue(mockDocSnapshot as any);

        const result = await firebaseService.getUserProfile('user-1');

        expect(result.id).toBe('user-1');
        expect(result.email).toBe('test@example.com');
        expect(result.followingTeams).toEqual(['Lakers', 'Warriors']);
      });
    });

    describe('createUserProfile', () => {
      it('should create user profile successfully', async () => {
        mockSetDoc.mockResolvedValue(undefined);

        const profileData = {
          email: 'newuser@example.com',
          displayName: 'New User',
          role: UserRole.USER,
          followingTeams: [],
          followingGames: [],
          notificationsEnabled: true,
          lastActive: Timestamp.now(),
          createdAt: Timestamp.now(),
        };

        await firebaseService.createUserProfile('new-user-id', profileData);

        expect(mockSetDoc).toHaveBeenCalledTimes(1);
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...profileData,
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
          })
        );
      });
    });

    describe('followTeam', () => {
      it('should add team to following list successfully', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);
        mockArrayUnion.mockReturnValue('Lakers' as any);

        await firebaseService.followTeam('user-1', 'Lakers');

        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
        expect(mockArrayUnion).toHaveBeenCalledWith('Lakers');
      });
    });

    describe('unfollowTeam', () => {
      it('should remove team from following list successfully', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);
        mockArrayRemove.mockReturnValue('Lakers' as any);

        await firebaseService.unfollowTeam('user-1', 'Lakers');

        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
        expect(mockArrayRemove).toHaveBeenCalledWith('Lakers');
      });
    });

    describe('followGame', () => {
      it('should add game to following list successfully', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);
        mockArrayUnion.mockReturnValue('game-1' as any);

        await firebaseService.followGame('user-1', 'game-1');

        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
        expect(mockArrayUnion).toHaveBeenCalledWith('game-1');
      });
    });

    describe('unfollowGame', () => {
      it('should remove game from following list successfully', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);
        mockArrayRemove.mockReturnValue('game-1' as any);

        await firebaseService.unfollowGame('user-1', 'game-1');

        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
        expect(mockArrayRemove).toHaveBeenCalledWith('game-1');
      });
    });
  });

  describe('Real-time Listeners', () => {
    describe('onTournamentsSnapshot', () => {
      it('should set up tournaments listener successfully', () => {
        const mockCallback = jest.fn();
        const mockUnsubscribe = jest.fn();
        
        mockOnSnapshot.mockImplementation((query, callback: any) => {
          // Simulate calling the callback with mock data
          const mockQuerySnapshot = {
            docs: [
              {
                id: 'tournament-1',
                data: () => ({
                  name: 'Test Tournament',
                  startDate: Timestamp.now(),
                  endDate: Timestamp.now(),
                  city: 'Test City',
                  state: 'TS',
                  status: TournamentStatus.ACTIVE,
                  createdBy: 'admin',
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                }),
              },
            ],
          };
          callback(mockQuerySnapshot);
          return mockUnsubscribe;
        });

        const unsubscribe = firebaseService.onTournamentsSnapshot(mockCallback);

        expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith([
          expect.objectContaining({
            id: 'tournament-1',
            name: 'Test Tournament',
          }),
        ]);
        expect(unsubscribe).toBe(mockUnsubscribe);
      });
    });

    describe('onGameSnapshot', () => {
      it('should set up game listener successfully', () => {
        const mockCallback = jest.fn();
        const mockUnsubscribe = jest.fn();
        
        mockOnSnapshot.mockImplementation((docRef, callback: any) => {
          // Simulate calling the callback with mock data
          const mockDocSnapshot = {
            exists: () => true,
            id: 'game-1',
            data: () => ({
              tournamentId: 'tournament-1',
              divisionId: 'division-1',
              teamA: 'Lakers',
              teamB: 'Warriors',
              scoreA: 95,
              scoreB: 88,
              startTime: Timestamp.now(),
              locationId: 'location-1',
              status: GameStatus.IN_PROGRESS,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            }),
          };
          callback(mockDocSnapshot);
          return mockUnsubscribe;
        });

        const unsubscribe = firebaseService.onGameSnapshot('game-1', mockCallback);

        expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'game-1',
            teamA: 'Lakers',
            teamB: 'Warriors',
            status: GameStatus.IN_PROGRESS,
          })
        );
        expect(unsubscribe).toBe(mockUnsubscribe);
      });

      it('should handle non-existent game in listener', () => {
        const mockCallback = jest.fn();
        const mockUnsubscribe = jest.fn();
        
        mockOnSnapshot.mockImplementation((docRef, callback: any) => {
          // Simulate calling the callback with non-existent document
          const mockDocSnapshot = {
            exists: () => false,
          };
          callback(mockDocSnapshot);
          return mockUnsubscribe;
        });

        const unsubscribe = firebaseService.onGameSnapshot('non-existent', mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('createTournamentWithDivisions', () => {
      it('should create tournament with divisions in batch', async () => {
        const mockBatch = {
          set: jest.fn(),
          commit: jest.fn().mockResolvedValue(undefined),
        };
        
        mockWriteBatch.mockReturnValue(mockBatch as any);
        mockDoc.mockReturnValue({ id: 'tournament-1' } as any);

        const tournamentData = {
          name: 'Test Tournament',
          startDate: Timestamp.now(),
          endDate: Timestamp.now(),
          city: 'Test City',
          state: 'TS',
          status: TournamentStatus.UPCOMING,
          createdBy: 'admin',
          createdAt: Timestamp.now(),
        };

        const divisions = [
          {
            name: 'Division A',
            ageGroup: 'U18',
            gender: Gender.MALE,
            skillLevel: 'Advanced',
            tournamentId: 'tournament-1',
            createdAt: Timestamp.now(),
          },
        ];

        const result = await firebaseService.createTournamentWithDivisions(
          tournamentData,
          divisions
        );

        expect(result).toBe('tournament-1');
        expect(mockBatch.set).toHaveBeenCalledTimes(2); // Tournament + 1 division
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      });
    });

    describe('deleteTournamentWithRelatedData', () => {
      it('should delete tournament with related data in batch', async () => {
        const mockBatch = {
          delete: jest.fn(),
          commit: jest.fn().mockResolvedValue(undefined),
        };
        
        mockWriteBatch.mockReturnValue(mockBatch as any);
        
        // Mock divisions query
        const mockDivisionsSnapshot = {
          docs: [{ ref: { id: 'division-1' } }],
        };
        
        // Mock games query
        const mockGamesSnapshot = {
          docs: [{ ref: { id: 'game-1' } }],
        };
        
        mockGetDocs
          .mockResolvedValueOnce(mockDivisionsSnapshot as any)
          .mockResolvedValueOnce(mockGamesSnapshot as any);

        await firebaseService.deleteTournamentWithRelatedData('tournament-1');

        expect(mockBatch.delete).toHaveBeenCalledTimes(3); // Tournament + division + game
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      });
    });
  });
});