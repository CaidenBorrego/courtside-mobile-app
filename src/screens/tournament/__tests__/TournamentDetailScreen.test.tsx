import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import TournamentDetailScreen from '../TournamentDetailScreen';
import { firebaseService } from '../../../services/firebase';
import { Tournament, TournamentStatus } from '../../../types';
import { Timestamp } from 'firebase/firestore';

// Mock the firebase service
jest.mock('../../../services/firebase', () => ({
  firebaseService: {
    onTournamentSnapshot: jest.fn(),
    getDivisionsByTournament: jest.fn(),
    onGamesByTournamentSnapshot: jest.fn(),
    getLocations: jest.fn(),
  },
}));

// Mock the route params
const mockRoute = {
  params: {
    tournamentId: 'tournament-1',
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => mockRoute,
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockTournament: Tournament = {
  id: 'tournament-1',
  name: 'Summer Basketball Tournament',
  startDate: Timestamp.fromDate(new Date('2024-07-01')),
  endDate: Timestamp.fromDate(new Date('2024-07-05')),
  city: 'Los Angeles',
  state: 'CA',
  status: TournamentStatus.ACTIVE,
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
};

const renderComponent = () => {
  return render(
    <NavigationContainer>
      <PaperProvider>
        <TournamentDetailScreen />
      </PaperProvider>
    </NavigationContainer>
  );
};

describe('TournamentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (firebaseService.getDivisionsByTournament as jest.Mock).mockResolvedValue([]);
    (firebaseService.onGamesByTournamentSnapshot as jest.Mock).mockImplementation((id, callback) => {
      callback([]);
      return jest.fn();
    });
    (firebaseService.getLocations as jest.Mock).mockResolvedValue([]);
  });

  it('displays loading state initially', () => {
    (firebaseService.onTournamentSnapshot as jest.Mock).mockImplementation(() => jest.fn());
    
    const { getByText } = renderComponent();
    
    expect(getByText('Loading tournament...')).toBeTruthy();
  });

  it('displays tournament tabs after loading', async () => {
    (firebaseService.onTournamentSnapshot as jest.Mock).mockImplementation((id, callback) => {
      callback(mockTournament);
      return jest.fn();
    });
    
    const { getAllByText } = renderComponent();
    
    await waitFor(() => {
      expect(getAllByText('Divisions').length).toBeGreaterThan(0);
      expect(getAllByText('Schedule').length).toBeGreaterThan(0);
      expect(getAllByText('Locations').length).toBeGreaterThan(0);
    });
  });

  it('sets up real-time listener for tournament', () => {
    (firebaseService.onTournamentSnapshot as jest.Mock).mockImplementation(() => jest.fn());
    
    renderComponent();
    
    expect(firebaseService.onTournamentSnapshot).toHaveBeenCalledWith(
      'tournament-1',
      expect.any(Function)
    );
  });

  it('cleans up listener on unmount', () => {
    const mockUnsubscribe = jest.fn();
    (firebaseService.onTournamentSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);
    
    const { unmount } = renderComponent();
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('displays error when tournament not found', async () => {
    (firebaseService.onTournamentSnapshot as jest.Mock).mockImplementation((id, callback) => {
      callback(null);
      return jest.fn();
    });
    
    const { getByText } = renderComponent();
    
    await waitFor(() => {
      expect(getByText('Tournament not found')).toBeTruthy();
    });
  });

  it('updates when tournament data changes', async () => {
    let callbackFn: ((tournament: Tournament | null) => void) | null = null;
    
    (firebaseService.onTournamentSnapshot as jest.Mock).mockImplementation((id, callback) => {
      callbackFn = callback;
      callback(mockTournament);
      return jest.fn();
    });
    
    const { getAllByText } = renderComponent();
    
    await waitFor(() => {
      expect(getAllByText('Divisions').length).toBeGreaterThan(0);
    });
    
    // Simulate real-time update
    const updatedTournament = {
      ...mockTournament,
      name: 'Updated Tournament Name',
    };
    
    if (callbackFn) {
      callbackFn(updatedTournament);
    }
    
    // The tabs should still be visible after update
    await waitFor(() => {
      expect(getAllByText('Divisions').length).toBeGreaterThan(0);
    });
  });
});
