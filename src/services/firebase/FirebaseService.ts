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
  Unsubscribe,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config';
import {
  Tournament,
  Game,
  Division,
  Location,
  UserProfile,
  Pool,
  Bracket,
  CreateTournamentData,
  CreateGameData,
  CreateDivisionData,
  CreateLocationData,
  CreateUserProfileData,
  CreatePoolData,
  CreateBracketData,
  UpdateTournamentData,
  UpdateGameData,
  UpdateDivisionData,
  UpdateLocationData,
  UpdateUserProfileData,
  UpdatePoolData,
  UpdateBracketData,
  TournamentStatus,
} from '../../types';
import { retryWithBackoff, categorizeError } from '../../utils/errorHandling';
import { cacheData, getCachedData, CacheKeys } from '../../utils/cache';

export class FirebaseService {
  // Collection references
  private readonly tournamentsCollection = collection(db, 'tournaments');
  private readonly gamesCollection = collection(db, 'games');
  private readonly divisionsCollection = collection(db, 'divisions');
  private readonly locationsCollection = collection(db, 'locations');
  private readonly usersCollection = collection(db, 'users');
  private readonly poolsCollection = collection(db, 'pools');
  private readonly bracketsCollection = collection(db, 'brackets');

  // Tournament operations
  async getTournaments(): Promise<Tournament[]> {
    return retryWithBackoff(async () => {
      try {
        const q = query(
          this.tournamentsCollection,
          orderBy('startDate', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Tournament));
      } catch (error) {
        const appError = categorizeError(error);
        console.error('Error fetching tournaments:', appError);
        throw new Error(appError.message);
      }
    });
  }

  async getActiveTournaments(useCache: boolean = true): Promise<Tournament[]> {
    // Try cache first if enabled
    if (useCache) {
      const cached = await getCachedData<Tournament[]>(CacheKeys.TOURNAMENTS);
      if (cached) {
        // Return cached data and fetch fresh data in background
        this.refreshActiveTournamentsCache();
        return cached;
      }
    }

    return retryWithBackoff(async () => {
      try {
        const q = query(
          this.tournamentsCollection,
          where('status', 'in', [TournamentStatus.UPCOMING, TournamentStatus.ACTIVE]),
          orderBy('startDate', 'asc')
        );
        const querySnapshot = await getDocs(q);
        const tournaments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Tournament));
        
        // Cache the results
        await cacheData(CacheKeys.TOURNAMENTS, tournaments, { expiryMinutes: 30 });
        
        return tournaments;
      } catch (error) {
        const appError = categorizeError(error);
        console.error('Error fetching active tournaments:', appError);
        
        // Try to return cached data on error
        const cached = await getCachedData<Tournament[]>(CacheKeys.TOURNAMENTS);
        if (cached) {
          return cached;
        }
        
        throw new Error(appError.message);
      }
    });
  }

  private async refreshActiveTournamentsCache(): Promise<void> {
    try {
      const q = query(
        this.tournamentsCollection,
        where('status', 'in', [TournamentStatus.UPCOMING, TournamentStatus.ACTIVE]),
        orderBy('startDate', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const tournaments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Tournament));
      
      await cacheData(CacheKeys.TOURNAMENTS, tournaments, { expiryMinutes: 30 });
    } catch (error) {
      // Silently fail background refresh
      console.log('Background cache refresh failed:', error);
    }
  }

  async getTournament(id: string): Promise<Tournament> {
    return retryWithBackoff(async () => {
      try {
        const docRef = doc(this.tournamentsCollection, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          throw new Error('Tournament not found');
        }
        
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Tournament;
      } catch (error) {
        const appError = categorizeError(error);
        console.error('Error fetching tournament:', appError);
        throw new Error(appError.message);
      }
    });
  }

  async createTournament(tournamentData: CreateTournamentData): Promise<string> {
    try {
      const docRef = await addDoc(this.tournamentsCollection, {
        ...tournamentData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw new Error('Failed to create tournament');
    }
  }

  async updateTournament(id: string, updates: UpdateTournamentData): Promise<void> {
    try {
      const docRef = doc(this.tournamentsCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw new Error('Failed to update tournament');
    }
  }

  async deleteTournament(id: string): Promise<void> {
    try {
      const docRef = doc(this.tournamentsCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw new Error('Failed to delete tournament');
    }
  }

  // Game operations
  async getGamesByTournament(tournamentId: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('tournamentId', '==', tournamentId),
        orderBy('startTime', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Game));
    } catch (error) {
      console.error('Error fetching games by tournament:', error);
      throw new Error('Failed to fetch games');
    }
  }

  async getGamesByDivision(divisionId: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('divisionId', '==', divisionId),
        orderBy('startTime', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Game));
    } catch (error) {
      console.error('Error fetching games by division:', error);
      throw new Error('Failed to fetch games');
    }
  }

  async getGame(id: string): Promise<Game> {
    try {
      const docRef = doc(this.gamesCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Game not found');
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Game;
    } catch (error) {
      console.error('Error fetching game:', error);
      throw new Error('Failed to fetch game');
    }
  }

  async createGame(gameData: CreateGameData): Promise<string> {
    try {
      const docRef = await addDoc(this.gamesCollection, {
        ...gameData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating game:', error);
      throw new Error('Failed to create game');
    }
  }

  async updateGame(id: string, updates: UpdateGameData): Promise<void> {
    try {
      const docRef = doc(this.gamesCollection, id);
      
      // Filter out undefined values as Firestore doesn't support them
      const cleanedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      await updateDoc(docRef, {
        ...cleanedUpdates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating game:', error);
      throw new Error('Failed to update game');
    }
  }

  async deleteGame(id: string): Promise<void> {
    try {
      // First, remove this game from all users' followingGames arrays
      const usersQuery = query(
        this.usersCollection,
        where('followingGames', 'array-contains', id)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      // Use batch to update all users at once
      const batch = writeBatch(db);
      usersSnapshot.docs.forEach((userDoc) => {
        batch.update(userDoc.ref, {
          followingGames: arrayRemove(id),
          updatedAt: Timestamp.now(),
        });
      });
      
      // Delete the game document
      const docRef = doc(this.gamesCollection, id);
      batch.delete(docRef);
      
      // Commit all changes
      await batch.commit();
    } catch (error) {
      console.error('Error deleting game:', error);
      throw new Error('Failed to delete game');
    }
  }

  // Cascade operation helpers
  async getGamesFedBy(gameId: string): Promise<Game[]> {
    try {
      // Query for games where this game feeds into them (winner or loser)
      const winnerQuery = query(
        this.gamesCollection,
        where('dependsOnGames', 'array-contains', gameId)
      );
      
      const winnerSnapshot = await getDocs(winnerQuery);
      const games = winnerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Game));
      
      return games;
    } catch (error) {
      console.error('Error fetching games fed by game:', error);
      throw new Error('Failed to fetch downstream games');
    }
  }

  async batchUpdateGames(
    updates: { gameId: string; data: UpdateGameData }[]
  ): Promise<void> {
    try {
      if (updates.length === 0) {
        return;
      }

      // Firestore batch writes are limited to 500 operations
      const BATCH_LIMIT = 500;
      
      if (updates.length > BATCH_LIMIT) {
        throw new Error(`Cannot update more than ${BATCH_LIMIT} games in a single batch`);
      }

      const batch = writeBatch(db);
      const timestamp = Timestamp.now();
      
      updates.forEach(({ gameId, data }) => {
        const docRef = doc(this.gamesCollection, gameId);
        
        // Filter out undefined values as Firestore doesn't support them
        const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);
        
        batch.update(docRef, {
          ...cleanedData,
          updatedAt: timestamp,
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error batch updating games:', error);
      throw new Error('Failed to batch update games');
    }
  }

  // Structure-aware game queries
  async getGamesByPool(poolId: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('poolId', '==', poolId),
        orderBy('poolGameNumber', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Game));
    } catch (error) {
      console.error('Error fetching games by pool:', error);
      throw new Error('Failed to fetch games by pool');
    }
  }

  async getGamesByBracket(bracketId: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('bracketId', '==', bracketId),
        orderBy('bracketPosition', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Game));
    } catch (error) {
      console.error('Error fetching games by bracket:', error);
      throw new Error('Failed to fetch games by bracket');
    }
  }

  async getGamesByBracketRound(bracketId: string, round: string): Promise<Game[]> {
    try {
      const q = query(
        this.gamesCollection,
        where('bracketId', '==', bracketId),
        where('bracketRound', '==', round),
        orderBy('bracketPosition', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Game));
    } catch (error) {
      console.error('Error fetching games by bracket round:', error);
      throw new Error('Failed to fetch games by bracket round');
    }
  }

  // Division operations
  async getDivisionsByTournament(tournamentId: string): Promise<Division[]> {
    try {
      const q = query(
        this.divisionsCollection,
        where('tournamentId', '==', tournamentId),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Division));
    } catch (error) {
      console.error('Error fetching divisions by tournament:', error);
      throw new Error('Failed to fetch divisions');
    }
  }

  async getDivision(id: string): Promise<Division> {
    try {
      const docRef = doc(this.divisionsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Division not found');
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Division;
    } catch (error) {
      console.error('Error fetching division:', error);
      throw new Error('Failed to fetch division');
    }
  }

  async createDivision(divisionData: CreateDivisionData): Promise<string> {
    try {
      const docRef = await addDoc(this.divisionsCollection, {
        ...divisionData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating division:', error);
      throw new Error('Failed to create division');
    }
  }

  async updateDivision(id: string, updates: UpdateDivisionData): Promise<void> {
    try {
      const docRef = doc(this.divisionsCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating division:', error);
      throw new Error('Failed to update division');
    }
  }

  async deleteDivision(id: string): Promise<void> {
    try {
      const docRef = doc(this.divisionsCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting division:', error);
      throw new Error('Failed to delete division');
    }
  }

  // Pool operations
  async getPoolsByDivision(divisionId: string): Promise<Pool[]> {
    try {
      const q = query(
        this.poolsCollection,
        where('divisionId', '==', divisionId),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Pool));
    } catch (error) {
      console.error('Error fetching pools by division:', error);
      throw new Error('Failed to fetch pools');
    }
  }

  async getPool(id: string): Promise<Pool> {
    try {
      const docRef = doc(this.poolsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Pool not found');
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Pool;
    } catch (error) {
      console.error('Error fetching pool:', error);
      throw new Error('Failed to fetch pool');
    }
  }

  async createPool(poolData: CreatePoolData): Promise<string> {
    try {
      const docRef = await addDoc(this.poolsCollection, {
        ...poolData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating pool:', error);
      throw new Error('Failed to create pool');
    }
  }

  async updatePool(id: string, updates: UpdatePoolData): Promise<void> {
    try {
      const docRef = doc(this.poolsCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating pool:', error);
      throw new Error('Failed to update pool');
    }
  }

  async deletePool(id: string): Promise<void> {
    try {
      const docRef = doc(this.poolsCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting pool:', error);
      throw new Error('Failed to delete pool');
    }
  }

  // Bracket operations
  async getBracketsByDivision(divisionId: string): Promise<Bracket[]> {
    try {
      const q = query(
        this.bracketsCollection,
        where('divisionId', '==', divisionId),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Bracket));
    } catch (error) {
      console.error('Error fetching brackets by division:', error);
      throw new Error('Failed to fetch brackets');
    }
  }

  async getBracket(id: string): Promise<Bracket> {
    try {
      const docRef = doc(this.bracketsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Bracket not found');
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Bracket;
    } catch (error) {
      console.error('Error fetching bracket:', error);
      throw new Error('Failed to fetch bracket');
    }
  }

  async createBracket(bracketData: CreateBracketData): Promise<string> {
    try {
      const docRef = await addDoc(this.bracketsCollection, {
        ...bracketData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating bracket:', error);
      throw new Error('Failed to create bracket');
    }
  }

  async updateBracket(id: string, updates: UpdateBracketData): Promise<void> {
    try {
      const docRef = doc(this.bracketsCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating bracket:', error);
      throw new Error('Failed to update bracket');
    }
  }

  async deleteBracket(id: string): Promise<void> {
    try {
      const docRef = doc(this.bracketsCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting bracket:', error);
      throw new Error('Failed to delete bracket');
    }
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    try {
      const q = query(this.locationsCollection, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Location));
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw new Error('Failed to fetch locations');
    }
  }

  async getLocation(id: string): Promise<Location> {
    try {
      const docRef = doc(this.locationsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Location not found');
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Location;
    } catch (error) {
      console.error('Error fetching location:', error);
      throw new Error('Failed to fetch location');
    }
  }

  async createLocation(locationData: CreateLocationData): Promise<string> {
    try {
      const docRef = await addDoc(this.locationsCollection, {
        ...locationData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating location:', error);
      throw new Error('Failed to create location');
    }
  }

  async updateLocation(id: string, updates: UpdateLocationData): Promise<void> {
    try {
      const docRef = doc(this.locationsCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating location:', error);
      throw new Error('Failed to update location');
    }
  }

  async deleteLocation(id: string): Promise<void> {
    try {
      const docRef = doc(this.locationsCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting location:', error);
      throw new Error('Failed to delete location');
    }
  }

  // User profile operations
  async getUserProfile(uid: string): Promise<UserProfile> {
    try {
      const docRef = doc(this.usersCollection, uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('User profile not found');
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async createUserProfile(uid: string, profileData: CreateUserProfileData): Promise<void> {
    try {
      const docRef = doc(this.usersCollection, uid);
      await setDoc(docRef, {
        ...profileData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  async updateUserProfile(uid: string, updates: UpdateUserProfileData): Promise<void> {
    try {
      const docRef = doc(this.usersCollection, uid);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  // Following operations
  async followTeam(userId: string, teamName: string): Promise<void> {
    try {
      const docRef = doc(this.usersCollection, userId);
      await updateDoc(docRef, {
        followingTeams: arrayUnion(teamName),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error following team:', error);
      throw new Error('Failed to follow team');
    }
  }

  async unfollowTeam(userId: string, teamName: string): Promise<void> {
    try {
      const docRef = doc(this.usersCollection, userId);
      await updateDoc(docRef, {
        followingTeams: arrayRemove(teamName),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error unfollowing team:', error);
      throw new Error('Failed to unfollow team');
    }
  }

  async followGame(userId: string, gameId: string): Promise<void> {
    try {
      const docRef = doc(this.usersCollection, userId);
      await updateDoc(docRef, {
        followingGames: arrayUnion(gameId),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error following game:', error);
      throw new Error('Failed to follow game');
    }
  }

  async unfollowGame(userId: string, gameId: string): Promise<void> {
    try {
      const docRef = doc(this.usersCollection, userId);
      await updateDoc(docRef, {
        followingGames: arrayRemove(gameId),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error unfollowing game:', error);
      throw new Error('Failed to unfollow game');
    }
  }

  async unfollowGameForAllUsers(gameId: string): Promise<void> {
    try {
      // Find all users following this game
      const usersQuery = query(
        this.usersCollection,
        where('followingGames', 'array-contains', gameId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      // Use batch to update all users at once
      const batch = writeBatch(db);
      usersSnapshot.docs.forEach((userDoc) => {
        batch.update(userDoc.ref, {
          followingGames: arrayRemove(gameId),
          updatedAt: Timestamp.now(),
        });
      });
      
      // Commit all changes
      await batch.commit();
      
      console.log(`Unfollowed game ${gameId} for ${usersSnapshot.size} users`);
    } catch (error) {
      console.error('Error unfollowing game for all users:', error);
      throw new Error('Failed to unfollow game for all users');
    }
  }

  // Real-time listener methods
  onTournamentsSnapshot(
    callback: (tournaments: Tournament[]) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      this.tournamentsCollection,
      where('status', 'in', [TournamentStatus.UPCOMING, TournamentStatus.ACTIVE]),
      orderBy('startDate', 'asc')
    );
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const tournaments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Tournament));
        callback(tournaments);
      },
      (error) => {
        console.error('Error in tournaments snapshot:', error);
        if (errorCallback) {
          errorCallback(error as Error);
        }
      }
    );
  }

  onTournamentSnapshot(tournamentId: string, callback: (tournament: Tournament | null) => void): Unsubscribe {
    const docRef = doc(this.tournamentsCollection, tournamentId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const tournament = {
          id: docSnap.id,
          ...docSnap.data()
        } as Tournament;
        callback(tournament);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in tournament snapshot:', error);
    });
  }

  onGamesByTournamentSnapshot(
    tournamentId: string,
    callback: (games: Game[]) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      this.gamesCollection,
      where('tournamentId', '==', tournamentId),
      orderBy('startTime', 'asc')
    );
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const games = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Game));
        callback(games);
      },
      (error) => {
        console.error('Error in games snapshot:', error);
        if (errorCallback) {
          errorCallback(error as Error);
        }
      }
    );
  }

  onGameSnapshot(gameId: string, callback: (game: Game | null) => void): Unsubscribe {
    const docRef = doc(this.gamesCollection, gameId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const game = {
          id: docSnap.id,
          ...docSnap.data()
        } as Game;
        callback(game);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in game snapshot:', error);
    });
  }

  onUserProfileSnapshot(userId: string, callback: (profile: UserProfile | null) => void): Unsubscribe {
    const docRef = doc(this.usersCollection, userId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const profile = {
          id: docSnap.id,
          ...docSnap.data()
        } as UserProfile;
        callback(profile);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in user profile snapshot:', error);
    });
  }

  // Batch operations for better performance
  async createTournamentWithDivisions(
    tournamentData: CreateTournamentData,
    divisions: CreateDivisionData[]
  ): Promise<string> {
    try {
      const batch = writeBatch(db);
      
      // Create tournament
      const tournamentRef = doc(this.tournamentsCollection);
      batch.set(tournamentRef, {
        ...tournamentData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      // Create divisions
      divisions.forEach(divisionData => {
        const divisionRef = doc(this.divisionsCollection);
        batch.set(divisionRef, {
          ...divisionData,
          tournamentId: tournamentRef.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });
      
      await batch.commit();
      return tournamentRef.id;
    } catch (error) {
      console.error('Error creating tournament with divisions:', error);
      throw new Error('Failed to create tournament with divisions');
    }
  }

  async deleteTournamentWithRelatedData(tournamentId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Delete tournament
      const tournamentRef = doc(this.tournamentsCollection, tournamentId);
      batch.delete(tournamentRef);
      
      // Get and delete related divisions
      const divisionsQuery = query(
        this.divisionsCollection,
        where('tournamentId', '==', tournamentId)
      );
      const divisionsSnapshot = await getDocs(divisionsQuery);
      divisionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Get and delete related games
      const gamesQuery = query(
        this.gamesCollection,
        where('tournamentId', '==', tournamentId)
      );
      const gamesSnapshot = await getDocs(gamesQuery);
      gamesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting tournament with related data:', error);
      throw new Error('Failed to delete tournament with related data');
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();