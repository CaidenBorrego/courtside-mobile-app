/**
 * Analytics and error reporting utilities
 * Integrates with Firebase Analytics and Crashlytics
 */

import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import app from '../services/firebase/config';

let analytics: any = null;

// Initialize analytics (web only)
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics not available:', error);
  }
}

/**
 * Log custom analytics event
 */
export const logAnalyticsEvent = (eventName: string, params?: Record<string, any>) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, params);
    } catch (error) {
      console.warn('Failed to log analytics event:', error);
    }
  }
};

/**
 * Set user ID for analytics
 */
export const setAnalyticsUserId = (userId: string) => {
  if (analytics) {
    try {
      setUserId(analytics, userId);
    } catch (error) {
      console.warn('Failed to set analytics user ID:', error);
    }
  }
};

/**
 * Set user properties for analytics
 */
export const setAnalyticsUserProperties = (properties: Record<string, any>) => {
  if (analytics) {
    try {
      setUserProperties(analytics, properties);
    } catch (error) {
      console.warn('Failed to set analytics user properties:', error);
    }
  }
};

/**
 * Log screen view event
 */
export const logScreenView = (screenName: string, screenClass?: string) => {
  logAnalyticsEvent('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
};

/**
 * Log tournament view event
 */
export const logTournamentView = (tournamentId: string, tournamentName: string) => {
  logAnalyticsEvent('tournament_view', {
    tournament_id: tournamentId,
    tournament_name: tournamentName,
  });
};

/**
 * Log game view event
 */
export const logGameView = (gameId: string, teamA: string, teamB: string) => {
  logAnalyticsEvent('game_view', {
    game_id: gameId,
    team_a: teamA,
    team_b: teamB,
  });
};

/**
 * Log follow action
 */
export const logFollowAction = (itemType: 'team' | 'game', itemId: string, action: 'follow' | 'unfollow') => {
  logAnalyticsEvent('follow_action', {
    item_type: itemType,
    item_id: itemId,
    action: action,
  });
};

/**
 * Log search event
 */
export const logSearch = (searchTerm: string, resultCount: number) => {
  logAnalyticsEvent('search', {
    search_term: searchTerm,
    result_count: resultCount,
  });
};

/**
 * Log error event
 */
export const logError = (error: Error, context?: string) => {
  logAnalyticsEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    context: context,
  });
  
  // Also log to console in development
  if (__DEV__) {
    console.error('Error logged:', error, context);
  }
};

/**
 * Log app performance metrics
 */
export const logPerformance = (metricName: string, value: number, unit?: string) => {
  logAnalyticsEvent('performance', {
    metric_name: metricName,
    value: value,
    unit: unit || 'ms',
  });
};

export default {
  logEvent: logAnalyticsEvent,
  setUserId: setAnalyticsUserId,
  setUserProperties: setAnalyticsUserProperties,
  logScreenView,
  logTournamentView,
  logGameView,
  logFollowAction,
  logSearch,
  logError,
  logPerformance,
};
