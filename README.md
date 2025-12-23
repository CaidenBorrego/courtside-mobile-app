# CourtSide Mobile App

A React Native mobile application for managing basketball tournaments, built with Expo and Firebase.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios        # iOS simulator
npm run android    # Android emulator
```

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Firebase project with Authentication and Firestore enabled

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Firebase configuration:

```env
EXPO_PUBLIC_FIREBASE_API_KEY_DEV=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID_DEV=your_app_id
```

3. Deploy Firestore rules: `npm run deploy:rules`

## Development

### Available Scripts

```bash
npm start              # Start Expo development server
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript compiler
npm run deploy:rules   # Deploy Firestore security rules
npm run seed:test-data # Seed test tournament data
```

### Project Structure

```
src/
├── components/       # Reusable UI components
├── screens/          # Screen components
├── navigation/       # Navigation configuration
├── services/         # Firebase and API services
├── contexts/         # React contexts
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── constants/        # App constants
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test AuthService.test.ts
```

Current test coverage: 127 tests passing

## Features

### Implemented
- ✅ User authentication (email/password)
- ✅ User profile management
- ✅ Tournament listing with real-time updates
- ✅ Tournament details with divisions, schedule, and locations
- ✅ Search and filter functionality
- ✅ Pull-to-refresh
- ✅ Error handling and retry logic

### Coming Soon
- Game score tracking
- Team management
- Push notifications
- Offline support

## Firebase Setup

### Firestore Collections

- `users` - User profiles
- `tournaments` - Tournament data
- `games` - Game schedules and scores
- `divisions` - Tournament divisions
- `locations` - Venue information

### Security Rules

Security rules are defined in `firestore.rules`. Deploy with:

```bash
npm run deploy:rules
```

## Deployment

### EAS Build (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
npm run build:preview

# Build for production
npm run build:prod
```

See `EAS_SETUP_CHECKLIST.md` for detailed setup instructions.

## CI/CD

GitHub Actions workflows are configured for:
- **CI**: Runs tests, linting, and type checking on every push
- **Build Preview**: Manual trigger for preview builds
- **Production Deploy**: Automated production builds

## Troubleshooting

### Common Issues

**"Firebase not configured"**
- Check `.env` file exists with correct values
- Restart development server

**"Module not found"**
- Run `npm install`
- Clear cache: `npx expo start -c`

**Tests failing**
- Ensure all dependencies are installed
- Check Firebase emulator is not running (conflicts with mocks)

### Getting Help

- Check existing documentation in `docs/` folder
- Review Firebase console for backend issues
- Check GitHub Issues for known problems

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Submit a pull request

## License

Private - All rights reserved

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Backend**: Firebase (Auth, Firestore)
- **Navigation**: React Navigation
- **UI**: React Native Paper
- **Testing**: Jest, React Native Testing Library
- **CI/CD**: GitHub Actions, EAS Build
