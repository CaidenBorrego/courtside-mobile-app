import { Game, Division, Pool, Bracket, PoolStanding, TeamStats } from '../../types';
import { firebaseService } from '../firebase';
import { poolService } from '../tournament/PoolService';
import { bracketService } from '../tournament/BracketService';
import { teamStatsService } from '../tournament/TeamStatsService';

interface TournamentData {
  divisions: Division[];
  games: Game[];
  pools: Map<string, Pool[]>;
  brackets: Map<string, Bracket[]>;
  poolStandings: Map<string, PoolStanding[]>;
  bracketGames: Map<string, Map<string, Game[]>>;
  standings: Map<string, TeamStats[]>;
  selectedDivisionId: string | null;
  timestamp: number;
  gamesUnsubscribe?: () => void;
}

class TournamentDataCacheService {
  private cache: Map<string, TournamentData> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  async getDivisions(tournamentId: string): Promise<{ divisions: Division[]; selectedDivisionId: string | null }> {
    const cached = this.cache.get(tournamentId);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached divisions');
      return { divisions: cached.divisions, selectedDivisionId: cached.selectedDivisionId };
    }

    console.log('🔄 Loading divisions from Firebase');
    const divisions = await firebaseService.getDivisionsByTournament(tournamentId);
    const selectedDivisionId = divisions.length > 0 ? divisions[0].id : null;

    this.updateCache(tournamentId, { divisions, selectedDivisionId });
    return { divisions, selectedDivisionId };
  }

  setupGamesListener(tournamentId: string, onUpdate: (games: Game[]) => void, onError: (error: Error) => void): void {
    const cached = this.cache.get(tournamentId);
    
    // If listener already exists, just return cached games
    if (cached?.gamesUnsubscribe) {
      console.log('📦 Using existing games listener');
      if (cached.games.length > 0) {
        onUpdate(cached.games);
      }
      return;
    }

    console.log('🔄 Setting up new games listener');
    const unsubscribe = firebaseService.onGamesByTournamentSnapshot(
      tournamentId,
      (games) => {
        console.log('📦 Games updated:', games.length);
        this.updateCache(tournamentId, { games, gamesUnsubscribe: unsubscribe });
        onUpdate(games);
      },
      onError
    );

    this.updateCache(tournamentId, { gamesUnsubscribe: unsubscribe });
  }

  async getPoolsAndBrackets(tournamentId: string, divisions: Division[]): Promise<{
    pools: Map<string, Pool[]>;
    brackets: Map<string, Bracket[]>;
    poolStandings: Map<string, PoolStanding[]>;
    bracketGames: Map<string, Map<string, Game[]>>;
  }> {
    const cached = this.cache.get(tournamentId);
    
    if (cached && cached.pools.size > 0 && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached pools and brackets');
      return {
        pools: cached.pools,
        brackets: cached.brackets,
        poolStandings: cached.poolStandings,
        bracketGames: cached.bracketGames,
      };
    }

    console.log('🔄 Loading pools and brackets from Firebase');
    const pools = new Map<string, Pool[]>();
    const brackets = new Map<string, Bracket[]>();
    const poolStandings = new Map<string, PoolStanding[]>();
    const bracketGames = new Map<string, Map<string, Game[]>>();

    for (const division of divisions) {
      const poolsData = await poolService.getPoolsByDivision(division.id);
      pools.set(division.id, poolsData);

      const bracketsData = await bracketService.getBracketsByDivision(division.id);
      brackets.set(division.id, bracketsData);

      for (const pool of poolsData) {
        const standings = await poolService.calculateStandings(pool.id);
        poolStandings.set(pool.id, standings);
      }

      for (const bracket of bracketsData) {
        const bracketState = await bracketService.getBracketState(bracket.id);
        bracketGames.set(bracket.id, bracketState.gamesByRound);
      }
    }

    this.updateCache(tournamentId, { pools, brackets, poolStandings, bracketGames });
    return { pools, brackets, poolStandings, bracketGames };
  }

  async getStandings(tournamentId: string, divisions: Division[]): Promise<Map<string, TeamStats[]>> {
    const cached = this.cache.get(tournamentId);
    
    if (cached && cached.standings.size > 0 && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached standings');
      return cached.standings;
    }

    console.log('🔄 Loading standings from Firebase');
    const standings = new Map<string, TeamStats[]>();

    for (const division of divisions) {
      const divisionStandings = await teamStatsService.getDivisionStandings(division.id);
      standings.set(division.id, divisionStandings);
    }

    this.updateCache(tournamentId, { standings });
    return standings;
  }

  setSelectedDivision(tournamentId: string, divisionId: string | null): void {
    this.updateCache(tournamentId, { selectedDivisionId: divisionId });
  }

  getSelectedDivision(tournamentId: string): string | null {
    return this.cache.get(tournamentId)?.selectedDivisionId || null;
  }

  private updateCache(tournamentId: string, updates: Partial<TournamentData>): void {
    const existing = this.cache.get(tournamentId) || {
      divisions: [],
      games: [],
      pools: new Map(),
      brackets: new Map(),
      poolStandings: new Map(),
      bracketGames: new Map(),
      standings: new Map(),
      selectedDivisionId: null,
      timestamp: Date.now(),
    };

    this.cache.set(tournamentId, {
      ...existing,
      ...updates,
      timestamp: Date.now(),
    });
  }

  clearCache(tournamentId?: string): void {
    if (tournamentId) {
      const cached = this.cache.get(tournamentId);
      if (cached?.gamesUnsubscribe) {
        cached.gamesUnsubscribe();
      }
      this.cache.delete(tournamentId);
      console.log('🗑️ Cleared cache for tournament:', tournamentId);
    } else {
      // Clear all and unsubscribe from all listeners
      this.cache.forEach((data) => {
        if (data.gamesUnsubscribe) {
          data.gamesUnsubscribe();
        }
      });
      this.cache.clear();
      console.log('🗑️ Cleared all tournament cache');
    }
  }

  forceRefresh(tournamentId: string): void {
    console.log('🔄 Force refreshing tournament:', tournamentId);
    const cached = this.cache.get(tournamentId);
    if (cached) {
      // Clear pools, brackets, and standings but keep divisions and games listener
      cached.pools = new Map();
      cached.brackets = new Map();
      cached.poolStandings = new Map();
      cached.bracketGames = new Map();
      cached.standings = new Map();
      cached.timestamp = 0;
    }
  }
}

export const tournamentDataCache = new TournamentDataCacheService();
