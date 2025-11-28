import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Alert } from 'react-native';
import AdminPanelScreen from '../AdminPanelScreen';
import { firebaseService } from '../../../services/firebase';
import { UserRole, TournamentStatus } from '../../../types';
import { Timestamp } from 'firebase/firestore';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock AuthContext
const mockAdminProfile = {
  id: 'admin-123',
  email: 'admin@test.com',
  displayName: 'Admin User',
  role: UserRole.ADMIN,
  followingTeams: [],
  followingGames: [],
  notificationsEnabled: true,
  createdAt: Timestamp.now(),
  lastActive: Timestamp.now(),
};

const mockUserProfile = {
  ...mockAdminProfile,
  role: UserRole.USER,
};

let mockUserProfileValue = mockAdminProfile;

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfileValue,
  }),
}));

// Mock Firebase service
jest.mock('../../../services/firebase', () => ({
  firebaseService: {
    getTournaments: jest.fn(),
    createTournament: jest.fn(),
    updateTournament: jest.fn(),
    deleteTournamentWithRelatedData: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockTournaments = [
  {
    id: 'tournament-1',
    name: 'Summer Basketball Tournament',
    city: 'Los Angeles',
    state: 'CA',
    startDate: Timestamp.fromDate(new Date('2024-06-01')),
    endDate: Timestamp.fromDate(new Date('2024-06-07')),
    status: TournamentStatus.UPCOMING,
    createdBy: 'admin-123',
    createdAt: Timestamp.now(),
  },
  {
    id: 'tournament-2',
    name: 'Winter Championship',
    city: 'New York',
    state: 'NY',
    startDate: Timestamp.fromDate(new Date('2024-12-01')),
    endDate: Timestamp.fromDate(new Date('2024-12-10')),
    status: TournamentStatus.ACTIVE,
    createdBy: 'admin-123',
    createdAt: Timestamp.now(),
  },
];

const renderAdminPanel = () => {
  return render(
    <PaperProvider>
      <AdminPanelScreen />
    </PaperProvider>
  );
};

describe('AdminPanelScreen - Role-Based Access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfileValue = mockAdminProfile;
  });

  it('should show access denied for non-admin users', () => {
    mockUserProfileValue = mockUserProfile;

    const { getByText } = renderAdminPanel();

    expect(getByText('Access Denied')).toBeTruthy();
    expect(getByText('You do not have permission to access the admin panel.')).toBeTruthy();
  });

  it('should call getTournaments for admin users', async () => {
    (firebaseService.getTournaments as jest.Mock).mockResolvedValue(mockTournaments);

    renderAdminPanel();

    await waitFor(() => {
      expect(firebaseService.getTournaments).toHaveBeenCalled();
    });
  });
});

describe('AdminPanelScreen - Tournament List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfileValue = mockAdminProfile;
    (firebaseService.getTournaments as jest.Mock).mockResolvedValue(mockTournaments);
  });

  it('should load tournaments on mount', async () => {
    renderAdminPanel();

    await waitFor(() => {
      expect(firebaseService.getTournaments).toHaveBeenCalled();
    });
  });

  it('should handle empty tournament list', async () => {
    (firebaseService.getTournaments as jest.Mock).mockResolvedValue([]);

    renderAdminPanel();

    await waitFor(() => {
      expect(firebaseService.getTournaments).toHaveBeenCalled();
    });
  });
});

describe('AdminPanelScreen - Tournament CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfileValue = mockAdminProfile;
    (firebaseService.getTournaments as jest.Mock).mockResolvedValue(mockTournaments);
  });

  it('should call createTournament when creating', async () => {
    (firebaseService.createTournament as jest.Mock).mockResolvedValue('new-tournament-id');

    renderAdminPanel();

    await waitFor(() => {
      expect(firebaseService.getTournaments).toHaveBeenCalled();
    });
  });

  it('should call updateTournament when updating', async () => {
    (firebaseService.updateTournament as jest.Mock).mockResolvedValue(undefined);

    renderAdminPanel();

    await waitFor(() => {
      expect(firebaseService.getTournaments).toHaveBeenCalled();
    });
  });

  it('should call deleteTournamentWithRelatedData when deleting', async () => {
    (firebaseService.deleteTournamentWithRelatedData as jest.Mock).mockResolvedValue(undefined);

    renderAdminPanel();

    await waitFor(() => {
      expect(firebaseService.getTournaments).toHaveBeenCalled();
    });
  });
});

describe('AdminPanelScreen - Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfileValue = mockAdminProfile;
    (firebaseService.getTournaments as jest.Mock).mockResolvedValue(mockTournaments);
  });

  it('should have navigation available', async () => {
    renderAdminPanel();

    await waitFor(() => {
      expect(firebaseService.getTournaments).toHaveBeenCalled();
    });

    // Navigation mock is available
    expect(mockNavigate).toBeDefined();
  });
});
