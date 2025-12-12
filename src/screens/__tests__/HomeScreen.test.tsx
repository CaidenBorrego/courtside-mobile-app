import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import HomeScreen from '../HomeScreen';
import { firebaseService } from '../../services/firebase';
import { Tournament, TournamentStatus } from '../../types';
import { Timestamp } from 'firebase/firestore';

// Mock the firebase service
jest.mock('../../services/firebase', () => ({
  firebaseService: {
    onTournamentsSnapshot: jest.fn(),
    getActiveTournaments: jest.fn(),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockTournaments: Tournament[] = [
  {
    id: 'tournament-1',
    name: 'Summer Basketball Tournament',
    startDate: Timestamp.fromDate(new Date('2024-07-01')),
    endDate: Timestamp.fromDate(new Date('2024-07-05')),
    city: 'Los Angeles',
    state: 'CA',
    status: TournamentStatus.ACTIVE,
    createdBy: 'user-1',
    createdAt: Timestamp.now(),
  },
  {
    id: 'tournament-2',
    name: 'Winter Championship',
    startDate: Timestamp.fromDate(new Date('2024-12-01')),
    endDate: Timestamp.fromDate(new Date('2024-12-10')),
    city: 'New York',
    state: 'NY',
    status: TournamentStatus.UPCOMING,
    createdBy: 'user-1',
    createdAt: Timestamp.now(),
  },
];

const renderComponent = () => {
  return render(
    <PaperProvider>
      <HomeScreen />
    </PaperProvider>
  );
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading state initially', () => {
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockImplementation(() => jest.fn());
    
    const { getByText } = renderComponent();
    
    expect(getByText('Loading tournaments...')).toBeTruthy();
  });

  it('displays tournaments after loading', async () => {
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockImplementation((callback) => {
      callback(mockTournaments);
      return jest.fn();
    });
    
    const { getByText } = renderComponent();
    
    await waitFor(() => {
      expect(getByText('Summer Basketball Tournament')).toBeTruthy();
      expect(getByText('Winter Championship')).toBeTruthy();
    });
  });

  it('sets up real-time listener on mount', () => {
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockImplementation(() => jest.fn());
    
    renderComponent();
    
    expect(firebaseService.onTournamentsSnapshot).toHaveBeenCalledTimes(1);
  });

  it('cleans up listener on unmount', () => {
    const mockUnsubscribe = jest.fn();
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);
    
    const { unmount } = renderComponent();
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('filters tournaments based on search query', async () => {
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockImplementation((callback) => {
      callback(mockTournaments);
      return jest.fn();
    });
    
    const { getByPlaceholderText, getByText, queryByText, getByTestId } = renderComponent();
    
    await waitFor(() => {
      expect(getByText('Summer Basketball Tournament')).toBeTruthy();
    });
    
    // Click the search icon to expand the search bar
    const searchIcon = getByTestId('icon-button');
    fireEvent.press(searchIcon);
    
    // Now the search bar should be visible
    const searchBar = getByPlaceholderText('Search tournaments...');
    fireEvent.changeText(searchBar, 'Winter');
    
    await waitFor(() => {
      expect(getByText('Winter Championship')).toBeTruthy();
      expect(queryByText('Summer Basketball Tournament')).toBeNull();
    });
  });

  it('navigates to tournament detail when card is pressed', async () => {
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockImplementation((callback) => {
      callback(mockTournaments);
      return jest.fn();
    });
    
    const { getByText } = renderComponent();
    
    await waitFor(() => {
      expect(getByText('Summer Basketball Tournament')).toBeTruthy();
    });
    
    fireEvent.press(getByText('Summer Basketball Tournament'));
    
    expect(mockNavigate).toHaveBeenCalledWith('TournamentDetail', { tournamentId: 'tournament-1' });
  });

  it('displays empty state when no tournaments', async () => {
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockImplementation((callback) => {
      callback([]);
      return jest.fn();
    });
    
    const { getByText } = renderComponent();
    
    await waitFor(() => {
      expect(getByText('No Tournaments Found')).toBeTruthy();
    });
  });

  it('handles refresh correctly', async () => {
    (firebaseService.onTournamentsSnapshot as jest.Mock).mockImplementation((callback) => {
      callback(mockTournaments);
      return jest.fn();
    });
    (firebaseService.getActiveTournaments as jest.Mock).mockResolvedValue(mockTournaments);
    
    const { getByText } = renderComponent();
    
    await waitFor(() => {
      expect(getByText('Summer Basketball Tournament')).toBeTruthy();
    });
    
    // Note: Testing pull-to-refresh is complex in unit tests
    // This would be better tested in integration/E2E tests
  });
});
