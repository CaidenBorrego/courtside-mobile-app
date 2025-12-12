// App constants and configuration

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    tint: '#000000',
    primary: '#000000',
    primaryLight: '#374151',
    secondary: '#6B7280',
    accent: '#000000',
    error: '#DC2626',
    warning: '#F59E0B',
    success: '#10B981',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#000000',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    imagePlaceholder: '#F3F4F6',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    background: '#000000',
    backgroundSecondary: '#111111',
    tint: '#FFFFFF',
    primary: '#FFFFFF',
    primaryLight: '#D1D5DB',
    secondary: '#9CA3AF',
    accent: '#FFFFFF',
    error: '#F87171',
    warning: '#FBBF24',
    success: '#34D399',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#FFFFFF',
    border: '#1F2937',
    borderLight: '#374151',
    card: '#111111',
    cardElevated: '#1F2937',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    imagePlaceholder: '#1F2937',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FontSizes = {
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 24,
};

export const API_ENDPOINTS = {
  // Firebase configuration will be added in Firebase setup task
};

export const NOTIFICATION_TYPES = {
  GAME_STARTING: 'game_starting',
  GAME_ENDED: 'game_ended',
  TEAM_UPDATE: 'team_update',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const GAME_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TOURNAMENT_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;