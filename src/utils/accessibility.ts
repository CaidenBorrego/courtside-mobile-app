/**
 * Accessibility utilities and helpers
 * Provides functions for improving app accessibility
 */

import { AccessibilityRole, AccessibilityState } from 'react-native';

/**
 * Generate accessibility label for game card
 */
export const getGameAccessibilityLabel = (
  teamA: string,
  teamB: string,
  scoreA: number,
  scoreB: number,
  status: string,
  startTime?: string
): string => {
  if (status === 'completed') {
    return `Game completed. ${teamA} ${scoreA}, ${teamB} ${scoreB}. Final score.`;
  }
  
  if (status === 'in_progress') {
    return `Game in progress. ${teamA} ${scoreA}, ${teamB} ${scoreB}. Current score.`;
  }
  
  return `Scheduled game. ${teamA} versus ${teamB}${startTime ? `, starting at ${startTime}` : ''}.`;
};

/**
 * Generate accessibility label for tournament card
 */
export const getTournamentAccessibilityLabel = (
  name: string,
  city: string,
  state: string,
  startDate: string,
  endDate: string,
  status: string
): string => {
  const statusText = status === 'active' ? 'Currently active' : status === 'upcoming' ? 'Upcoming' : 'Completed';
  return `${statusText} tournament. ${name} in ${city}, ${state}. From ${startDate} to ${endDate}.`;
};

/**
 * Generate accessibility label for follow button
 */
export const getFollowButtonAccessibilityLabel = (
  isFollowing: boolean,
  itemType: 'team' | 'game',
  itemName?: string
): string => {
  const action = isFollowing ? 'Unfollow' : 'Follow';
  const item = itemName ? ` ${itemName}` : ` this ${itemType}`;
  return `${action}${item}`;
};

/**
 * Generate accessibility hint for interactive elements
 */
export const getAccessibilityHint = (action: string): string => {
  return `Double tap to ${action}`;
};

/**
 * Get accessibility role for button types
 */
export const getButtonAccessibilityRole = (): AccessibilityRole => {
  return 'button';
};

/**
 * Get accessibility state for toggleable elements
 */
export const getToggleAccessibilityState = (isSelected: boolean): AccessibilityState => {
  return {
    selected: isSelected,
  };
};

/**
 * Format date for screen readers
 */
export const formatDateForAccessibility = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format time for screen readers
 */
export const formatTimeForAccessibility = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Announce message to screen reader
 * Note: This is a placeholder - actual implementation would use
 * AccessibilityInfo.announceForAccessibility on native
 */
export const announceForAccessibility = (message: string): void => {
  // In a real implementation, use:
  // import { AccessibilityInfo } from 'react-native';
  // AccessibilityInfo.announceForAccessibility(message);
  console.log('Accessibility announcement:', message);
};

/**
 * Check if reduce motion is enabled
 * Returns true if user prefers reduced motion
 */
export const shouldReduceMotion = async (): Promise<boolean> => {
  // In a real implementation, use:
  // import { AccessibilityInfo } from 'react-native';
  // return await AccessibilityInfo.isReduceMotionEnabled();
  return false;
};

/**
 * Get minimum touch target size (44x44 points per iOS HIG)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Ensure element meets minimum touch target size
 */
export const getTouchTargetStyle = (size?: number) => ({
  minWidth: size || MIN_TOUCH_TARGET_SIZE,
  minHeight: size || MIN_TOUCH_TARGET_SIZE,
});

export default {
  getGameAccessibilityLabel,
  getTournamentAccessibilityLabel,
  getFollowButtonAccessibilityLabel,
  getAccessibilityHint,
  getButtonAccessibilityRole,
  getToggleAccessibilityState,
  formatDateForAccessibility,
  formatTimeForAccessibility,
  announceForAccessibility,
  shouldReduceMotion,
  MIN_TOUCH_TARGET_SIZE,
  getTouchTargetStyle,
};
