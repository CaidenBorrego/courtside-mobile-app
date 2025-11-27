import NotificationService from '../NotificationService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Mock expo-notifications
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-constants');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = NotificationService.getInstance();
    
    // Mock Device.isDevice to return true by default
    (Device.isDevice as any) = true;
    
    // Mock Constants
    (Constants as any).expoConfig = {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    };
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('requestPermissions', () => {
    it('should return false if not on physical device', async () => {
      (Device.isDevice as any) = false;
      
      const result = await notificationService.requestPermissions();
      
      expect(result).toBe(false);
    });

    it('should return true if permissions already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      const result = await notificationService.requestPermissions();
      
      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    });

    it('should request permissions if not granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      const result = await notificationService.requestPermissions();
      
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false if permissions denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      
      const result = await notificationService.requestPermissions();
      
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );
      
      const result = await notificationService.requestPermissions();
      
      expect(result).toBe(false);
    });
  });

  describe('registerForPushNotifications', () => {
    it('should return null if not on physical device', async () => {
      (Device.isDevice as any) = false;
      
      const result = await notificationService.registerForPushNotifications();
      
      expect(result).toBeNull();
    });

    it('should return null if permissions not granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      
      const result = await notificationService.registerForPushNotifications();
      
      expect(result).toBeNull();
    });

    it('should return null if project ID not found', async () => {
      (Constants as any).expoConfig = { extra: {} };
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      const result = await notificationService.registerForPushNotifications();
      
      expect(result).toBeNull();
    });

    it('should return FCM token on success', async () => {
      const mockToken = 'ExponentPushToken[test-token-123]';
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });
      (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(undefined);
      
      const result = await notificationService.registerForPushNotifications();
      
      expect(result).toBe(mockToken);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: 'test-project-id',
      });
    });

    it('should handle errors gracefully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token error')
      );
      
      const result = await notificationService.registerForPushNotifications();
      
      expect(result).toBeNull();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule notification with Date trigger', async () => {
      const mockId = 'notification-123';
      const triggerDate = new Date('2024-12-31T12:00:00Z');
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);
      
      const result = await notificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        triggerDate
      );
      
      expect(result).toBe(mockId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { date: triggerDate },
      });
    });

    it('should schedule notification with seconds trigger', async () => {
      const mockId = 'notification-456';
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);
      
      const result = await notificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        60
      );
      
      expect(result).toBe(mockId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { seconds: 60 },
      });
    });

    it('should include custom data in notification', async () => {
      const mockId = 'notification-789';
      const customData = { gameId: 'game-123', type: 'game-start' };
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);
      
      await notificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        60,
        customData
      );
      
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            data: customData,
          }),
        })
      );
    });

    it('should throw error on failure', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Schedule error')
      );
      
      await expect(
        notificationService.scheduleLocalNotification('Title', 'Body', 60)
      ).rejects.toThrow();
    });
  });

  describe('scheduleGameStartNotification', () => {
    it('should schedule notification for game starting soon', async () => {
      const mockId = 'game-notification-123';
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);
      
      const result = await notificationService.scheduleGameStartNotification(
        'game-123',
        'Team A',
        'Team B',
        futureDate,
        15
      );
      
      expect(result).toBe(mockId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Game Starting Soon',
            body: 'Team A vs Team B starts in 15 minutes',
            data: {
              type: 'game-start',
              gameId: 'game-123',
              teamA: 'Team A',
              teamB: 'Team B',
            },
          }),
        })
      );
    });

    it('should throw error if notification time is in the past', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      await expect(
        notificationService.scheduleGameStartNotification(
          'game-123',
          'Team A',
          'Team B',
          pastDate,
          15
        )
      ).rejects.toThrow('Notification time is in the past');
    });
  });

  describe('sendGameEndNotification', () => {
    it('should send immediate notification for game end', async () => {
      const mockId = 'game-end-notification-123';
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);
      
      const result = await notificationService.sendGameEndNotification(
        'game-123',
        'Team A',
        'Team B',
        85,
        72
      );
      
      expect(result).toBe(mockId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Game Finished',
            body: 'Final Score: Team A 85 - 72 Team B',
            data: {
              type: 'game-end',
              gameId: 'game-123',
              teamA: 'Team A',
              teamB: 'Team B',
              scoreA: 85,
              scoreB: 72,
            },
          }),
          trigger: { seconds: 1 },
        })
      );
    });
  });

  describe('cancelNotification', () => {
    it('should cancel scheduled notification', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
      
      await notificationService.cancelNotification('notification-123');
      
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'notification-123'
      );
    });

    it('should throw error on failure', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Cancel error')
      );
      
      await expect(
        notificationService.cancelNotification('notification-123')
      ).rejects.toThrow();
    });
  });

  describe('cancelAllNotifications', () => {
    it('should cancel all scheduled notifications', async () => {
      (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(
        undefined
      );
      
      await notificationService.cancelAllNotifications();
      
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('getAllScheduledNotifications', () => {
    it('should return all scheduled notifications', async () => {
      const mockNotifications = [
        { identifier: 'notif-1', content: {}, trigger: {} },
        { identifier: 'notif-2', content: {}, trigger: {} },
      ];
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(
        mockNotifications
      );
      
      const result = await notificationService.getAllScheduledNotifications();
      
      expect(result).toEqual(mockNotifications);
    });

    it('should return empty array on error', async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error('Get error')
      );
      
      const result = await notificationService.getAllScheduledNotifications();
      
      expect(result).toEqual([]);
    });
  });

  describe('badge management', () => {
    it('should get badge count', async () => {
      (Notifications.getBadgeCountAsync as jest.Mock).mockResolvedValue(5);
      
      const result = await notificationService.getBadgeCount();
      
      expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
      (Notifications.getBadgeCountAsync as jest.Mock).mockRejectedValue(
        new Error('Badge error')
      );
      
      const result = await notificationService.getBadgeCount();
      
      expect(result).toBe(0);
    });

    it('should set badge count', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);
      
      await notificationService.setBadgeCount(10);
      
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(10);
    });

    it('should clear badge', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);
      
      await notificationService.clearBadge();
      
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('notification listeners', () => {
    it('should setup notification listeners', () => {
      const mockReceivedListener = { remove: jest.fn() };
      const mockResponseListener = { remove: jest.fn() };
      
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockReceivedListener
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockResponseListener
      );
      
      const onReceived = jest.fn();
      const onResponse = jest.fn();
      
      notificationService.setupNotificationListeners(onReceived, onResponse);
      
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    it('should remove existing listeners before adding new ones', () => {
      const mockListener = { remove: jest.fn() };
      
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(mockListener);
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockListener
      );
      
      notificationService.setupNotificationListeners();
      notificationService.setupNotificationListeners();
      
      expect(mockListener.remove).toHaveBeenCalledTimes(2);
    });

    it('should remove notification listeners', () => {
      const mockListener = { remove: jest.fn() };
      
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(mockListener);
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockListener
      );
      
      notificationService.setupNotificationListeners();
      notificationService.removeNotificationListeners();
      
      expect(mockListener.remove).toHaveBeenCalledTimes(2);
    });
  });
});
