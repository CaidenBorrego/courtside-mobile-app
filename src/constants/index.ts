// App constants and configuration

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#1976d2',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#1976d2',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#1976d2',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#1976d2',
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