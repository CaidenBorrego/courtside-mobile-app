# CourtSide Mobile App - Deployment Guide

This guide covers the complete setup and deployment process for the CourtSide mobile application.

## Prerequisites

1. **Node.js 18+** installed
2. **Expo CLI** installed globally: `npm install -g @expo/cli`
3. **EAS CLI** installed globally: `npm install -g eas-cli`
4. **Firebase CLI** installed globally: `npm install -g firebase-tools`
5. **Expo Account** created at [expo.dev](https://expo.dev)
6. **GitHub Account** for repository hosting
7. **Apple Developer Account** (for iOS deployment)
8. **Google Play Console Account** (for Android deployment)

## Initial Setup

### 1. Create GitHub Repository

```bash
# Navigate to your project directory
cd courtside-mobile-app

# Add all files to git
git add .
git commit -m "Initial commit: CourtSide mobile app setup"

# Create repository on GitHub (replace with your username)
gh repo create your-username/courtside-mobile-app --public --push
```

### 2. Configure Expo Project

```bash
# Login to Expo
expo login

# Configure EAS
eas login
eas build:configure
```

### 3. Set up Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Select:
# - Firestore
# - Functions (if needed)
# - Hosting (optional)
```

## Environment Configuration

### 1. GitHub Secrets

Add these secrets in your GitHub repository settings:

```
EXPO_TOKEN=your_expo_access_token
FIREBASE_TOKEN=your_firebase_ci_token
APPLE_ID=your_apple_id
APPLE_APP_SPECIFIC_PASSWORD=your_app_specific_password
GOOGLE_SERVICE_ACCOUNT_KEY=your_google_service_account_json
```

### 2. Environment Variables

Create environment files:

```bash
# .env.development
EXPO_PUBLIC_FIREBASE_API_KEY_DEV=your_dev_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV=your_dev_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV=your_dev_project_id
# ... other dev config

# .env.production
EXPO_PUBLIC_FIREBASE_API_KEY_PROD=your_prod_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_PROD=your_prod_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID_PROD=your_prod_project_id
# ... other prod config
```

## Branching Strategy

### Branch Structure
- `main` - Production branch (auto-deploys to stores)
- `develop` - Development branch (builds preview versions)
- `feature/*` - Feature branches
- `hotfix/*` - Hotfix branches

### Workflow
1. Create feature branches from `develop`
2. Submit PRs to `develop` for testing
3. Merge `develop` to `main` for production releases

## Deployment Process

### Development Builds (Internal Testing)

```bash
# Build development version
eas build --profile development --platform all

# Or build for specific platform
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Preview Builds (Stakeholder Review)

```bash
# Triggered automatically on push to develop branch
# Or manually:
eas build --profile preview --platform all
```

### Production Deployment

#### Option 1: Automatic (Recommended)
1. Merge changes to `main` branch
2. Create a git tag: `git tag v1.0.0 && git push origin v1.0.0`
3. GitHub Actions will automatically:
   - Run tests
   - Build production apps
   - Submit to App Store and Google Play
   - Deploy Firebase rules/functions

#### Option 2: Manual
```bash
# Build production versions
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios --latest
eas submit --platform android --latest

# Deploy Firebase
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## Over-the-Air (OTA) Updates

For JavaScript-only changes (no native code changes):

```bash
# Publish update to development
expo publish --release-channel development

# Publish update to production
expo publish --release-channel production
```

## Monitoring and Rollback

### 1. Monitor Deployments
- Check Expo dashboard for build status
- Monitor Firebase console for backend issues
- Use Crashlytics for crash reporting

### 2. Rollback Process
```bash
# Rollback OTA update
expo publish:rollback --release-channel production

# For native builds, submit previous version to stores
eas submit --platform all --id previous_build_id
```

## Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Code review completed
- [ ] Version number updated in `app.json`
- [ ] Release notes prepared
- [ ] Firebase rules tested
- [ ] Environment variables configured

### Release
- [ ] Create release tag
- [ ] Monitor build process
- [ ] Test on physical devices
- [ ] Verify store submissions
- [ ] Update documentation

### Post-Release
- [ ] Monitor crash reports
- [ ] Check user feedback
- [ ] Monitor performance metrics
- [ ] Plan next iteration

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check EAS build logs
   - Verify credentials are valid
   - Ensure dependencies are compatible

2. **Store Rejection**
   - Review store guidelines
   - Check app metadata
   - Verify privacy policy and terms

3. **Firebase Issues**
   - Check security rules
   - Verify API keys
   - Monitor quota usage

### Getting Help
- Expo Documentation: https://docs.expo.dev
- Firebase Documentation: https://firebase.google.com/docs
- GitHub Issues: Create issues in the repository

## Performance Optimization

### Bundle Size
```bash
# Analyze bundle size
npx expo install @expo/webpack-config
expo build:web --analyze
```

### Monitoring
- Use Expo Analytics
- Implement Firebase Performance Monitoring
- Set up Sentry for error tracking

## Security Best Practices

1. **Environment Variables**
   - Never commit sensitive data
   - Use different configs for dev/prod
   - Rotate API keys regularly

2. **Code Security**
   - Run security audits: `npm audit`
   - Use dependabot for dependency updates
   - Implement proper authentication

3. **Firebase Security**
   - Review Firestore rules regularly
   - Monitor authentication logs
   - Use Firebase App Check

## Scaling Considerations

### Infrastructure
- Use Firebase hosting for web version
- Implement CDN for static assets
- Consider Firebase Functions for backend logic

### Performance
- Implement lazy loading
- Optimize images and assets
- Use React Native performance tools

### Monitoring
- Set up alerts for critical metrics
- Monitor user engagement
- Track conversion funnels