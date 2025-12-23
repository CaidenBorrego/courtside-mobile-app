import { firebaseService } from '../services/firebase';
import { Timestamp } from 'firebase/firestore';
import {
  TournamentStatus,
  GameStatus,
  Gender,
} from '../types';

export interface BulkImportData {
  tournament: {
    name: string;
    city: string;
    state: string;
    startDate: string;
    endDate: string;
  };
  divisions: {
    name: string;
    ageGroup: string;
    gender: 'male' | 'female' | 'mixed';
    skillLevel: string;
  }[];
  locations: {
    name: string;
    address: string;
    city: string;
    state: string;
  }[];
  games: {
    divisionName: string;
    teamA: string;
    teamB: string;
    startTime: string;
    locationName: string;
  }[];
}

export interface BulkImportResult {
  success: boolean;
  tournamentId?: string;
  divisionsCreated?: number;
  locationsCreated?: number;
  gamesCreated?: number;
  error?: string;
}

export const bulkImportTournamentData = async (
  data: BulkImportData,
  createdBy: string
): Promise<BulkImportResult> => {
  try {
    // Validate data
    if (!data.tournament || !data.tournament.name) {
      throw new Error('Tournament name is required');
    }

    // Create tournament
    const tournamentId = await firebaseService.createTournament({
      name: data.tournament.name,
      city: data.tournament.city,
      state: data.tournament.state,
      startDate: Timestamp.fromDate(new Date(data.tournament.startDate)),
      endDate: Timestamp.fromDate(new Date(data.tournament.endDate)),
      status: TournamentStatus.UPCOMING,
      createdBy,
      createdAt: Timestamp.now(),
    });

    // Create locations
    const locationMap = new Map<string, string>();
    for (const location of data.locations || []) {
      const locationId = await firebaseService.createLocation({
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        createdAt: Timestamp.now(),
      });
      locationMap.set(location.name, locationId);
    }

    // Create divisions
    const divisionMap = new Map<string, string>();
    for (const division of data.divisions || []) {
      const divisionId = await firebaseService.createDivision({
        tournamentId,
        name: division.name,
        ageGroup: division.ageGroup,
        gender: division.gender as Gender,
        skillLevel: division.skillLevel,
        createdAt: Timestamp.now(),
      });
      divisionMap.set(division.name, divisionId);
    }

    // Create games
    let gamesCreated = 0;
    for (const game of data.games || []) {
      const divisionId = divisionMap.get(game.divisionName);
      const locationId = locationMap.get(game.locationName);

      if (!divisionId) {
        console.warn(`Division not found: ${game.divisionName}`);
        continue;
      }

      if (!locationId) {
        console.warn(`Location not found: ${game.locationName}`);
        continue;
      }

      await firebaseService.createGame({
        tournamentId,
        divisionId,
        teamA: game.teamA,
        teamB: game.teamB,
        scoreA: 0,
        scoreB: 0,
        startTime: Timestamp.fromDate(new Date(game.startTime)),
        locationId,
        status: GameStatus.SCHEDULED,
        createdAt: Timestamp.now(),
      });
      gamesCreated++;
    }

    return {
      success: true,
      tournamentId,
      divisionsCreated: data.divisions?.length || 0,
      locationsCreated: data.locations?.length || 0,
      gamesCreated,
    };
  } catch (error) {
    console.error('Error in bulk import:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const parseBulkImportJSON = (jsonString: string): BulkImportData | null => {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data.tournament || typeof data.tournament !== 'object') {
      throw new Error('Invalid tournament data');
    }

    return data as BulkImportData;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const generateSampleImportData = (): string => {
  const sampleData: BulkImportData = {
    tournament: {
      name: 'Sample Basketball Tournament',
      city: 'Los Angeles',
      state: 'CA',
      startDate: '2024-06-01',
      endDate: '2024-06-07',
    },
    divisions: [
      {
        name: 'U12 Boys',
        ageGroup: 'U12',
        gender: 'male',
        skillLevel: 'Intermediate',
      },
      {
        name: 'U14 Girls',
        ageGroup: 'U14',
        gender: 'female',
        skillLevel: 'Advanced',
      },
    ],
    locations: [
      {
        name: 'Main Court',
        address: '123 Basketball Ave',
        city: 'Los Angeles',
        state: 'CA',
      },
      {
        name: 'Court 2',
        address: '456 Hoops Street',
        city: 'Los Angeles',
        state: 'CA',
      },
    ],
    games: [
      {
        divisionName: 'U12 Boys',
        teamA: 'Lakers Youth',
        teamB: 'Warriors Youth',
        startTime: '2024-06-01T10:00:00',
        locationName: 'Main Court',
      },
      {
        divisionName: 'U14 Girls',
        teamA: 'Sparks Youth',
        teamB: 'Storm Youth',
        startTime: '2024-06-01T12:00:00',
        locationName: 'Court 2',
      },
    ],
  };

  return JSON.stringify(sampleData, null, 2);
};
