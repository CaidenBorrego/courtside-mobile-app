import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import NotificationService from '../services/notifications/NotificationService';
import { userProfileService } from '../services/user/UserProfileService';
import useAuth from './useAuth';

/**
 * Custom hook for managing push notifications
 * Handles permission requests, token registration, and notification listeners
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined'
  );

  const notificationService = NotificationService.getInstance();

  /**
   * Request notification permissions and register for push notifications
   */
  const registerForNotifications = useCallback(async () => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      
      if (!hasPermission) {
        setPermissionStatus('denied');
        return null;
      }

      setPermissionStatus('granted');

      const token = await notificationService.registerForPushNotifications();
      
      if (token && user) {
        // Save token to user profile
        await userProfileService.updateFCMToken(user.uid, token);
        setExpoPushToken(token);
        setIsRegistered(true);
      }

      return token;
    } catch (error) {
      console.error('Error registering for notifications:', error);
      return null;
    }
  }, [user]);

  /**
   * Schedule a notification for a game starting soon
   */
  const scheduleGameNotification = useCallback(
    async (
      gameId: string,
      teamA: string,
      teamB: string,
      startTime: Date,
      minutesBefore: number = 15
    ) => {
      try {
        return await notificationService.scheduleGameStartNotification(
          gameId,
          teamA,
          teamB,
          startTime,
          minutesBefore
        );
      } catch (error) {
        console.error('Error scheduling game notification:', error);
        return null;
      }
    },
    []
  );

  /**
   * Send a notification for a completed game
   */
  const sendGameEndNotification = useCallback(
    async (
      gameId: string,
      teamA: string,
      teamB: string,
      scoreA: number,
      scoreB: number
    ) => {
      try {
        return await notificationService.sendGameEndNotification(
          gameId,
          teamA,
          teamB,
          scoreA,
          scoreB
        );
      } catch (error) {
        console.error('Error sending game end notification:', error);
        return null;
      }
    },
    []
  );

  /**
   * Cancel a scheduled notification
   */
  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.cancelNotification(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }, []);

  /**
   * Cancel all scheduled notifications
   */
  const cancelAllNotifications = useCallback(async () => {
    try {
      await notificationService.cancelAllNotifications();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }, []);

  /**
   * Get all scheduled notifications
   */
  const getScheduledNotifications = useCallback(async () => {
    try {
      return await notificationService.getAllScheduledNotifications();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }, []);

  /**
   * Clear notification badge
   */
  const clearBadge = useCallback(async () => {
    try {
      await notificationService.clearBadge();
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }, []);

  // Set up notification listeners on mount
  useEffect(() => {
    notificationService.setupNotificationListeners(
      (notification) => {
        setNotification(notification);
      },
      (response) => {
        console.log('Notification tapped:', response);
        // Handle notification tap - navigate to relevant screen
        const data = response.notification.request.content.data;
        
        if (data.type === 'game-start' || data.type === 'game-end') {
          // Navigation will be handled by the app's navigation context
          console.log('Navigate to game:', data.gameId);
        }
      }
    );

    return () => {
      notificationService.removeNotificationListeners();
    };
  }, []);

  // Auto-register for notifications when user logs in
  useEffect(() => {
    if (user && !isRegistered) {
      registerForNotifications();
    }
  }, [user, isRegistered, registerForNotifications]);

  return {
    expoPushToken,
    notification,
    isRegistered,
    permissionStatus,
    registerForNotifications,
    scheduleGameNotification,
    sendGameEndNotification,
    cancelNotification,
    cancelAllNotifications,
    getScheduledNotifications,
    clearBadge,
  };
};
