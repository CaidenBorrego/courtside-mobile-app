# Production Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Security audit clean (`npm run security-audit`)
- [ ] Code review completed
- [ ] No console.log statements in production code

### Configuration
- [ ] Version number updated in `app.json`
- [ ] Environment variables configured for production
- [ ] Firebase project configured for production
- [ ] API endpoints pointing to production
- [ ] Analytics tracking configured
- [ ] Crash reporting enabled

### Assets & Content
- [ ] App icons generated for all sizes
- [ ] Splash screens created
- [ ] App store screenshots prepared
- [ ] App description and metadata ready
- [ ] Privacy policy updated
- [ ] Terms of service updated

### Store Preparation
- [ ] Apple Developer account active
- [ ] Google Play Console account active
- [ ] App Store Connect app created
- [ ] Google Play Console app created
- [ ] Store certificates configured in EAS

## Deployment Process

### 1. Create Release Branch
```bash
git checkout main
git pull origin main
git checkout -b release/v1.0.0
```

### 2. Update Version
- [ ] Update version in `app.json`
- [ ] Update version in `package.json`
- [ ] Create changelog entry

### 3. Build Production Apps
```bash
# Build for both platforms
npm run build:prod

# Or build individually
eas build --profile production --platform ios
eas build --profile production --platform android
```

### 4. Test Production Builds
- [ ] Download and test iOS build on physical device
- [ ] Download and test Android build on physical device
- [ ] Verify all features work correctly
- [ ] Test on different device sizes
- [ ] Test offline functionality

### 5. Submit to Stores
```bash
# Submit to both stores
npm run submit:all

# Or submit individually
npm run submit:ios
npm run submit:android
```

### 6. Deploy Backend
```bash
# Deploy Firebase rules and functions
npm run deploy:firebase
```

### 7. Create Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Post-Deployment

### Monitoring
- [ ] Monitor build status in EAS dashboard
- [ ] Check store review status
- [ ] Monitor Firebase console for errors
- [ ] Check crash reporting dashboard
- [ ] Monitor user feedback

### Documentation
- [ ] Update README.md
- [ ] Update API documentation
- [ ] Create release notes
- [ ] Update user guides

### Communication
- [ ] Notify stakeholders of release
- [ ] Update project status
- [ ] Schedule post-release review

## Rollback Plan

### If Issues Found
1. **OTA Update** (for JS-only issues):
   ```bash
   expo publish:rollback --release-channel production
   ```

2. **Store Rollback** (for native issues):
   - Submit previous working version to stores
   - Use expedited review if available

3. **Backend Rollback**:
   ```bash
   firebase deploy --only firestore:rules --project previous-version
   ```

## Emergency Contacts
- [ ] Development team lead
- [ ] DevOps engineer
- [ ] Product manager
- [ ] Customer support team

## Success Criteria
- [ ] App successfully published to both stores
- [ ] No critical crashes reported
- [ ] Core functionality working as expected
- [ ] User onboarding flow complete
- [ ] Payment processing functional (if applicable)
- [ ] Push notifications working
- [ ] Analytics data flowing

## Common Issues & Solutions

### Build Failures
- Check EAS build logs
- Verify all dependencies are compatible
- Ensure certificates are valid

### Store Rejections
- Review store guidelines
- Check app metadata compliance
- Verify privacy policy links

### Performance Issues
- Monitor app startup time
- Check memory usage
- Verify network request efficiency

### User Reports
- Set up support channels
- Monitor app store reviews
- Track user feedback in analytics