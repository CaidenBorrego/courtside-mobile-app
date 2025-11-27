import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotifications } from '../useNotifications';
import NotificationService from '../../services/notifications/NotificationService';
import { userProfileService } from '../../services/user/UserProfileService';
import useAuth from '../useAuth';

// Mock dependencies
jest.mock('../useAuth');
jest.mock('../../services/notifications/NotificationService');
jest.mock('../../services/user/UserProfileService');

describe('useNotifications', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockNotificationService = {
    requestPermissions: jest.fn(),
    registerForPushNotifications: jest.fn(),
    scheduleGameStartNotification: jest.fn(),
    sendGameEndNotification: jest.fn(),
    cancelNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
    getAllScheduledNotifications: jest.fn(),
    clearBadge: jest.fn(),
    setupNotificationListeners: jest.fn(),
    removeNotificationListeners: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    // Mock NotificationService.getInstance
    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);

    // Mock userProfileService
    (userProfileService.updateFCMToken as jest.Mock).mockResolvedValue(undefined);
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.expoPushToken).toBeNull();
    expect(result.current.notification).toBeNull();
    expect(result.current.isRegistered).toBe(false);
    expect(result.current.permissionStatus).toBe('undetermined');
  });

  it('should setup notification listeners on mount', () => {
    renderHook(() => useNotifications());

    expect(mockNotificationService.setupNotificationListeners).toHaveBeenCalled();
  });

  it('should remove notification listeners on unmount', () => {
    const { unmount } = renderHook(() => useNotifications());

    unmount();

    expect(mockNotificationService.removeNotificationListeners).toHaveBeenCalled();
  });

  it('should auto-register for notifications when user logs in', async () => {
    const mockToken = 'ExponentPushToken[test-token]';
    mockNotificationService.requestPermissions.mockResolvedValue(true);
    mockNotificationService.registerForPushNotifications.mockResolvedValue(mockToken);

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(mockNotificationService.requestPermissions).toHaveBeenCalled();
      expect(mockNotificationService.registerForPushNotifications).toHaveBeenCalled();
      expect(userProfileService.updateFCMToken).toHaveBeenCalledWith(
        mockUser.uid,
        mockToken
      );
    });
  });

  it('should handle permission denial', async () => {
    mockNotificationService.requestPermissions.mockResolvedValue(false);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const token = await result.current.registerForNotifications();
      expect(token).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.permissionStatus).toBe('denied');
      expect(result.current.isRegistered).toBe(false);
    });
  });

  it('should register for notifications successfully', async () => {
    const mockToken = 'ExponentPushToken[test-token]';
    mockNotificationService.requestPermissions.mockResolvedValue(true);
    mockNotificationService.registerForPushNotifications.mockResolvedValue(mockToken);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const token = await result.current.registerForNotifications();
      expect(token).toBe(mockToken);
    });

    await waitFor(() => {
      expect(result.current.permissionStatus).toBe('granted');
      expect(result.current.expoPushToken).toBe(mockToken);
      expect(result.current.isRegistered).toBe(true);
    });
  });

  it('should schedule game notification', async () => {
    const mockNotificationId = 'notification-123';
    const startTime = new Date('2024-12-31T12:00:00Z');
    mockNotificationService.scheduleGameStartNotification.mockResolvedValue(mockNotificationId);

    const { result } = renderHook(() => useNotifications());

    let notificationId: string | null = null;
    await act(async () => {
      notificationId = await result.current.scheduleGameNotification(
        'game-123',
        'Team A',
        'Team B',
        startTime,
        15
      );
    });

    expect(notificationId).toBe(mockNotificationId);
    expect(mockNotificationService.scheduleGameStartNotification).toHaveBeenCalledWith(
      'game-123',
      'Team A',
      'Team B',
      startTime,
      15
    );
  });

  it('should send game end notification', async () => {
    const mockNotificationId = 'notification-456';
    mockNotificationService.sendGameEndNotification.mockResolvedValue(mockNotificationId);

    const { result } = renderHook(() => useNotifications());

    let notificationId: string | null = null;
    await act(async () => {
      notificationId = await result.current.sendGameEndNotification(
        'game-123',
        'Team A',
        'Team B',
        85,
        72
      );
    });

    expect(notificationId).toBe(mockNotificationId);
    expect(mockNotificationService.sendGameEndNotification).toHaveBeenCalledWith(
      'game-123',
      'Team A',
      'Team B',
      85,
      72
    );
  });

  it('should cancel notification', async () => {
    mockNotificationService.cancelNotification.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.cancelNotification('notification-123');
    });

    expect(mockNotificationService.cancelNotification).toHaveBeenCalledWith('notification-123');
  });

  it('should cancel all notifications', async () => {
    mockNotificationService.cancelAllNotifications.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.cancelAllNotifications();
    });

    expect(mockNotificationService.cancelAllNotifications).toHaveBeenCalled();
  });

  it('should get scheduled notifications', async () => {
    const mockNotifications = [
      { identifier: 'notif-1', content: {}, trigger: {} },
      { identifier: 'notif-2', content: {}, trigger: {} },
    ];
    mockNotificationService.getAllScheduledNotifications.mockResolvedValue(mockNotifications);

    const { result } = renderHook(() => useNotifications());

    let notifications: any[] = [];
    await act(async () => {
      notifications = await result.current.getScheduledNotifications();
    });

    expect(notifications).toEqual(mockNotifications);
  });

  it('should clear badge', async () => {
    mockNotificationService.clearBadge.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.clearBadge();
    });

    expect(mockNotificationService.clearBadge).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockNotificationService.requestPermissions.mockRejectedValue(
      new Error('Permission error')
    );

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const token = await result.current.registerForNotifications();
      expect(token).toBeNull();
    });
  });

  it('should not auto-register if user is not logged in', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    renderHook(() => useNotifications());

    // Wait a bit to ensure no registration happens
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockNotificationService.requestPermissions).not.toHaveBeenCalled();
  });
});
