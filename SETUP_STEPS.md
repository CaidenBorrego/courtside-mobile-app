# 🏀 CourtSide App - Complete Setup Guide

## ✅ What's Already Done
- ✅ Expo CLI installed (`npx expo`)
- ✅ EAS CLI installed (`npx eas`) 
- ✅ Firebase CLI installed (`npx firebase`)
- ✅ Git repository initialized
- ✅ CI/CD workflows configured
- ✅ Project dependencies installed

## 🚀 Next Steps (Choose Your Path)

### Path A: Quick Development Start (Recommended)
Just want to start coding? Follow these steps:

```bash
# 1. Start the development server
npm start

# 2. Test on your device
# - Install "Expo Go" app on your phone
# - Scan the QR code that appears
```

That's it! You can start developing immediately.

---

### Path B: Full Production Setup
Want to deploy to app stores? Follow these additional steps:

#### 1. Create Expo Account
```bash
npx expo login
# Create account at expo.dev if you don't have one
```

#### 2. Configure EAS for App Store Builds
```bash
npx eas build:configure
# This creates eas.json (already done for you)
```

#### 3. Set up Firebase (Optional - for backend)
```bash
npx firebase login
npx firebase init
# Select: Firestore, Functions (optional)
```

#### 4. Create GitHub Repository
```bash
# Install GitHub CLI (optional)
brew install gh  # macOS
# or visit github.com and create manually

# Create repository
gh repo create your-username/courtside-mobile-app --public --push
```

#### 5. Configure Secrets for CI/CD
In your GitHub repository → Settings → Secrets and variables → Actions:
- `EXPO_TOKEN` - Get from expo.dev/accounts/[username]/settings/access-tokens
- `FIREBASE_TOKEN` - Get from `npx firebase login:ci`

---

## 🛠 Development Commands

### Daily Development
```bash
npm start           # Start development server
npm run ios         # Open iOS simulator  
npm run android     # Open Android emulator
npm test            # Run tests
npm run lint        # Check code quality
```

### Building & Deployment
```bash
npm run build:dev      # Build for testing
npm run build:preview  # Build for stakeholders
npm run build:prod     # Build for app stores
npm run submit:all     # Submit to both stores
```

## 📱 Testing Your App

### Option 1: Physical Device (Easiest)
1. Install "Expo Go" from App Store/Google Play
2. Run `npm start`
3. Scan QR code with Expo Go

### Option 2: iOS Simulator (Mac only)
1. Install Xcode from Mac App Store
2. Run `npm run ios`

### Option 3: Android Emulator
1. Install Android Studio
2. Create virtual device in AVD Manager
3. Run `npm run android`

## 🔧 Customization

### Update App Information
Edit `app.json`:
```json
{
  "expo": {
    "name": "Your Tournament App",
    "slug": "your-tournament-app",
    "version": "1.0.0"
  }
}
```

### Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project
3. Copy config to `.env` files

### Add Your Branding
- Replace icons in `assets/`
- Update colors in `src/constants/theme.ts`
- Customize components in `src/components/`

## 🆘 Troubleshooting

### "Command not found" errors
Use `npx` before commands:
```bash
npx expo start    # instead of expo start
npx eas build     # instead of eas build
```

### Metro bundler issues
```bash
npx expo start --clear
```

### Permission errors
```bash
sudo chown -R $(whoami) ~/.config
```

### Node modules issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📞 Getting Help

1. **Check existing issues**: Look at GitHub issues in this repo
2. **Expo Documentation**: https://docs.expo.dev
3. **Firebase Documentation**: https://firebase.google.com/docs
4. **Create new issue**: Include error logs and steps to reproduce

## 🎯 What's Next?

### For Development:
1. Explore the code in `src/` folder
2. Check out existing screens and components
3. Run tests to understand the codebase
4. Start building your tournament features

### For Production:
1. Complete Firebase setup
2. Configure app store accounts
3. Test on real devices
4. Set up monitoring and analytics

---

## 📋 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Start development |
| `npm test` | Run tests |
| `npm run lint` | Check code quality |
| `npx expo login` | Login to Expo |
| `npx eas build:configure` | Setup app builds |
| `npx firebase init` | Setup Firebase |

Happy coding! 🚀