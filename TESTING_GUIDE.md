# CourtSide Authentication Testing Guide

## Prerequisites

1. **Firebase Project Setup**
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Authentication → Email/Password sign-in method
   - Enable Firestore Database
   - Copy your Firebase config

2. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Replace placeholder values with your actual Firebase config

## Testing Methods

### 1. Manual Testing with Expo

```bash
# Start the development server
npm start

# Or for specific platforms
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

**Test Routes:**
- `/demo` - Authentication demo screen
- `/auth-test` - View current auth status
- Main app will show auth screens when not logged in

### 2. Unit Tests

```bash
# Run all tests
npm test

# Run specific test files
npm test validation.test.ts
npm test AuthService.test.ts

# Run with coverage
npm run test:coverage
```

### 3. Firebase Emulator (Recommended for Development)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Start emulators
firebase emulators:start --only auth,firestore
```

Then update your Firebase config to use emulators:

```typescript
// In src/services/firebase/config.ts
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Test Scenarios

### Authentication Flow Testing

1. **Registration**
   - Navigate to register screen
   - Test form validation (empty fields, invalid email, weak password)
   - Test successful registration
   - Verify user profile creation in Firestore

2. **Login**
   - Test with invalid credentials
   - Test with valid credentials
   - Verify auth state persistence

3. **Logout**
   - Test sign out functionality
   - Verify auth state clearing

4. **Error Handling**
   - Test network errors
   - Test Firebase auth errors
   - Verify user-friendly error messages

### Form Validation Testing

Test the validation functions:
- Email format validation
- Password strength requirements
- Display name requirements
- Real-time error clearing

### State Management Testing

- Auth state persistence across app restarts
- Loading states during auth operations
- Error state handling and clearing

## Debugging Tips

1. **Check Firebase Console**
   - Authentication → Users (see registered users)
   - Firestore → Data (see user profiles)

2. **Enable Debug Logging**
   ```typescript
   // Add to Firebase config
   import { getAuth, connectAuthEmulator } from 'firebase/auth';
   
   if (__DEV__) {
     // Enable debug logging
     console.log('Firebase Auth initialized');
   }
   ```

3. **Network Tab**
   - Check browser dev tools for Firebase API calls
   - Verify auth tokens in requests

## Common Issues

1. **Firebase Config Errors**
   - Verify all environment variables are set
   - Check Firebase project settings match config

2. **CORS Issues (Web)**
   - Add your domain to Firebase authorized domains
   - Check Firebase console → Authentication → Settings

3. **Emulator Connection**
   - Ensure emulators are running before starting app
   - Check emulator ports match config

## Production Testing

Before deploying:

1. Test with production Firebase project
2. Verify security rules work correctly
3. Test on real devices (iOS/Android)
4. Performance testing with larger user base
5. Test offline scenarios