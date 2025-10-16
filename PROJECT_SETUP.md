# CourtSide Mobile App - Project Setup

## Overview
This is a React Native Expo project built with TypeScript for the CourtSide basketball tournament tracking application.

## Technology Stack
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: React Navigation v7
- **Backend**: Firebase (Firestore, Auth, Cloud Functions, FCM)
- **Notifications**: Expo Notifications + Firebase Cloud Messaging
- **State Management**: React Context + useReducer

## Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Card, etc.)
│   ├── tournament/      # Tournament-specific components
│   └── game/           # Game-specific components
├── screens/            # Screen components
│   ├── auth/          # Authentication screens
│   ├── tournament/    # Tournament-related screens
│   ├── game/         # Game detail screens
│   └── profile/      # User profile screens
├── navigation/        # Navigation configuration
├── services/         # Business logic and API calls
│   ├── firebase/    # Firebase service layer
│   ├── auth/       # Authentication service
│   └── notifications/ # Notification service
├── types/           # TypeScript type definitions
├── utils/          # Utility functions
├── hooks/         # Custom React hooks
└── constants/     # App constants and configuration
```

## Dependencies Installed
### Core Dependencies
- `react-native-paper` - Material Design components
- `firebase` - Firebase SDK
- `@react-native-async-storage/async-storage` - Local storage
- `expo-notifications` - Push notifications
- `expo-device` - Device information
- `expo-location` - Location services

### Navigation (Pre-installed)
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- `react-native-screens`
- `react-native-safe-area-context`

## Configuration
- **TypeScript**: Configured with strict mode and path mapping for src directory
- **ESLint**: Using Expo's ESLint configuration
- **Theme**: React Native Paper theme with custom colors
- **Path Mapping**: Configured for easy imports using `@/` prefix

## Getting Started
1. Install dependencies: `npm install`
2. Start development server: `npm start`
3. Run on iOS: `npm run ios`
4. Run on Android: `npm run android`
5. Run on web: `npm run web`

## Next Steps
The project is ready for implementing the remaining tasks:
1. Firebase configuration and authentication
2. Data models and Firestore integration
3. Navigation structure
4. UI screens and components
5. Push notifications
6. Admin features

## Notes
- The project uses Expo Router for file-based routing
- React Native Paper provides Material Design components
- Firebase will be configured in the next task
- All TypeScript types are defined in `src/types/index.ts`