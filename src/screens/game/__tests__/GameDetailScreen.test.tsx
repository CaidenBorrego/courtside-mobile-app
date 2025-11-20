import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import GameDetailScreen from '../GameDetailScreen';
import { firebaseService } from '../../../services/firebase';
import { userProfileService } from '../../../services/user';
import { useAuth } from '../../../hooks';
import { openMaps } from '../../../utils';
import { GameStatus } from '../../../types';
import { Timestamp } from 'firebase/firestore';

// Mock dependencies
jest.mock('../../../services/firebase');
jest.mock('../../../services/user');
jest.mock('../../../hooks');
jest.mock('../../../utils');
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: { gameId: 'game123' },
  }),
}));

jest.spyOn(Alert, 'alert');

const mockGame = {
  id: 'game123',
  tournamentId: 'tournament123',
  divisionId: 'division123',
  teamA: 'Lakers',
  teamB: 'Warriors',
  scoreA: 95,
  scoreB: 88,
  startTime: Timestamp.fromDate(new Date('2024-03-15T18:00:00')),
  locationId: 'location123',
  status: GameStatus.IN_PROGRESS,
  createdAt: Timestamp.now(),
};

const mockLocation = {
  id: 'location123',
  name: 'Main Arena',
  address: '123 Sports Ave',
  city: 'Los Angeles',
  state: 'CA',
  coordinates: {
    latitude: 34.0522,
    longitude: -118.2437,
  },
  createdAt: Timestamp.now(),
};

const mockUser = {
  uid: 'user123',
  email: 'test@example.com',
  displayName: 'Test User',
};

describe('GameDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (firebaseService.onGameSnapshot as jest.Mock).mockImplementation((gameId, callback) => {
      callback(mockGame);
      return jest.fn(); // unsubscribe function
    });
    
    (firebaseService.getLocation as jest.Mock).mockResolvedValue(mockLocation);
    (userProfileService.isFollowingGame as jest.Mock).mockResolvedValue(false);
    (useAuth as jest.Mock).mockReturnValue({ user: null });
  });

  describe('Game Information Display', () => {
    it('should display loading state initially', () => {
      (firebaseService.onGameSnapshot as jest.Mock).mockImplementation(() => {
        return jest.fn();
      });

      const { getByText } = render(<GameDetailScreen />);
      expect(getByText('Loading game details...')).toBeTruthy();
    });

    it('should display game information correctly', async () => {
      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Lakers')).toBeTruthy();
        expect(getByText('Warriors')).toBeTruthy();
        expect(getByText('95')).toBeTruthy();
        expect(getByText('88')).toBeTruthy();
        expect(getByText('vs')).toBeTruthy();
      });
    });

    it('should display game status correctly', async () => {
      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('In Progress')).toBeTruthy();
      });
    });

    it('should display scheduled game status', async () => {
      const scheduledGame = { ...mockGame, status: GameStatus.SCHEDULED };
      (firebaseService.onGameSnapshot as jest.Mock).mockImplementation((gameId, callback) => {
        callback(scheduledGame);
        return jest.fn();
      });

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Scheduled')).toBeTruthy();
      });
    });

    it('should display completed game status', async () => {
      const completedGame = { ...mockGame, status: GameStatus.COMPLETED };
      (firebaseService.onGameSnapshot as jest.Mock).mockImplementation((gameId, callback) => {
        callback(completedGame);
        return jest.fn();
      });

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Completed')).toBeTruthy();
      });
    });

    it('should display location information', async () => {
      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Main Arena')).toBeTruthy();
        expect(getByText('123 Sports Ave')).toBeTruthy();
        expect(getByText('Los Angeles, CA')).toBeTruthy();
      });
    });

    it('should display TBD when location is not available', async () => {
      const gameWithoutLocation = { ...mockGame, locationId: '' };
      (firebaseService.onGameSnapshot as jest.Mock).mockImplementation((gameId, callback) => {
        callback(gameWithoutLocation);
        return jest.fn();
      });

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('TBD')).toBeTruthy();
      });
    });

    it('should display error when game is not found', async () => {
      (firebaseService.onGameSnapshot as jest.Mock).mockImplementation((gameId, callback) => {
        callback(null);
        return jest.fn();
      });

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Game not found')).toBeTruthy();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should set up real-time listener on mount', () => {
      render(<GameDetailScreen />);

      expect(firebaseService.onGameSnapshot).toHaveBeenCalledWith(
        'game123',
        expect.any(Function)
      );
    });

    it('should update game data when snapshot changes', async () => {
      let snapshotCallback: any;
      (firebaseService.onGameSnapshot as jest.Mock).mockImplementation((gameId, callback) => {
        snapshotCallback = callback;
        callback(mockGame);
        return jest.fn();
      });

      const { getByText, rerender } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('95')).toBeTruthy();
      });

      // Simulate score update
      const updatedGame = { ...mockGame, scoreA: 100, scoreB: 92 };
      snapshotCallback(updatedGame);

      await waitFor(() => {
        expect(getByText('100')).toBeTruthy();
        expect(getByText('92')).toBeTruthy();
      });
    });

    it('should clean up listener on unmount', () => {
      const unsubscribe = jest.fn();
      (firebaseService.onGameSnapshot as jest.Mock).mockReturnValue(unsubscribe);

      const { unmount } = render(<GameDetailScreen />);
      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Follow/Unfollow Functionality', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    });

    it('should display follow button when user is logged in', async () => {
      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Follow Game')).toBeTruthy();
      });
    });

    it('should display following button when user is already following', async () => {
      (userProfileService.isFollowingGame as jest.Mock).mockResolvedValue(true);

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Following')).toBeTruthy();
      });
    });

    it('should follow game when follow button is pressed', async () => {
      (userProfileService.followGame as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Follow Game')).toBeTruthy();
      });

      fireEvent.press(getByText('Follow Game'));

      await waitFor(() => {
        expect(userProfileService.followGame).toHaveBeenCalledWith('user123', 'game123');
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Game followed! You will receive notifications about this game.'
        );
      });
    });

    it('should unfollow game when following button is pressed', async () => {
      (userProfileService.isFollowingGame as jest.Mock).mockResolvedValue(true);
      (userProfileService.unfollowGame as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Following')).toBeTruthy();
      });

      fireEvent.press(getByText('Following'));

      await waitFor(() => {
        expect(userProfileService.unfollowGame).toHaveBeenCalledWith('user123', 'game123');
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Game unfollowed');
      });
    });

    it('should show error alert when follow fails', async () => {
      (userProfileService.followGame as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Follow Game')).toBeTruthy();
      });

      fireEvent.press(getByText('Follow Game'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update following status');
      });
    });

    it('should show login prompt when user is not logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null });

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Log in to follow this game and receive notifications')).toBeTruthy();
      });
    });

    it('should show alert when unauthenticated user tries to follow', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null });

      const { getByText, queryByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(queryByText('Follow Game')).toBeNull();
      });
    });
  });

  describe('Maps Integration', () => {
    it('should display Open in Maps button when location is available', async () => {
      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Open in Maps')).toBeTruthy();
      });
    });

    it('should call openMaps when button is pressed', async () => {
      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Open in Maps')).toBeTruthy();
      });

      fireEvent.press(getByText('Open in Maps'));

      await waitFor(() => {
        expect(openMaps).toHaveBeenCalledWith(mockLocation);
      });
    });

    it('should not display Open in Maps button when location is not available', async () => {
      const gameWithoutLocation = { ...mockGame, locationId: '' };
      (firebaseService.onGameSnapshot as jest.Mock).mockImplementation((gameId, callback) => {
        callback(gameWithoutLocation);
        return jest.fn();
      });

      const { queryByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(queryByText('Open in Maps')).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle location fetch error gracefully', async () => {
      (firebaseService.getLocation as jest.Mock).mockRejectedValue(new Error('Location not found'));

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Lakers')).toBeTruthy();
      });

      // Should still display game info even if location fails
      expect(firebaseService.getLocation).toHaveBeenCalled();
    });

    it('should handle follow status check error gracefully', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
      (userProfileService.isFollowingGame as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<GameDetailScreen />);

      await waitFor(() => {
        expect(getByText('Follow Game')).toBeTruthy();
      });
    });
  });
});
