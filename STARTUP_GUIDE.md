# 🚀 CourtSide App - Quick Start Guide

## Prerequisites Checklist

Before running the app, ensure you have:

- ✅ Node.js installed (v18 or higher)
- ✅ npm or yarn installed
- ✅ Expo CLI installed globally: `npm install -g expo-cli`
- ✅ iOS Simulator (Mac only) or Android Emulator installed
- ✅ Firebase project created and configured

## Step 1: Install Dependencies

```bash
cd courtside-mobile-app
npm install
```

## Step 2: Verify Firebase Configuration

Check that your `.env` file has the correct Firebase credentials:

```bash
cat .env
```

You should see:
```
EXPO_PUBLIC_FIREBASE_API_KEY_DEV=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID_DEV=your_app_id
```

## Step 3: Deploy Firestore Rules (First Time Only)

```bash
npm run deploy:rules
```

This sets up the security rules for your Firestore database.

## Step 4: Run the App

### Option A: Start Development Server
```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

### Option B: Direct Launch
```bash
# iOS
npm run ios

# Android
npm run android
```

## Step 5: Test the App

### Create a Test Account
1. App opens to Login screen
2. Click "Sign Up" button
3. Enter:
   - Display Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
4. Click "Sign Up"

### Login
1. Enter your email and password
2. Click "Sign In"
3. You'll be taken to the Home screen

### Navigation
- Bottom tabs: Home and Profile
- Tap tabs to switch between screens
- Currently shows placeholder content (Task 6 will add real tournament data)

## Troubleshooting

### "Firebase not configured" error
- Check your `.env` file exists and has correct values
- Restart the development server: `npm start`

### "Module not found" errors
- Run `npm install` again
- Clear cache: `npx expo start -c`

### iOS Simulator not opening
- Make sure Xcode is installed
- Open Xcode and install additional components if prompted

### Android Emulator not opening
- Make sure Android Studio is installed
- Create an AVD (Android Virtual Device) in Android Studio

### Tests failing
```bash
npm test
```
Should show: **89 tests passing**

## What's Working Now

✅ **Authentication**
- Sign up with email/password
- Sign in with existing account
- Auth state persists across app restarts

✅ **Navigation**
- Smooth transitions between screens
- Bottom tab navigation
- Back button functionality
- Deep linking support (for future use)

✅ **Data Layer**
- Firebase Firestore connected
- Security rules deployed
- Ready for tournament data

## What's Coming Next (Task 6)

🚧 **Tournament Listing**
- Display list of tournaments from Firestore
- Pull-to-refresh functionality
- Real-time updates
- Tournament cards with details
- Navigation to tournament details

## Development Commands

```bash
# Start development server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build:prod
```

## Project Status

- **Tasks Completed**: 1-5 (Foundation complete)
- **Tests Passing**: 89/89 ✅
- **Next Task**: 6 (Tournament Listing)
- **Ready for**: Real feature development

## Need Help?

Check these files:
- `CURRENT_STATUS.md` - Detailed status of what's built
- `PROJECT_SETUP.md` - Initial setup documentation
- `TESTING_GUIDE.md` - Testing documentation
- `DEPLOYMENT.md` - Deployment instructions

---

**You're all set!** The foundation is solid and ready for building the tournament features. 🎉
