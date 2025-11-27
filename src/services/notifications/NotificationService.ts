import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * NotificationService handles all notification-related operations
 * including permission requests, FCM token registration, and notification scheduling
 */
class NotificationService {
  private static instance: NotificationService;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  private constructor() {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Get singleton instance of NotificationService
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permissions from the user
   * @returns Promise<boolean> - true if permissions granted, false otherwise
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push notification permissions');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register device for push notifications and get FCM token
   * @returns Promise<string | null> - FCM token or null if registration failed
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('Project ID not found in app configuration');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create additional channels for different notification types
        await Notifications.setNotificationChannelAsync('game-updates', {
          name: 'Game Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          description: 'Notifications for game start times and score updates',
        });

        await Notifications.setNotificationChannelAsync('team-updates', {
          name: 'Team Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          description: 'Notifications for followed team game results',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Schedule a local notification
   * @param title - Notification title
   * @param body - Notification body
   * @param trigger - When to trigger the notification (Date or seconds from now)
   * @param data - Additional data to include with notification
   * @returns Promise<string> - Notification identifier
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Date | number,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const notificationTrigger: Notifications.NotificationTriggerInput =
        trigger instanceof Date
          ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger }
          : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: trigger, repeats: false };

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: notificationTrigger,
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Schedule a notification for a game starting soon
   * @param gameId - Game identifier
   * @param teamA - First team name
   * @param teamB - Second team name
   * @param startTime - Game start time
   * @param minutesBefore - How many minutes before game to send notification
   * @returns Promise<string> - Notification identifier
   */
  async scheduleGameStartNotification(
    gameId: string,
    teamA: string,
    teamB: string,
    startTime: Date,
    minutesBefore: number = 15
  ): Promise<string> {
    const notificationTime = new Date(startTime.getTime() - minutesBefore * 60 * 1000);
    
    // Don't schedule if notification time is in the past
    if (notificationTime <= new Date()) {
      throw new Error('Notification time is in the past');
    }

    return this.scheduleLocalNotification(
      'Game Starting Soon',
      `${teamA} vs ${teamB} starts in ${minutesBefore} minutes`,
      notificationTime,
      {
        type: 'game-start',
        gameId,
        teamA,
        teamB,
      }
    );
  }

  /**
   * Schedule a notification for a game ending
   * @param gameId - Game identifier
   * @param teamA - First team name
   * @param teamB - Second team name
   * @param scoreA - First team score
   * @param scoreB - Second team score
   * @returns Promise<string> - Notification identifier
   */
  async sendGameEndNotification(
    gameId: string,
    teamA: string,
    teamB: string,
    scoreA: number,
    scoreB: number
  ): Promise<string> {
    return this.scheduleLocalNotification(
      'Game Finished',
      `Final Score: ${teamA} ${scoreA} - ${scoreB} ${teamB}`,
      1, // Send immediately (1 second from now)
      {
        type: 'game-end',
        gameId,
        teamA,
        teamB,
        scoreA,
        scoreB,
      }
    );
  }

  /**
   * Cancel a scheduled notification
   * @param identifier - Notification identifier to cancel
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled notifications
   * @returns Promise<Notifications.NotificationRequest[]>
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Set up notification listeners
   * @param onNotificationReceived - Callback when notification is received
   * @param onNotificationResponse - Callback when user interacts with notification
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Remove existing listeners
    this.removeNotificationListeners();

    // Add notification received listener
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Add notification response listener (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );
  }

  /**
   * Remove notification listeners
   */
  removeNotificationListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Get notification badge count
   * @returns Promise<number>
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set notification badge count
   * @param count - Badge count to set
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear notification badge
   */
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }
}

export default NotificationService;
