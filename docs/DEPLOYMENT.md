# CourtSide Deployment Guide

This guide covers the deployment process for the CourtSide mobile application.

## Prerequisites

- Expo account with EAS access
- Apple Developer account (for iOS)
- Google Play Console account (for Android)
- Firebase project configured for production
- Environment variables configured

## Environment Configuration

### Development Environment

Development uses the `_DEV` suffixed environment variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY_DEV=your-dev-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV=your-dev-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV=your-dev-project-id
# ... other dev variables
```

### Production Environment

Production uses the `_PROD` suffixed environment variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY_PROD=your-prod-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_PROD=your-prod-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID_PROD=your-prod-project-id
# ... other prod variables
```

## Build Profiles

### Development Build

For internal testing with development client:

```bash
npm run build:dev
```

This creates a development build with:
- Development Firebase configuration
- Debug logging enabled
- Simulator/emulator support

### Preview Build

For internal testing with production-like environment:

```bash
npm run build:preview
```

This creates a preview build with:
- Staging Firebase configuration
- Internal distribution
- Ad-hoc iOS builds

### Production Build

For app store submission:

```bash
npm run build:prod
```

This creates a production build with:
- Production Firebase configuration
- Optimized bundle
- App store ready

## Deployment Steps

### 1. Pre-deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Security audit passed (`npm run security-audit`)
- [ ] Environment variables configured
- [ ] Firebase security rules deployed
- [ ] App version incremented in `app.json`

### 2. Build the App

```bash
# For iOS
eas build --platform ios --profile production

# For Android
eas build --platform android --profile production

# For both platforms
eas build --platform all --profile production
```

### 3. Test the Build

Download and test the build on physical devices before submission.

### 4. Submit to App Stores

#### iOS App Store

```bash
npm run submit:ios
```

Or manually:
```bash
eas submit --platform ios --latest
```

#### Google Play Store

```bash
npm run submit:android
```

Or manually:
```bash
eas submit --platform android --latest
```

### 5. Deploy Firebase Components

Deploy Firestore rules and Cloud Functions:

```bash
# Deploy everything
npm run deploy:firebase

# Deploy only rules
npm run deploy:rules

# Deploy only functions
npm run deploy:functions
```

## Over-the-Air (OTA) Updates

For minor updates that don't require app store review:

```bash
# Publish to production channel
eas update --branch production --message "Bug fixes and improvements"

# Publish to preview channel
eas update --branch preview --message "Testing new features"
```

## Monitoring and Analytics

### Firebase Console

Monitor app performance and errors:
- https://console.firebase.google.com

Key metrics to watch:
- Crash-free users
- App startup time
- Network request latency
- Active users

### EAS Dashboard

Monitor builds and updates:
- https://expo.dev

## Rollback Procedure

If issues are detected after deployment:

### For OTA Updates

```bash
# Rollback to previous update
eas update:rollback --branch production
```

### For App Store Builds

1. Remove the problematic version from the store
2. Submit a previous stable version
3. Communicate with users about the issue

## Environment-Specific Configurations

### Development

- Uses development Firebase project
- Debug logging enabled
- Hot reloading enabled
- Development client required

### Preview/Staging

- Uses staging Firebase project (or dev with production mode)
- Limited logging
- Internal distribution only
- Testing environment for QA

### Production

- Uses production Firebase project
- Minimal logging
- Error reporting enabled
- Analytics enabled
- Performance monitoring enabled

## Troubleshooting

### Build Failures

1. Check EAS build logs
2. Verify all credentials are valid
3. Ensure environment variables are set
4. Check for dependency conflicts

### Submission Failures

1. Verify app metadata in app stores
2. Check app signing certificates
3. Ensure compliance with store guidelines
4. Review rejection reasons carefully

### Runtime Issues

1. Check Firebase Console for errors
2. Review analytics for crash reports
3. Check network connectivity
4. Verify API endpoints are accessible

## Security Considerations

- Never commit `.env` files with real credentials
- Rotate API keys regularly
- Use Firebase App Check for production
- Enable security rules in Firestore
- Review permissions before each release
- Use HTTPS for all network requests

## Post-Deployment

1. Monitor crash reports for 24-48 hours
2. Check user reviews and feedback
3. Monitor analytics for unusual patterns
4. Prepare hotfix if critical issues found
5. Document any issues for future releases

## Support

For deployment issues:
- Check Expo documentation: https://docs.expo.dev
- Firebase documentation: https://firebase.google.com/docs
- Team Slack channel: #courtside-mobile
