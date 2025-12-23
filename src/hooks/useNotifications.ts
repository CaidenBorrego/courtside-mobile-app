// NOTIFICATIONS TEMPORARILY DISABLED
// This hook is disabled until notifications are re-enabled

/*
import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import NotificationService from '../services/notifications/NotificationService';
import { userProfileService } from '../services/user/UserProfileService';
import useAuth from './useAuth';

... (rest of file commented out)
*/

// Stub export to prevent import errors
export const useNotifications = () => {
  return {
    expoPushToken: null,
    notification: null,
    isRegistered: false,
    permissionStatus: 'undetermined' as const,
    registerForNotifications: async () => {},
    scheduleGameStartNotification: async () => '',
    sendGameEndNotification: async () => '',
    cancelNotification: async () => {},
    cancelAllNotifications: async () => {},
    getAllScheduledNotifications: async () => [],
    clearBadge: async () => {},
  };
};
