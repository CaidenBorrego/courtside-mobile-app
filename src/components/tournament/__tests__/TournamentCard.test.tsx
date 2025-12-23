import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import TournamentCard from '../TournamentCard';
import { Tournament, TournamentStatus } from '../../../types';
import { Timestamp } from 'firebase/firestore';

// Create a tournament that is currently active (today to 5 days from now)
const today = new Date();
today.setHours(0, 0, 0, 0);
const endDate = new Date(today);
endDate.setDate(endDate.getDate() + 5);

const mockTournament: Tournament = {
  id: 'tournament-1',
  name: 'Summer Basketball Tournament',
  startDate: Timestamp.fromDate(today),
  endDate: Timestamp.fromDate(endDate),
  city: 'Los Angeles',
  state: 'CA',
  status: TournamentStatus.ACTIVE,
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
};

const mockOnPress = jest.fn();

const renderComponent = (tournament: Tournament = mockTournament) => {
  return render(
    <PaperProvider>
      <TournamentCard tournament={tournament} onPress={mockOnPress} />
    </PaperProvider>
  );
};

describe('TournamentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tournament information correctly', () => {
    const { getByText } = renderComponent();

    expect(getByText('Summer Basketball Tournament')).toBeTruthy();
    expect(getByText(/Los Angeles, CA/)).toBeTruthy();
    expect(getByText('LIVE')).toBeTruthy();
  });

  it('displays correct status badge for active tournament', () => {
    const { getByText } = renderComponent();
    expect(getByText('LIVE')).toBeTruthy();
  });

  it('displays correct status badge for upcoming tournament', () => {
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 10);
    const futureEnd = new Date(futureStart);
    futureEnd.setDate(futureEnd.getDate() + 5);
    
    const upcomingTournament = {
      ...mockTournament,
      startDate: Timestamp.fromDate(futureStart),
      endDate: Timestamp.fromDate(futureEnd),
      status: TournamentStatus.UPCOMING,
    };
    const { getByText } = renderComponent(upcomingTournament);
    expect(getByText('UPCOMING')).toBeTruthy();
  });

  it('displays correct status badge for completed tournament', () => {
    const pastStart = new Date('2024-07-01');
    const pastEnd = new Date('2024-07-05');
    
    const completedTournament = {
      ...mockTournament,
      startDate: Timestamp.fromDate(pastStart),
      endDate: Timestamp.fromDate(pastEnd),
      status: TournamentStatus.COMPLETED,
    };
    const { getByText } = renderComponent(completedTournament);
    expect(getByText('COMPLETED')).toBeTruthy();
  });

  it('calls onPress with tournament id when pressed', () => {
    const { getByText } = renderComponent();
    
    fireEvent.press(getByText('Summer Basketball Tournament'));
    
    expect(mockOnPress).toHaveBeenCalledWith('tournament-1');
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('formats dates correctly', () => {
    const { getByText } = renderComponent();
    
    // Check that dates are displayed (current year)
    const currentYear = new Date().getFullYear();
    expect(getByText(new RegExp(currentYear.toString()))).toBeTruthy();
  });

  it('handles invalid dates gracefully', () => {
    const invalidTournament = {
      ...mockTournament,
      startDate: null as any,
      endDate: null as any,
    };
    
    const { getByText } = renderComponent(invalidTournament);
    
    // Should still render the tournament name and default to Upcoming status
    expect(getByText('Summer Basketball Tournament')).toBeTruthy();
    expect(getByText('UPCOMING')).toBeTruthy();
  });
});
