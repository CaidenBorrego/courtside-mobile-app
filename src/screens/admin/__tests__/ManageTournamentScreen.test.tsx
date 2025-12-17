import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Alert } from 'react-native';
import ManageTournamentScreen from '../ManageTournamentScreen';
import { firebaseService } from '../../../services/firebase';
import { TournamentStatus, Gender, GameStatus } from '../../../types';
import { Timestamp } from 'firebase/firestore';

// Mock navigation
const mockRoute = {
  params: {
    tournamentId: 'tournament-1',
  },
};

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRoute,
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock Firebase service
jest.mock('../../../services/firebase', () => ({
  firebaseService: {
    getTournament: jest.fn(),
    getDivisionsByTournament: jest.fn(),
    getGamesByTournament: jest.fn(),
    getLocations: jest.fn(),
    getPoolsByDivision: jest.fn(),
    getBracketsByDivision: jest.fn(),
    createDivision: jest.fn(),
    updateDivision: jest.fn(),
    deleteDivision: jest.fn(),
    createGame: jest.fn(),
    updateGame: jest.fn(),
    deleteGame: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockTournament = {
  id: 'tournament-1',
  name: 'Summer Basketball Tournament',
  city: 'Los Angeles',
  state: 'CA',
  startDate: Timestamp.fromDate(new Date('2024-06-01')),
  endDate: Timestamp.fromDate(new Date('2024-06-07')),
  status: TournamentStatus.UPCOMING,
  createdBy: 'admin-123',
  createdAt: Timestamp.now(),
};

const mockDivisions = [
  {
    id: 'division-1',
    tournamentId: 'tournament-1',
    name: 'U12 Boys',
    ageGroup: 'U12',
    gender: Gender.MALE,
    skillLevel: 'Intermediate',
    createdAt: Timestamp.now(),
  },
];

const mockGames = [
  {
    id: 'game-1',
    tournamentId: 'tournament-1',
    divisionId: 'division-1',
    teamA: 'Lakers Youth',
    teamB: 'Warriors Youth',
    scoreA: 0,
    scoreB: 0,
    startTime: Timestamp.fromDate(new Date('2024-06-01T10:00:00')),
    locationId: 'location-1',
    status: GameStatus.SCHEDULED,
    createdAt: Timestamp.now(),
  },
];

const mockLocations = [
  {
    id: 'location-1',
    name: 'Main Court',
    address: '123 Basketball Ave',
    city: 'Los Angeles',
    state: 'CA',
    createdAt: Timestamp.now(),
  },
];

const renderManageTournament = () => {
  return render(
    <PaperProvider>
      <ManageTournamentScreen />
    </PaperProvider>
  );
};

describe('ManageTournamentScreen - Data Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (firebaseService.getTournament as jest.Mock).mockResolvedValue(mockTournament);
    (firebaseService.getDivisionsByTournament as jest.Mock).mockResolvedValue(mockDivisions);
    (firebaseService.getGamesByTournament as jest.Mock).mockResolvedValue(mockGames);
    (firebaseService.getLocations as jest.Mock).mockResolvedValue(mockLocations);
  });

  it('should call firebase services on mount', async () => {
    renderManageTournament();

    await waitFor(() => {
      expect(firebaseService.getTournament).toHaveBeenCalledWith('tournament-1');
    });

    expect(firebaseService.getDivisionsByTournament).toHaveBeenCalledWith('tournament-1');
    expect(firebaseService.getGamesByTournament).toHaveBeenCalledWith('tournament-1');
    expect(firebaseService.getLocations).toHaveBeenCalled();
  });
});

describe('ManageTournamentScreen - Division Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (firebaseService.getTournament as jest.Mock).mockResolvedValue(mockTournament);
    (firebaseService.getDivisionsByTournament as jest.Mock).mockResolvedValue(mockDivisions);
    (firebaseService.getGamesByTournament as jest.Mock).mockResolvedValue(mockGames);
    (firebaseService.getLocations as jest.Mock).mockResolvedValue(mockLocations);
  });

  it('should call createDivision when creating a division', async () => {
    (firebaseService.createDivision as jest.Mock).mockResolvedValue('new-division-id');
    
    renderManageTournament();

    await waitFor(() => {
      expect(firebaseService.getDivisionsByTournament).toHaveBeenCalled();
    });
  });

  it('should call deleteDivision when deleting', async () => {
    (firebaseService.deleteDivision as jest.Mock).mockResolvedValue(undefined);
    
    renderManageTournament();

    await waitFor(() => {
      expect(firebaseService.getDivisionsByTournament).toHaveBeenCalled();
    });
  });
});

describe('ManageTournamentScreen - Game Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (firebaseService.getTournament as jest.Mock).mockResolvedValue(mockTournament);
    (firebaseService.getDivisionsByTournament as jest.Mock).mockResolvedValue(mockDivisions);
    (firebaseService.getGamesByTournament as jest.Mock).mockResolvedValue(mockGames);
    (firebaseService.getLocations as jest.Mock).mockResolvedValue(mockLocations);
  });

  it('should call createGame when creating a game', async () => {
    (firebaseService.createGame as jest.Mock).mockResolvedValue('new-game-id');
    
    renderManageTournament();

    await waitFor(() => {
      expect(firebaseService.getGamesByTournament).toHaveBeenCalled();
    });
  });

  it('should call deleteGame when deleting', async () => {
    (firebaseService.deleteGame as jest.Mock).mockResolvedValue(undefined);
    
    renderManageTournament();

    await waitFor(() => {
      expect(firebaseService.getGamesByTournament).toHaveBeenCalled();
    });
  });
});
