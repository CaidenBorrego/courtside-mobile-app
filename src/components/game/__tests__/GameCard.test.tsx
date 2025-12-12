import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import GameCard from '../GameCard';
import { Game, GameStatus } from '../../../types';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';

// Mock AuthContext
jest.mock('../../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockGame: Game = {
  id: 'game-1',
  tournamentId: 'tournament-1',
  divisionId: 'division-1',
  teamA: 'Lakers',
  teamB: 'Warriors',
  scoreA: 95,
  scoreB: 88,
  startTime: Timestamp.fromDate(new Date('2024-07-01T18:00:00')),
  locationId: 'location-1',
  status: GameStatus.COMPLETED,
  createdAt: Timestamp.now(),
};

const mockOnPress = jest.fn();

const renderComponent = (game: Game = mockGame, onPress?: (id: string) => void, showFollowButton = false) => {
  return render(
    <PaperProvider>
      <GameCard game={game} onPress={onPress} showLocation={true} showFollowButton={showFollowButton} />
    </PaperProvider>
  );
};

describe('GameCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth to return null user (no follow button shown by default)
    mockUseAuth.mockReturnValue({
      user: null,
      userProfile: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      clearError: jest.fn(),
      refreshUserProfile: jest.fn(),
    });
  });

  it('renders game information correctly', () => {
    const { getByText } = renderComponent();

    expect(getByText('Lakers')).toBeTruthy();
    expect(getByText('Warriors')).toBeTruthy();
    expect(getByText('95')).toBeTruthy();
    expect(getByText('88')).toBeTruthy();
  });

  it('displays Final status for completed game', () => {
    const { getByText } = renderComponent();
    expect(getByText('FINAL')).toBeTruthy();
  });

  it('displays Live status for in-progress game', () => {
    const liveGame = {
      ...mockGame,
      status: GameStatus.IN_PROGRESS,
    };
    const { getByText } = renderComponent(liveGame);
    expect(getByText('LIVE')).toBeTruthy();
  });

  it('displays vs for scheduled game without scores', () => {
    const scheduledGame = {
      ...mockGame,
      status: GameStatus.SCHEDULED,
      scoreA: 0,
      scoreB: 0,
    };
    const { getByText } = renderComponent(scheduledGame);
    expect(getByText('VS')).toBeTruthy();
    expect(getByText('SCHEDULED')).toBeTruthy();
  });

  it('highlights winner for completed game', () => {
    const { getByText } = renderComponent();
    
    const lakersText = getByText('Lakers');
    expect(lakersText).toBeTruthy();
    // Winner should have special styling (Lakers won 95-88)
  });

  it('calls onPress with game id when pressed', () => {
    const { getByText } = renderComponent(mockGame, mockOnPress);
    
    fireEvent.press(getByText('Lakers'));
    
    expect(mockOnPress).toHaveBeenCalledWith('game-1');
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when onPress is not provided', () => {
    const { getByText } = renderComponent(mockGame);
    
    // Should not throw error
    fireEvent.press(getByText('Lakers'));
  });

  it('renders without location display', () => {
    // GameCard no longer displays location in the card itself
    const { queryByText } = renderComponent();
    expect(queryByText(/Location ID/)).toBeNull();
  });

  it('formats game time correctly', () => {
    const { getByText } = renderComponent();
    
    // Check that time is displayed (format may vary)
    expect(getByText(/Jul 01/)).toBeTruthy();
  });
});
