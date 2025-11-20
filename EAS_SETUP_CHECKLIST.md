# EAS Build Setup Checklist

## Overview
This checklist will help you set up EAS (Expo Application Services) credentials so that automated builds can run in CI/CD.

## Prerequisites
- [ ] Expo account created (sign up at https://expo.dev)
- [ ] Apple Developer account (for iOS builds) - $99/year
- [ ] Google Play Console account (for Android builds) - $25 one-time fee

## Setup Steps

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```
Enter your Expo account credentials.

### 3. Configure iOS Credentials (Interactive)
```bash
eas build --platform ios --profile preview
```

**What happens:**
- EAS will prompt you to log in to your Apple Developer account
- It will create/configure signing certificates
- It will create/configure provisioning profiles
- Credentials are stored securely on Expo's servers

**Expected prompts:**
- "Would you like to log in to your Apple account?" → Yes
- "Generate a new Apple Distribution Certificate?" → Yes (if you don't have one)
- "Generate a new Apple Provisioning Profile?" → Yes

**Time:** ~5-10 minutes

### 4. Configure Android Credentials (Interactive)
```bash
eas build --platform android --profile preview
```

**What happens:**
- EAS will generate a keystore for signing your Android app
- Keystore is stored securely on Expo's servers

**Expected prompts:**
- "Generate a new Android Keystore?" → Yes

**Time:** ~2-3 minutes

### 5. Verify Credentials
```bash
eas credentials
```

You should see:
- iOS: Distribution Certificate and Provisioning Profile
- Android: Keystore

### 6. Enable Automatic Builds

Once credentials are set up, edit `.github/workflows/build-preview.yml`:

**Current (Manual):**
```yaml
on:
  workflow_dispatch:  # Manual trigger
```

**Change to (Automatic):**
```yaml
on:
  push:
    branches: [main]  # Auto-build when merging to main
  pull_request:
    branches: [main]  # Auto-build for PRs to main
  workflow_dispatch:  # Keep manual trigger as backup
```

### 7. Test the Workflow

**Option A: Manual Test**
1. Go to GitHub Actions tab
2. Select "Build Preview" workflow
3. Click "Run workflow"
4. Verify builds complete successfully

**Option B: Automatic Test**
1. Create a PR to main
2. Verify build starts automatically
3. Check build status in GitHub Actions

## Troubleshooting

### "No credentials found"
- Run `eas credentials` to check what's configured
- Re-run the build commands interactively
- Ensure you're logged in: `eas whoami`

### "Apple Developer account not found"
- Verify your Apple Developer membership is active
- Log in at https://developer.apple.com
- Ensure your account has the necessary permissions

### "Build failed: Invalid credentials"
- Credentials may have expired
- Run `eas credentials` and regenerate
- For iOS: Check Apple Developer portal for expired certificates

### "GitHub Actions still failing"
- Verify EXPO_TOKEN secret is set in GitHub repository settings
- Check that the EAS project ID in app.json matches your project
- Review build logs for specific error messages

## Cost Considerations

### Free Tier (Expo)
- Limited build minutes per month
- Slower build machines
- Good for testing and small projects

### Paid Tier (Expo)
- More build minutes
- Faster build machines (m-medium, large)
- Priority queue

**Current configuration uses `m-medium` resource class** (requires paid plan or will use free tier equivalent)

## Security Notes

- ✅ Credentials are stored securely on Expo's servers
- ✅ Never commit credentials to git
- ✅ GitHub Actions uses EXPO_TOKEN secret (not credentials directly)
- ✅ Credentials are encrypted in transit and at rest

## Next Steps After Setup

Once builds are working:

1. **Configure build profiles** in `eas.json`:
   - `preview` - Internal testing
   - `production` - App store releases

2. **Set up automatic submissions** to app stores:
   ```bash
   eas submit --platform ios --latest
   eas submit --platform android --latest
   ```

3. **Configure OTA updates** for faster deployments:
   ```bash
   eas update --branch production
   ```

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Credentials](https://docs.expo.dev/app-signing/app-credentials/)
- [GitHub Actions with EAS](https://docs.expo.dev/build/building-on-ci/)
- [Expo Pricing](https://expo.dev/pricing)

## Checklist Summary

- [ ] EAS CLI installed
- [ ] Logged in to Expo account
- [ ] iOS credentials configured (if building for iOS)
- [ ] Android credentials configured (if building for Android)
- [ ] Credentials verified with `eas credentials`
- [ ] Test build completed successfully
- [ ] `.github/workflows/build-preview.yml` updated to enable automatic builds
- [ ] GitHub Actions workflow tested and passing

---

**Status:** ⏳ Pending Setup

Once complete, update this to: **Status:** ✅ Configured
