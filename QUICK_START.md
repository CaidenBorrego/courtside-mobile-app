# CourtSide Mobile App - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm start
# or
npx expo start
```

### Step 3: Test on Device/Simulator
- **iOS Simulator**: Press `i` in terminal
- **Android Emulator**: Press `a` in terminal  
- **Physical Device**: Scan QR code with Expo Go app

## 📱 Development Workflow

### Running the App
```bash
# Start development server
npm start

# Start with specific platform
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Type check
npm run type-check

# Security audit
npm run security-audit
```

## 🔧 Setup for Production Deployment

### 1. Create Expo Account
```bash
npx expo login
```

### 2. Configure EAS (Expo Application Services)
```bash
npx eas build:configure
```

### 3. Set up Firebase
```bash
npx firebase login
npx firebase init
# Select: Firestore, Functions (optional)
```

### 4. Build for Testing
```bash
# Development build (for testing)
npm run build:dev

# Preview build (for stakeholders)
npm run build:preview
```

### 5. Deploy to Production
```bash
# Build production apps
npm run build:prod

# Submit to app stores
npm run submit:all
```

## 🌐 Environment Setup

### Create Environment Files
```bash
# Development environment
cp .env.example .env.development

# Production environment  
cp .env.example .env.production
```

### Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project or select existing
3. Get configuration from Project Settings
4. Update environment files with your config

## 📋 Project Structure
```
courtside-mobile-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── services/       # API and Firebase services
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── app/                # Expo Router pages
├── .github/            # GitHub Actions workflows
└── docs/               # Documentation
```

## 🔥 Firebase Features Used
- **Authentication**: User login/registration
- **Firestore**: Real-time database
- **Cloud Functions**: Backend logic (optional)
- **Hosting**: Web deployment (optional)

## 📱 Supported Platforms
- **iOS**: iPhone and iPad
- **Android**: Phones and tablets
- **Web**: Progressive Web App

## 🛠 Development Tools
- **Expo**: React Native development platform
- **TypeScript**: Type-safe JavaScript
- **Jest**: Testing framework
- **ESLint**: Code linting
- **GitHub Actions**: CI/CD pipeline

## 🆘 Troubleshooting

### Common Issues

#### Metro bundler issues
```bash
# Clear cache and restart
npx expo start --clear
```

#### Node modules issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### iOS simulator not opening
```bash
# Make sure Xcode is installed
xcode-select --install
```

#### Android emulator not starting
- Open Android Studio
- Go to AVD Manager
- Create/start virtual device

### Getting Help
- **Expo Docs**: https://docs.expo.dev
- **React Native Docs**: https://reactnative.dev
- **Firebase Docs**: https://firebase.google.com/docs
- **GitHub Issues**: Create issue in this repository

## 🎯 Next Steps
1. **Customize the app** for your tournament needs
2. **Add your branding** (colors, logos, etc.)
3. **Configure Firebase** with your data
4. **Test on real devices** before deployment
5. **Set up CI/CD** for automated deployments

## 📞 Support
- Check existing GitHub issues
- Create new issue with detailed description
- Include error logs and steps to reproduce

Happy coding! 🏀